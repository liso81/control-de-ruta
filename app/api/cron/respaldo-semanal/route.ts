// app/api/cron/respaldo-semanal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TABLAS = [
  "empresas",
  "licencias",
  "camiones",
  "productos",
  "movimientos",
  "turnos",
  "finanzas_movimientos",
  "mantenimientos",
  "mantenimiento_productos",
  "mantenimiento_bom",
  "cuentas_por_cobrar",
  "mayor_provision",
  "provision_fondos",
  "documentos_vehiculo",
  "intervalos_mantenimiento",
  "paralizaciones",
  "telegram_vinculos",
  "chofer_dispositivos",
  "empresa_invitaciones",
];

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const respaldo: Record<string, unknown> = {
    generado_en: new Date().toISOString(),
  };

  for (const tabla of TABLAS) {
    const { data, error } = await supabaseAdmin.from(tabla).select("*");
    respaldo[tabla] = error ? { error: error.message } : data;
  }

  const { data: admins } = await supabaseAdmin.from("admins").select("id, username, empresa_id");
  respaldo["admins"] = admins ?? [];

  const fecha = new Date().toISOString().slice(0, 10);
  const nombreArchivo = `respaldo-${fecha}.json`;
  const contenido = JSON.stringify(respaldo, null, 2);

  const { error: errorSubida } = await supabaseAdmin.storage
    .from("respaldos")
    .upload(nombreArchivo, Buffer.from(contenido), {
      contentType: "application/json",
      upsert: true,
    });

  if (errorSubida) {
    return NextResponse.json({ error: errorSubida.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, archivo: nombreArchivo });
}
