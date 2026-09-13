// Configura el webhook del bot de Telegram de "Mi Banco" contra tu app en Vercel.
// Uso: node scripts/mi-banco-set-webhook.mjs
import { config } from "dotenv";

config({ path: ".env.local" });

const token = process.env.MB_TELEGRAM_BOT_TOKEN;
const secret = process.env.MB_TELEGRAM_WEBHOOK_SECRET;
const baseUrl = process.env.APP_BASE_URL;

if (!token || !secret || !baseUrl) {
  console.log(
    "Faltan variables en .env.local: MB_TELEGRAM_BOT_TOKEN, MB_TELEGRAM_WEBHOOK_SECRET y APP_BASE_URL (ej: https://tu-app.vercel.app)"
  );
  process.exit(1);
}

const url = `${baseUrl.replace(/\/$/, "")}/api/mi-banco/telegram/webhook`;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url, secret_token: secret }),
});

const data = await res.json();
console.log(data);
