// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarMensaje, enviarBotones, responderCallback, descargarFotoBase64 } from "@/lib/telegram";
import { extraerGastoDeImagen } from "@/lib/gemini-vision";
import { registrarGastoEnPanel } from "@/lib/finanzas-gastos";

export const dynamic = "force-dynamic";

async function obtenerVinculo(chatId: number) {
  const { data } = await supabaseAdmin
    .from("telegram_vinculos")
    .select("camion_id, rol")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data ?? null;
}

async function pedirVinculacion(chatId: number) {
  const { data: camiones } = await supabaseAdmin
    .from("camiones")
    .select("id, nombre, matricula")
    .order("nombre");

  const botones = (camiones ?? []).map((c) => ({
    texto: `${c.nombre} · ${c.matricula}`,
    callback_data: `vincular:${c.id}`,
  }));
  botones.push({ texto: "🧑‍💼 Soy el dueño (compras generales)", callback_data: "vincular_dueno" });

  await enviarBotones(
    chatId,
    "¿Este chat es de un camión, o sos vos, el dueño, mandando compras generales?",
    botones
  );
}

// ---- Flujo CHOFER: se autoclasifica con Gemini y se registra directo ----
async function registrarGastoAutomatico(chatId: number, camionId: string, fotoFileId: string) {
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

  const resultado = await registrarGastoEnPanel({
    categoria: gasto.categoria,
    camionId,
    monto: gasto.monto,
    descripcion: gasto.descripcion,
    proveedor: gasto.proveedor,
    producto_nombre: gasto.producto_nombre,
    cantidad: gasto.cantidad,
    unidad: gasto.unidad,
    tipo_mantenimiento: gasto.tipo_mantenimiento,
  });

  if (!resultado.ok) {
    await enviarMensaje(chatId, "⚠️ Se leyó la imagen pero hubo un error guardándolo. Avisale a Lisandro.");
    return;
  }

  await enviarMensaje(
    chatId,
    `✅ ${resultado.etiqueta} registrado:\n*${gasto.monto.toLocaleString("es")} Kz* — ${gasto.descripcion}${
      gasto.proveedor ? `\n${gasto.proveedor}` : ""
    }`
  );
}

// ---- Flujo DUEÑO: lee la foto, y pregunta con botones a dónde va ----
async function iniciarSeleccionDestino(chatId: number, fotoFileId: string) {
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

  const { data: pendiente, error } = await supabaseAdmin
    .from("telegram_gastos_pendientes")
    .insert({
      chat_id: chatId,
      monto: gasto.monto,
      descripcion: gasto.descripcion,
      proveedor: gasto.proveedor,
      producto_nombre: gasto.producto_nombre,
      cantidad: gasto.cantidad,
      unidad: gasto.unidad,
      tipo_mantenimiento: gasto.tipo_mantenimiento,
    })
    .select()
    .single();

  if (error || !pendiente) {
    await enviarMensaje(chatId, "⚠️ Se leyó la imagen pero no pude guardarla temporalmente. Avisale a Lisandro.");
    return;
  }

  await enviarBotones(
    chatId,
    `Leí: *${gasto.monto.toLocaleString("es")} Kz*${gasto.descripcion ? ` — ${gasto.descripcion}` : ""}${
      gasto.proveedor ? `\n${gasto.proveedor}` : ""
    }\n\n¿A dónde va este gasto?`,
    [
      { texto: "📦 Insumos (inventario)", callback_data: `destino:insumo:${pendiente.id}` },
      { texto: "🔧 Servicio a terceros", callback_data: `destino:servicio:${pendiente.id}` },
      { texto: "🧾 Otros gastos", callback_data: `destino:otro:${pendiente.id}` },
    ]
  );
}

async function finalizarPendiente(
  chatId: number,
  pendienteId: number,
  categoria: "insumo" | "otro" | "servicio_tercero",
  camionId: string | null
) {
  const { data: pendiente } = await supabaseAdmin
    .from("telegram_gastos_pendientes")
    .select("*")
    .eq("id", pendienteId)
    .maybeSingle();

  if (!pendiente) {
    await enviarMensaje(chatId, "Ese gasto ya no está disponible (puede que ya lo hayas confirmado).");
    return;
  }

  const resultado = await registrarGastoEnPanel({
    categoria,
    camionId,
    monto: pendiente.monto,
    descripcion: pendiente.descripcion,
    proveedor: pendiente.proveedor,
    producto_nombre: pendiente.producto_nombre,
    cantidad: pendiente.cantidad,
    unidad: pendiente.unidad,
    tipo_mantenimiento: pendiente.tipo_mantenimiento,
  });

  await supabaseAdmin.from("telegram_gastos_pendientes").delete().eq("id", pendienteId);

  if (resultado.ok) {
    await enviarMensaje(
      chatId,
      `✅ ${resultado.etiqueta} registrado:\n*${Number(pendiente.monto).toLocaleString("es")} Kz* — ${
        pendiente.descripcion ?? ""
      }`
    );
  } else {
    await enviarMensaje(chatId, "⚠️ Hubo un error guardando el gasto. Avisale a Lisandro.");
  }
}

// Toda la lógica pesada vive acá adentro. Se ejecuta DESPUÉS de responder a Telegram.
async function procesarUpdate(update: any) {
  try {
    // Botón tocado
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data: string = update.callback_query.data;

      if (data.startsWith("vincular:")) {
        const camionId = data.replace("vincular:", "");
        await supabaseAdmin.from("telegram_vinculos").upsert({ chat_id: chatId, camion_id: camionId, rol: "chofer" });
        await responderCallback(update.callback_query.id, "Listo");
        await enviarMensaje(chatId, "✅ Camión vinculado. Ahora mandame fotos de tickets/facturas y las registro solo.");
        return;
      }

      if (data === "vincular_dueno") {
        await supabaseAdmin.from("telegram_vinculos").upsert({ chat_id: chatId, camion_id: null, rol: "dueno" });
        await responderCallback(update.callback_query.id, "Listo");
        await enviarMensaje(
          chatId,
          "✅ Configurado como dueño. Cuando mandes una foto de una compra general, te voy a preguntar a dónde va."
        );
        return;
      }

      if (data.startsWith("destino:")) {
        const [, tipoDestino, pendienteIdStr] = data.split(":");
        const pendienteId = Number(pendienteIdStr);

        if (tipoDestino === "servicio") {
          const { data: camiones } = await supabaseAdmin
            .from("camiones")
            .select("id, nombre, matricula")
            .order("nombre");

          await responderCallback(update.callback_query.id, "Elegí el camión");
          await enviarBotones(
            chatId,
            "¿Para qué camión es este servicio?",
            (camiones ?? []).map((c) => ({
              texto: `${c.nombre} · ${c.matricula}`,
              callback_data: `camion_servicio:${c.id}:${pendienteId}`,
            }))
          );
          return;
        }

        await responderCallback(update.callback_query.id, "Listo");
        const categoria = tipoDestino === "insumo" ? "insumo" : "otro";
        await finalizarPendiente(chatId, pendienteId, categoria, null);
        return;
      }

      if (data.startsWith("camion_servicio:")) {
        const [, camionId, pendienteIdStr] = data.split(":");
        const pendienteId = Number(pendienteIdStr);

        await responderCallback(update.callback_query.id, "Listo");
        await finalizarPendiente(chatId, pendienteId, "servicio_tercero", camionId);
        return;
      }

      return;
    }

    const mensaje = update.message;
    if (!mensaje) return;

    const chatId = mensaje.chat.id;

    // /start o texto sin foto: explicar cómo funciona
    if (!mensaje.photo) {
      const vinculo = await obtenerVinculo(chatId);
      if (!vinculo) {
        await pedirVinculacion(chatId);
      } else if (vinculo.rol === "dueno") {
        await enviarMensaje(chatId, "Mandame una foto de la compra y te pregunto a dónde va.");
      } else {
        await enviarMensaje(chatId, "Mandame una foto del ticket o factura y lo registro automáticamente.");
      }
      return;
    }

    // Llegó una foto
    const vinculo = await obtenerVinculo(chatId);
    if (!vinculo) {
      await pedirVinculacion(chatId);
      await enviarMensaje(chatId, "Elegí una opción arriba y volvé a mandar la foto.");
      return;
    }

    // Telegram manda varias resoluciones, la última es la más grande
    const fotoFileId = mensaje.photo[mensaje.photo.length - 1].file_id;

    if (vinculo.rol === "dueno") {
      await iniciarSeleccionDestino(chatId, fotoFileId);
    } else if (vinculo.camion_id) {
      await registrarGastoAutomatico(chatId, vinculo.camion_id, fotoFileId);
    } else {
      await pedirVinculacion(chatId);
    }
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
      console.error("Error registrando update_id de Telegram:", error);
    }
  }

  // Respondemos a Telegram YA, así no reintenta por timeout.
  // El procesamiento real (Gemini, Supabase, etc.) sigue corriendo después.
  after(() => procesarUpdate(update));

  return NextResponse.json({ ok: true });
}
