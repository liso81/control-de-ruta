// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarMensaje, enviarBotones, responderCallback, descargarFotoBase64 } from "@/lib/telegram";
import { extraerGastoDeImagen } from "@/lib/gemini-vision";

export const dynamic = "force-dynamic";

const APP_BASE_URL = process.env.APP_BASE_URL || "https://veracsistem.org";

async function obtenerCamionVinculado(chatId: number) {
  const { data } = await supabaseAdmin
    .from("telegram_vinculos")
    .select("camion_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data?.camion_id ?? null;
}

async function pedirVinculacion(chatId: number) {
  const { data: camiones } = await supabaseAdmin
    .from("camiones")
    .select("id, nombre, matricula")
    .order("nombre");

  if (!camiones || camiones.length === 0) {
    await enviarMensaje(chatId, "No hay camiones cargados en el sistema todavía.");
    return;
  }

  await enviarBotones(
    chatId,
    "¿A qué camión pertenece este chat? Elegí una vez y lo recuerdo para siempre.",
    camiones.map((c) => ({
      texto: `${c.nombre} · ${c.matricula}`,
      callback_data: `vincular:${c.id}`,
    }))
  );
}

async function registrarGasto(chatId: number, camionId: string, fotoFileId: string) {
  await enviarMensaje(chatId, "📸 Recibido, analizando el comprobante...");
  const imagenBase64 = await descargarFotoBase64(fotoFileId);
  const gasto = await extraerGastoDeImagen(imagenBase64);

  if (!gasto) {
    await enviarMensaje(
      chatId,
      "No pude leer bien la imagen. Mandala de nuevo con mejor luz/enfoque, o cargalo manual en la app."
    );
    return;
  }

  const res = await fetch(`${APP_BASE_URL}/api/admin/finanzas/movimientos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-automation-key": process.env.AUTOMATION_API_KEY as string,
    },
    body: JSON.stringify({
      tipo: "gasto_otro",
      camion_id: camionId,
      monto: gasto.monto,
      proveedor: gasto.proveedor,
      descripcion: gasto.descripcion,
    }),
  });

  if (!res.ok) {
    await enviarMensaje(chatId, "⚠️ Se leyó la imagen pero hubo un error guardándolo. Avisale a Lisandro.");
    return;
  }

  await enviarMensaje(
    chatId,
    `✅ Gasto registrado:\n*${gasto.monto.toLocaleString("es")} Kz* — ${gasto.descripcion}${
      gasto.proveedor ? `\n${gasto.proveedor}` : ""
    }`
  );
}

// Toda la lógica pesada vive acá adentro. Se ejecuta DESPUÉS de responder a Telegram.
async function procesarUpdate(update: any) {
  try {
    // Botón tocado: el chofer eligió su camión
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data: string = update.callback_query.data;

      if (data.startsWith("vincular:")) {
        const camionId = data.replace("vincular:", "");
        await supabaseAdmin
          .from("telegram_vinculos")
          .upsert({ chat_id: chatId, camion_id: camionId });

        await responderCallback(update.callback_query.id, "Listo");
        await enviarMensaje(chatId, "✅ Camión vinculado. Ahora mandame fotos de tickets/facturas y las registro solo.");
      }
      return;
    }

    const mensaje = update.message;
    if (!mensaje) return;

    const chatId = mensaje.chat.id;

    // /start o texto sin foto: explicar cómo funciona
    if (!mensaje.photo) {
      const camionId = await obtenerCamionVinculado(chatId);
      if (!camionId) {
        await pedirVinculacion(chatId);
      } else {
        await enviarMensaje(chatId, "Mandame una foto del ticket o factura y lo registro automáticamente.");
      }
      return;
    }

    // Llegó una foto
    const camionId = await obtenerCamionVinculado(chatId);
    if (!camionId) {
      await pedirVinculacion(chatId);
      await enviarMensaje(chatId, "Elegí tu camión arriba y volvé a mandar la foto.");
      return;
    }

    // Telegram manda varias resoluciones, la última es la más grande
    const fotoFileId = mensaje.photo[mensaje.photo.length - 1].file_id;
    await registrarGasto(chatId, camionId, fotoFileId);
  } catch (err) {
    console.error("Error procesando update de Telegram:", err);
  }
}

export async function POST(req: NextRequest) {
  const secretoRecibido = req.headers.get("x-telegram-bot-api-secret-token");
  if (secretoRecibido !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const update = await req.json();

  // Deduplicación: si Telegram reintenta el mismo update_id (por timeout),
  // lo ignoramos silenciosamente en vez de procesarlo de nuevo.
  const updateId = update.update_id;
  if (typeof updateId === "number") {
    const { error } = await supabaseAdmin
      .from("telegram_updates_procesados")
      .insert({ update_id: updateId });

    if (error) {
      // código 23505 = violación de unique constraint = ya lo procesamos antes
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicado: true });
      }
      // Si falla por otra razón, seguimos igual (mejor procesar de más que perder un gasto)
      console.error("Error registrando update_id de Telegram:", error);
    }
  }

  // Respondemos a Telegram YA, así no reintenta por timeout.
  // El procesamiento real (Gemini, Supabase, etc.) sigue corriendo después.
  after(() => procesarUpdate(update));

  return NextResponse.json({ ok: true });
}
