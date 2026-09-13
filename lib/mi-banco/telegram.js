// lib/mi-banco/telegram.js
// Bot de Telegram propio para "Mi Banco" (token separado del bot de
// control de flota, asi cada app tiene su propio webhook).
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.MB_TELEGRAM_BOT_TOKEN}`;

export async function enviarMensaje(chatId, texto) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "Markdown" }),
  });
}

export async function enviarBotones(chatId, texto, filasBotones) {
  const inline_keyboard = Array.isArray(filasBotones[0])
    ? filasBotones.map((fila) => fila.map((b) => ({ text: b.texto, callback_data: b.callback_data })))
    : filasBotones.map((b) => [{ text: b.texto, callback_data: b.callback_data }]);

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard },
    }),
  });
}

export async function responderCallback(callbackQueryId, texto) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: texto ?? "" }),
  });
}

// Descarga la foto de mayor resolucion de un mensaje y la devuelve en base64.
export async function descargarFotoBase64(fileId) {
  const resFile = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const dataFile = await resFile.json();
  const filePath = dataFile.result.file_path;

  const urlArchivo = `https://api.telegram.org/file/bot${process.env.MB_TELEGRAM_BOT_TOKEN}/${filePath}`;
  const resArchivo = await fetch(urlArchivo);
  const buffer = await resArchivo.arrayBuffer();

  return Buffer.from(buffer).toString("base64");
}
