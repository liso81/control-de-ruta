import { NextRequest, NextResponse } from "next/server";
import { verificarSesionSuperadmin } from "@/lib/superadmin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// Orden importa: padres antes que hijos (para insertar) / hijos antes que
// padres (para borrar, en reversa).
const TABLAS_EN_ORDEN = [
  "empresas",
  "licencias",
  "camiones",
  "productos",
  "turnos",
  "movimientos",
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

const PASSWORD_TEMPORAL = "Restaurado123!";

async function insertarEnLotes(tabla: string, filas: any[]) {
  if (!filas || filas.length === 0) return null;
  const TAMANO_LOTE = 300;
  for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
    const lote = filas.slice(i, i + TAMANO_LOTE);
    const { error } = await supabaseAdmin.from(tabla).upsert(lote, { onConflict: "id" });
    if (error) return error.message;
  }
  return null;
}

// Borra en cascada todo lo relacionado a una empresa (mismo criterio que
// "Eliminar cliente"), sin tocar la fila de la empresa en sí.
async function borrarDatosDeEmpresa(empresaId: string) {
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
}

export async function POST(req: NextRequest) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { modo, empresaId, datos } = body as { modo: "todo" | "empresa"; empresaId?: string; datos: Record<string, any[]> };

  if (!datos) {
    return NextResponse.json({ error: "Falta el archivo de respaldo (datos)" }, { status: 400 });
  }

  const passwordHashTemporal = await bcrypt.hash(PASSWORD_TEMPORAL, 10);

  if (modo === "todo") {
    // Borramos todo (hijos primero), en reversa de TABLAS_EN_ORDEN.
    for (const tabla of [...TABLAS_EN_ORDEN].reverse()) {
      await supabaseAdmin.from(tabla).delete().not("id", "is", null);
    }
    await supabaseAdmin.from("admins").delete().not("id", "is", null);

    // Insertamos todo, en el orden correcto (padres primero).
    for (const tabla of TABLAS_EN_ORDEN) {
      const err = await insertarEnLotes(tabla, datos[tabla]);
      if (err) {
        return NextResponse.json({ error: `Error restaurando "${tabla}": ${err}` }, { status: 500 });
      }
    }

    const adminsRestaurar = (datos.admins ?? []).map((a: any) => ({
      id: a.id,
      username: a.username,
      empresa_id: a.empresa_id,
      password_hash: passwordHashTemporal,
    }));
    const errAdmins = await insertarEnLotes("admins", adminsRestaurar);
    if (errAdmins) {
      return NextResponse.json({ error: `Error restaurando admins: ${errAdmins}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, passwordTemporal: PASSWORD_TEMPORAL });
  }

  if (modo === "empresa") {
    if (!empresaId) {
      return NextResponse.json({ error: "Falta empresaId" }, { status: 400 });
    }

    await borrarDatosDeEmpresa(empresaId);

    const camionesEmpresa = (datos.camiones ?? []).filter((c: any) => c.empresa_id === empresaId);
    const camionIds = new Set(camionesEmpresa.map((c: any) => c.id));

    const turnosEmpresa = (datos.turnos ?? []).filter((t: any) => camionIds.has(t.camion_id));
    const turnoIds = new Set(turnosEmpresa.map((t: any) => t.id));

    const mantenimientosEmpresa = (datos.mantenimientos ?? []).filter((m: any) => camionIds.has(m.camion_id));
    const mantenimientoIds = new Set(mantenimientosEmpresa.map((m: any) => m.id));

    const porTabla: Record<string, any[]> = {
      empresas: (datos.empresas ?? []).filter((e: any) => e.id === empresaId),
      licencias: (datos.licencias ?? []).filter((l: any) => l.empresa_id === empresaId),
      camiones: camionesEmpresa,
      productos: (datos.productos ?? []).filter((p: any) => p.empresa_id === empresaId),
      turnos: turnosEmpresa,
      movimientos: (datos.movimientos ?? []).filter((m: any) => turnoIds.has(m.turno_id)),
      finanzas_movimientos: (datos.finanzas_movimientos ?? []).filter((f: any) => f.empresa_id === empresaId),
      mantenimientos: mantenimientosEmpresa,
      mantenimiento_productos: (datos.mantenimiento_productos ?? []).filter((mp: any) =>
        mantenimientoIds.has(mp.mantenimiento_id)
      ),
      mantenimiento_bom: (datos.mantenimiento_bom ?? []).filter((b: any) => b.empresa_id === empresaId),
      cuentas_por_cobrar: (datos.cuentas_por_cobrar ?? []).filter((c: any) => camionIds.has(c.camion_id)),
      mayor_provision: (datos.mayor_provision ?? []).filter((p: any) => camionIds.has(p.camion_id)),
      provision_fondos: (datos.provision_fondos ?? []).filter((p: any) => camionIds.has(p.camion_id)),
      documentos_vehiculo: (datos.documentos_vehiculo ?? []).filter((d: any) => camionIds.has(d.camion_id)),
      intervalos_mantenimiento: (datos.intervalos_mantenimiento ?? []).filter((i: any) => camionIds.has(i.camion_id)),
      paralizaciones: (datos.paralizaciones ?? []).filter((p: any) => camionIds.has(p.camion_id)),
      telegram_vinculos: (datos.telegram_vinculos ?? []).filter((t: any) => t.empresa_id === empresaId),
      chofer_dispositivos: (datos.chofer_dispositivos ?? []).filter((c: any) => c.empresa_id === empresaId),
      empresa_invitaciones: (datos.empresa_invitaciones ?? []).filter((e: any) => e.empresa_id === empresaId),
    };

    for (const tabla of TABLAS_EN_ORDEN) {
      const err = await insertarEnLotes(tabla, porTabla[tabla]);
      if (err) {
        return NextResponse.json({ error: `Error restaurando "${tabla}": ${err}` }, { status: 500 });
      }
    }

    const adminsEmpresa = (datos.admins ?? [])
      .filter((a: any) => a.empresa_id === empresaId)
      .map((a: any) => ({ id: a.id, username: a.username, empresa_id: a.empresa_id, password_hash: passwordHashTemporal }));
    const errAdmins = await insertarEnLotes("admins", adminsEmpresa);
    if (errAdmins) {
      return NextResponse.json({ error: `Error restaurando admins: ${errAdmins}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, passwordTemporal: PASSWORD_TEMPORAL });
  }

  return NextResponse.json({ error: "modo inválido" }, { status: 400 });
}
