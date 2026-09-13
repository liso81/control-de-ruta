// lib/mi-banco/gemini-vision.js
// OCR/IA de facturas y tickets de gastos personales usando Gemini Vision.
const PROMPT = `Esta imagen es una foto de un ticket, factura o comprobante de un gasto personal.

Extrae estos datos y responde SOLO con un objeto JSON, sin texto adicional, sin markdown, sin backticks:
{
  "monto": <numero, el monto total pagado, solo el numero sin simbolos ni separadores de miles>,
  "comercio": "<nombre del comercio o negocio si es legible, o null si no se ve>",
  "descripcion": "<breve descripcion en espanol de la compra, ej: 'Supermercado', 'Nafta', 'Farmacia'>",
  "fecha": "<fecha del comprobante en formato YYYY-MM-DD si es legible, o null>"
}
Si la imagen no es un comprobante legible, responde: {"error": "no_legible"}`;

const MAX_INTENTOS = 3;
const ESPERA_BASE_MS = 2000;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function llamarGemini(imagenBase64) {
  const apiKey = process.env.MB_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

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

// Devuelve { monto, comercio, descripcion, fecha } o null si no se pudo leer.
export async function extraerFacturaDeImagen(imagenBase64) {
  let ultimoError = null;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const res = await llamarGemini(imagenBase64);

    if (res.ok) {
      const data = await res.json();
      const textoRespuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textoRespuesta) return null;

      try {
        const limpio = textoRespuesta.replace(/```json|```/g, "").trim();
        const parseado = JSON.parse(limpio);
        if (parseado.error) return null;
        if (typeof parseado.monto !== "number") return null;

        return {
          monto: parseado.monto,
          comercio: parseado.comercio ?? null,
          descripcion: parseado.descripcion ?? "Gasto sin descripcion",
          fecha: parseado.fecha ?? null,
        };
      } catch {
        return null;
      }
    }

    ultimoError = await res.text();
    const esReintentable = res.status === 503 || res.status === 429;
    console.error(`Error Gemini mi-banco (intento ${intento}/${MAX_INTENTOS}, status ${res.status}):`, ultimoError);

    if (!esReintentable || intento === MAX_INTENTOS) break;
    await esperar(ESPERA_BASE_MS * intento);
  }

  console.error("Gemini (mi-banco) fallo despues de todos los reintentos:", ultimoError);
  return null;
}
