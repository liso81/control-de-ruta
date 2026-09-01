// lib/gemini-vision.ts

export type CategoriaGasto = "insumo" | "servicio_tercero" | "otro";

export type GastoExtraido = {
  categoria: CategoriaGasto;
  monto: number;
  descripcion: string;
  proveedor: string | null;
  producto_nombre: string | null;
  cantidad: number | null;
  unidad: string | null;
  tipo_mantenimiento: string | null;
};

const TIPOS_MANTENIMIENTO_VALIDOS = [
  "Cambio de aceite",
  "Frenos",
  "Neumáticos",
  "Batería",
  "Filtros",
  "Revisión general",
  "Correctivo / reparación",
  "Otro",
];

const PROMPT = `Esta imagen es una foto de un ticket, factura o comprobante de gasto de un camión de reparto de agua en Angola.

El comprobante puede estar escrito en portugués, español, o CHINO (muchos proveedores de piezas y accesorios son comercios chinos). Si el texto está en chino, leelo igual y traducí SIEMPRE al español los campos "descripcion" y "producto_nombre". El campo "proveedor" podés dejarlo como aparece en el comprobante (nombre del comercio), transliterado si hace falta para que sea legible.

Clasificá el gasto en UNA de estas 3 categorías:
- "insumo": compra de un repuesto o consumible para el camión (aceite de motor, filtros, neumáticos, batería, refrigerante, repuestos en general).
- "servicio_tercero": pago por mano de obra o reparación hecha por un taller/mecánico externo (ej: cambio de frenos en un taller, reparación eléctrica, revisión general hecha por terceros).
- "otro": cualquier otro gasto que no sea repuesto ni servicio de taller (ej: comida, peajes, propinas, multas, combustible del chofer, etc).

Extraé estos datos y respondé SOLO con un objeto JSON, sin texto adicional, sin markdown, sin backticks:
{
  "categoria": "insumo" | "servicio_tercero" | "otro",
  "monto": <número, el monto total en Kwanzas (AOA), solo el número sin símbolos>,
  "descripcion": "<breve descripción en ESPAÑOL de qué es el gasto, ej: 'Aceite de motor', 'Cambio de frenos', 'Almuerzo', aunque el original esté en chino o portugués>",
  "proveedor": "<nombre del comercio/proveedor si es legible, o null si no se ve>",
  "producto_nombre": "<SOLO si categoria es 'insumo': nombre genérico del producto EN ESPAÑOL, ej: 'Aceite de motor 20W50', 'Filtro de aceite'. Si no aplica, null>",
  "cantidad": <SOLO si categoria es 'insumo': número de unidades/litros comprados si es legible, o null>,
  "unidad": "<SOLO si categoria es 'insumo': unidad de medida, ej: 'L', 'unidad', 'kg'. Si no aplica, null>",
  "tipo_mantenimiento": "<SOLO si categoria es 'servicio_tercero': elegí UNO de esta lista exacta: ${TIPOS_MANTENIMIENTO_VALIDOS.join(", ")}. Si no aplica, null>"
}
Si la imagen no es un comprobante legible, respondé: {"error": "no_legible"}`;

const MAX_INTENTOS = 3;
const ESPERA_BASE_MS = 2000; // 2s, 4s, 8s entre reintentos

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function llamarGemini(imagenBase64: string): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: "image/jpeg", data: imagenBase64 } },
          ],
        },
      ],
    }),
  });
}

export async function extraerGastoDeImagen(imagenBase64: string): Promise<GastoExtraido | null> {
  let ultimoError: string | null = null;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const res = await llamarGemini(imagenBase64);

    if (res.ok) {
      const data = await res.json();
      const textoRespuesta: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textoRespuesta) return null;

      try {
        const limpio = textoRespuesta.replace(/```json|```/g, "").trim();
        const parseado = JSON.parse(limpio);
        if (parseado.error) return null;
        if (typeof parseado.monto !== "number") return null;

        const categoria: CategoriaGasto =
          parseado.categoria === "insumo" || parseado.categoria === "servicio_tercero"
            ? parseado.categoria
            : "otro";

        const tipoMantenimiento =
          categoria === "servicio_tercero"
            ? TIPOS_MANTENIMIENTO_VALIDOS.includes(parseado.tipo_mantenimiento)
              ? parseado.tipo_mantenimiento
              : "Correctivo / reparación"
            : null;

        return {
          categoria,
          monto: parseado.monto,
          descripcion: parseado.descripcion ?? "Gasto sin descripción",
          proveedor: parseado.proveedor ?? null,
          producto_nombre: categoria === "insumo" ? parseado.producto_nombre ?? null : null,
          cantidad: categoria === "insumo" && typeof parseado.cantidad === "number" ? parseado.cantidad : null,
          unidad: categoria === "insumo" ? parseado.unidad ?? null : null,
          tipo_mantenimiento: tipoMantenimiento,
        };
      } catch {
        return null;
      }
    }

    ultimoError = await res.text();
    const esReintentable = res.status === 503 || res.status === 429;

    console.error(`Error Gemini (intento ${intento}/${MAX_INTENTOS}, status ${res.status}):`, ultimoError);

    if (!esReintentable || intento === MAX_INTENTOS) {
      break;
    }

    await esperar(ESPERA_BASE_MS * intento);
  }

  console.error("Gemini falló después de todos los reintentos:", ultimoError);
  return null;
}
