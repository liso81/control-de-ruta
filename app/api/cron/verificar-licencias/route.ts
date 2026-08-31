// app/api/cron/verificar-licencias/route.ts
import { NextRequest, NextResponse } from "next/server";
import { evaluarLicencia, generarMensaje } from "@/lib/licencias";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: licencias, error } = await supabaseAdmin
    .from("licencias")
    .select("*, empresas(*)")
    .not("estado", "in", "(bloqueada)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resultados: Array<{ empresa_id: string; accion: string }> = [];

  for (const licencia of licencias ?? []) {
    const empresa = (licencia as any).empresas;
    if (!empresa) continue;

    const evaluacion = evaluarLicencia(licencia as any);

    if (evaluacion.nuevoEstadoLicencia !== licencia.estado) {
      await supabaseAdmin
        .from("licencias")
        .update({ estado: evaluacion.nuevoEstadoLicencia })
        .eq("id", licencia.id);
    }

    if (evaluacion.nuevoEstadoEmpresa && evaluacion.nuevoEstadoEmpresa !== empresa.estado) {
      await supabaseAdmin
        .from("empresas")
        .update({ estado: evaluacion.nuevoEstadoEmpresa })
        .eq("id", empresa.id);
      resultados.push({ empresa_id: empresa.id, accion: `empresa -> ${evaluacion.nuevoEstadoEmpresa}` });
    }

    if (evaluacion.notificacion) {
      const mensaje = generarMensaje(evaluacion.notificacion.tipo, empresa, licencia as any);
      const { error: errNotif } = await supabaseAdmin.from("notificaciones").insert({
        empresa_id: empresa.id,
        licencia_id: licencia.id,
        tipo: evaluacion.notificacion.tipo,
        mensaje,
      });
      if (!errNotif) {
        resultados.push({ empresa_id: empresa.id, accion: `notificación -> ${evaluacion.notificacion.tipo}` });
      }
    }
  }

  return NextResponse.json({ ok: true, procesadas: licencias?.length ?? 0, resultados });
}
