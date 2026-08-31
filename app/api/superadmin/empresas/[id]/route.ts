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

// DELETE: borrar la empresa y todos sus datos (irreversible) — usar con cuidado, es manual
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin.from("empresas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
