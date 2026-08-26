import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PROMPT = `Sos un asistente que analiza fotos de documentos para un negocio de reparto de agua en camiones cisterna (Angola). Te llega la foto de UN documento. Identificá qué tipo de documento es y extraé los datos.

Tipos posibles:
- "factura_insumo": factura o recibo de compra de un producto/material (aceite, filtros, repuestos, etc.)
- "servicio_tercero": factura o recibo de un servicio de taller/mecánico (mano de obra, reparación)
- "documento_vehiculo": un documento del vehículo con fecha de vencimiento (seguro, inspección técnica/revisão periódica, carta de alquiler/aluguer)
- "otro_gasto": cualquier otro gasto del negocio (combustible aparte, papelería, etc.)
- "no_reconocido": si la imagen no es un documento reconocible o está ilegible

Respondé SOLO con un JSON válido, sin texto adicional, sin markdown, con esta forma exacta:
{
  "tipo_documento": "factura_insumo" | "servicio_tercero" | "documento_vehiculo" | "otro_gasto" | "no_reconocido",
  "proveedor": string o null,
  "monto": number o null,
  "fecha": string "YYYY-MM-DD" o null,
  "descripcion": string o null,
  "producto_nombre": string o null,
  "cantidad": number o null,
  "tipo_documento_vehiculo": "seguro" | "inspeccion_tecnica" | "carta_alquiler" o null,
  "fecha_emision": string "YYYY-MM-DD" o null,
  "fecha_caducidad": string "YYYY-MM-DD" o null,
  "matricula": string o null,
  "confianza": "alta" | "media" | "baja",
  "notas_ia": string o null
}

Reglas:
- "producto_nombre" y "cantidad" solo si es factura_insumo.
- "tipo_documento_vehiculo", "fecha_emision", "fecha_caducidad", "matricula" solo si es documento_vehiculo.
- Si una fecha está en formato dd/mm/aaaa conviertila a YYYY-MM-DD.
- Si no estás seguro de un dato, poné null en vez de inventar.
- "confianza" refleja qué tan seguro estás de la lectura general.`;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { imagen_base64, mime_type } = body;

  if (!imagen_base64) {
    return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta configurar GEMINI_API_KEY" }, { status: 500 });
  }

  try {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mime_type || "image/jpeg", data: imagen_base64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    const json = await respuesta.json();

    if (!respuesta.ok) {
      return NextResponse.json({ error: json.error?.message || "Error al procesar con la IA" }, { status: 500 });
    }

    const textoRespuesta: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const textoLimpio = textoRespuesta.replace(/```json|```/g, "").trim();

    let datos;
    try {
      datos = JSON.parse(textoLimpio);
    } catch {
      return NextResponse.json({ error: "La IA no devolvió un formato reconocible. Probá con otra foto." }, { status: 500 });
    }

    return NextResponse.json({ datos });
  } catch (err) {
    return NextResponse.json({ error: "No se pudo conectar con la IA. Probá de nuevo." }, { status: 500 });
  }
}
