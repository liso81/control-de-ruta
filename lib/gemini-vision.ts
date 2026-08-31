// lib/gemini-vision.ts

type GastoExtraido = {
  monto: number;
  descripcion: string;
  proveedor: string | null;
};

const PROMPT = `Esta imagen es una foto de un ticket, factura o comprobante de gasto de un camión de reparto de agua en Angola.
Extraé estos datos y respondé SOLO con un objeto JSON, sin texto adicional, sin markdown, sin backticks:
{
  "monto": <número, el monto total en Kwanzas (AOA), solo el número sin símbolos>,
  "descripcion": "<breve descripción de qué es el gasto, ej: 'Combustible', 'Repuesto', 'Peaje'>",
  "proveedor": "<nombre del comercio/proveedor si es legible, o null si no se ve>"
}
Si la imagen no es un comprobante legible, respondé: {"error": "no_legible"}`;

export async function extraerGastoDeImagen(imagenBase64: string): Promise<GastoExtraido | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
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

  if (!res.ok) {
    console.error("Error Gemini:", await res.text());
    return null;
  }

  const data = await res.json();
  const textoRespuesta: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textoRespuesta) return null;

  try {
    const limpio = textoRespuesta.replace(/```json|```/g, "").trim();
    const parseado = JSON.parse(limpio);
    if (parseado.error) return null;
    if (typeof parseado.monto !== "number") return null;

    return {
      monto: parseado.monto,
      descripcion: parseado.descripcion ?? "Gasto sin descripción",
      proveedor: parseado.proveedor ?? null,
    };
  } catch {
    return null;
  }
}
