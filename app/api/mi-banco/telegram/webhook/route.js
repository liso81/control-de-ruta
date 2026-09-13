// app/api/mi-banco/telegram/webhook/route.js
// Bot de Telegram de "Mi Banco": el dueno manda la foto de una factura,
// la IA la lee, y el bot pregunta a que cuenta/sobre y categoria va antes
// de guardarla como gasto.
import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarMensaje, enviarBotones, responderCallback, descargarFotoBase64 } from "@/lib/mi-banco/telegram";
import { extraerFacturaDeImagen } from "@/lib/mi-banco/gemini-vision";
import { obtenerCuentasConSaldo } from "@/lib/mi-banco/db";
import { formatearMonto } from "@/lib/formato";

export const dynamic = "force-dynamic";

async function estaAutorizado(chatId) {
  const { data } = await supabaseAdmin
    .from("mb_telegram_vinculo")
    .select("autorizado")
    .eq("chat_id", chatId)
    .maybeSingle();
  return !!data?.autorizado;
}

async function intentarAutorizar(chatId, texto) {
  const codigo = (process.env.MB_TELEGRAM_LINK_CODE || "").trim();
  if (!codigo || texto.trim() !== codigo) return false;

  await supabaseAdmin.from("mb_telegram_vinculo").upsert({ chat_id: chatId, autorizado: true });
  return true;
}

async function enviarSaldo(chatId) {
  const cuentas = await obtenerCuentasConSaldo();
  if (cuentas.length === 0) {
    await enviarMensaje(chatId, "Todavia no tenes cuentas cargadas en la app.");
    return;
  }

  const lineas = cuentas.map((c) => `${c.icono} ${c.nombre}: *${formatearMonto(c.saldo)}*`);
  const total = cuentas.filter((c) => c.tipo === "cuenta").reduce((acc, c) => acc + c.saldo, 0);
  await enviarMensaje(chatId, `${lineas.join("\n")}\n\n💰 Total en cuentas: *${formatearMonto(total)}*`);
}

async function iniciarCargaFactura(chatId, fotoFileId) {
  await enviarMensaje(chatId, "📸 Recibido, analizando la factura...");
  const imagenBase64 = await descargarFotoBase64(fotoFileId);
  const factura = await extraerFacturaDeImagen(imagenBase64);

  if (!factura) {
    await enviarMensaje(chatId, "No pude leer bien la imagen. Mandala de nuevo con mejor luz/enfoque.");
    return;
  }

  const { data: pendiente, error } = await supabaseAdmin
    .from("mb_telegram_pendientes")
    .insert({
      chat_id: chatId,
      monto: factura.monto,
      descripcion: factura.descripcion,
      comercio: factura.comercio,
      fecha: factura.fecha,
    })
    .select()
    .single();

  if (error || !pendiente) {
    await enviarMensaje(chatId, "Se leyo la imagen pero no pude guardarla temporalmente. Intenta de nuevo.");
    return;
  }

  const { data: cuentas } = await supabaseAdmin
    .from("mb_cuentas")
    .select("id, nombre, icono")
    .eq("activa", true)
    .order("orden");

  const botones = (cuentas ?? []).map((c) => ({
    texto: `${c.icono} ${c.nombre}`,
    callback_data: `mbcuenta:${pendiente.id}:${c.id}`,
  }));

  await enviarBotones(
    chatId,
    `Lei: *${formatearMonto(factura.monto)}*${factura.comercio ? ` — ${factura.comercio}` : ""}${
      factura.descripcion ? `\n${factura.descripcion}` : ""
    }\n\n¿De que cuenta o sobre sale este gasto?`,
    botones
  );
}

async function pedirCategoria(chatId, pendienteId) {
  const { data: categorias } = await supabaseAdmin
    .from("mb_categorias")
    .select("id, nombre, icono")
    .eq("tipo", "gasto")
    .order("orden");

  const botones = (categorias ?? []).map((c) => ({
    texto: `${c.icono} ${c.nombre}`,
    callback_data: `mbcategoria:${pendienteId}:${c.id}`,
  }));

  if (botones.length === 0) {
    await finalizarPendiente(chatId, pendienteId, null);
    return;
  }

  await enviarBotones(chatId, "¿En que categoria entra?", botones);
}

async function finalizarPendiente(chatId, pendienteId, categoriaId) {
  const { data: pendiente } = await supabaseAdmin
    .from("mb_telegram_pendientes")
    .select("*")
    .eq("id", pendienteId)
    .maybeSingle();

  if (!pendiente) {
    await enviarMensaje(chatId, "Esa factura ya no esta disponible (puede que ya la hayas confirmado).");
    return;
  }

  const { error } = await supabaseAdmin.from("mb_movimientos").insert({
    cuenta_id: pendiente.cuenta_id_elegida,
    categoria_id: categoriaId,
    tipo: "gasto",
    monto: -Math.abs(pendiente.monto),
    descripcion: pendiente.descripcion,
    comercio: pendiente.comercio,
    fecha: pendiente.fecha || new Date().toISOString().slice(0, 10),
    origen: "telegram",
  });

  await supabaseAdmin.from("mb_telegram_pendientes").delete().eq("id", pendienteId);

  if (error) {
    await enviarMensaje(chatId, "⚠️ Hubo un error guardando el gasto. Intenta cargarlo manual en la app.");
    return;
  }

  await enviarMensaje(chatId, `✅ Gasto registrado: *${formatearMonto(pendiente.monto)}*${pendiente.comercio ? ` — ${pendiente.comercio}` : ""}`);
}

async function procesarUpdate(update) {
  try {
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      if (data.startsWith("mbcuenta:")) {
        const [, pendienteId, cuentaId] = data.split(":");
        await supabaseAdmin.from("mb_telegram_pendientes").update({ cuenta_id_elegida: cuentaId }).eq("id", pendienteId);
        await responderCallback(update.callback_query.id, "Listo");
        await pedirCategoria(chatId, pendienteId);
        return;
      }

      if (data.startsWith("mbcategoria:")) {
        const [, pendienteId, categoriaId] = data.split(":");
        await responderCallback(update.callback_query.id, "Listo");
        await finalizarPendiente(chatId, pendienteId, categoriaId);
        return;
      }

      return;
    }

    const mensaje = update.message;
    if (!mensaje) return;

    const chatId = mensaje.chat.id;
    const autorizado = await estaAutorizado(chatId);

    if (!autorizado) {
      const texto = (mensaje.text ?? "").trim();
      if (texto && (await intentarAutorizar(chatId, texto))) {
        await enviarMensaje(chatId, "✅ Chat vinculado a Mi Banco. Mandame la foto de una factura cuando quieras cargar un gasto, o escribi /saldo.");
        return;
      }
      await enviarMensaje(chatId, "👋 Este bot es privado. Escribime tu codigo de vinculacion para empezar.");
      return;
    }

    if (mensaje.text === "/saldo") {
      await enviarSaldo(chatId);
      return;
    }

    if (mensaje.text === "/start") {
      await enviarMensaje(chatId, "Mandame la foto de una factura o ticket y te pregunto de que cuenta y categoria sale. Tambien podes escribir /saldo.");
      return;
    }

    if (mensaje.photo) {
      const fotoFileId = mensaje.photo[mensaje.photo.length - 1].file_id;
      await iniciarCargaFactura(chatId, fotoFileId);
      return;
    }

    await enviarMensaje(chatId, "Mandame una foto de la factura, o escribi /saldo para ver tus cuentas.");
  } catch (err) {
    console.error("Error procesando update de Telegram (mi-banco):", err);
  }
}

export async function POST(request) {
  const secretoRecibido = request.headers.get("x-telegram-bot-api-secret-token");
  if (secretoRecibido !== process.env.MB_TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const update = await request.json();

  const updateId = update.update_id;
  if (typeof updateId === "number") {
    const { error } = await supabaseAdmin.from("mb_telegram_updates").insert({ update_id: updateId });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicado: true });
      }
      console.error("Error registrando update_id de Telegram (mi-banco):", error);
    }
  }

  after(() => procesarUpdate(update));
  return NextResponse.json({ ok: true });
}
