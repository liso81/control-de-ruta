// app/api/superadmin/empresas/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verificarSesionSuperadmin } from "@/lib/superadmin-auth";
import { registrarPago } from "@/lib/licencias";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH: acciones sobre una empresa -> { accion: "renovar" | "bloquear" | "desbloquear" | "cancelar" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: empresaId } = await params;
  const { accion } = await req.json();

  if (accion === "renovar") {
    const { data: licenciaActual, error: errActual } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (errActual) {
      return NextResponse.json({ error: errActual.message }, { status: 500 });
    }

    const cambios = registrarPago(licenciaActual);
    const { data: licenciaActualizada, error: errUpdate } = await supabaseAdmin
      .from("licencias")
      .update(cambios)
      .eq("id", licenciaActual.id)
      .select()
      .single();

    if (errUpdate) {
      return NextResponse.json({ error: errUpdate.message }, { status: 500 });
    }

    await supabaseAdmin.from("empresas").update({ estado: "activa" }).eq("id", empresaId);

    return NextResponse.json({ licencia: licenciaActualizada });
  }

  if (accion === "bloquear" || accion === "desbloquear" || accion === "cancelar") {
    const nuevoEstado =
      accion === "bloquear" ? "bloqueada" : accion === "cancelar" ? "cancelada" : "activa";

    const { data: empresa, error } = await supabaseAdmin
      .from("empresas")
      .update({ estado: nuevoEstado })
      .eq("id", empresaId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ empresa });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}

// DELETE: borra la empresa y TODOS sus datos relacionados (irreversible).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: empresaId } = await params;

  try {
    const { data: camiones } = await supabaseAdmin.from("camiones").select("id").eq("empresa_id", empresaId);
    const camionIds = (camiones ?? []).map((c) => c.id);

    const { data: turnos } =
      camionIds.length > 0 ? await supabaseAdmin.from("turnos").select("id").in("camion_id", camionIds) : { data: [] };
    const turnoIds = (turnos ?? []).map((t) => t.id);

    const { data: mantenimientos } =
      camionIds.length > 0
        ? await supabaseAdmin.from("mantenimientos").select("id").in("camion_id", camionIds)
        : { data: [] };
    const mantenimientoIds = (mantenimientos ?? []).map((m) => m.id);

    if (mantenimientoIds.length > 0) {
      await supabaseAdmin.from("mantenimiento_productos").delete().in("mantenimiento_id", mantenimientoIds);
    }
    if (turnoIds.length > 0) {
      await supabaseAdmin.from("movimientos").delete().in("turno_id", turnoIds);
    }
    if (camionIds.length > 0) {
      await supabaseAdmin.from("cuentas_por_cobrar").delete().in("camion_id", camionIds);
      await supabaseAdmin.from("mantenimientos").delete().in("camion_id", camionIds);
      await supabaseAdmin.from("mayor_provision").delete().in("camion_id", camionIds);
      await supabaseAdmin.from("provision_fondos").delete().in("camion_id", camionIds);
      await supabaseAdmin.from("documentos_vehiculo").delete().in("camion_id", camionIds);
      await supabaseAdmin.from("intervalos_mantenimiento").delete().in("camion_id", camionIds);
      await supabaseAdmin.from("paralizaciones").delete().in("camion_id", camionIds);
      await supabaseAdmin.from("turnos").delete().in("camion_id", camionIds);
    }

    await supabaseAdmin.from("finanzas_movimientos").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("mantenimiento_bom").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("productos").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("telegram_vinculos").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("chofer_dispositivos").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("empresa_invitaciones").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("admins").delete().eq("empresa_id", empresaId);

    if (camionIds.length > 0) {
      await supabaseAdmin.from("camiones").delete().eq("empresa_id", empresaId);
    }

    await supabaseAdmin.from("licencias").delete().eq("empresa_id", empresaId);

    const { error: errorFinal } = await supabaseAdmin.from("empresas").delete().eq("id", empresaId);

    if (errorFinal) {
      return NextResponse.json({ error: errorFinal.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error borrando la empresa" },
      { status: 500 }
    );
  }
}
