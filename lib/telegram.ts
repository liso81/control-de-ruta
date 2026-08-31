// lib/telegram.ts

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function enviarMensaje(chatId: number, texto: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "Markdown" }),
  });
}

export async function enviarBotones(
  chatId: number,
  texto: string,
  botones: { texto: string; callback_data: string }[]
) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      reply_markup: {
        inline_keyboard: botones.map((b) => [{ text: b.texto, callback_data: b.callback_data }]),
      },
    }),
  });
}

export async function responderCallback(callbackQueryId: string, texto?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: texto ?? "" }),
  });
}

// Descarga la foto de mayor resolución de un mensaje y la devuelve en base64.
export async function descargarFotoBase64(fileId: string): Promise<string> {
  const resFile = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const dataFile = await resFile.json();
  const filePath = dataFile.result.file_path;

  const urlArchivo = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const resArchivo = await fetch(urlArchivo);
  const buffer = await resArchivo.arrayBuffer();

  return Buffer.from(buffer).toString("base64");
}
