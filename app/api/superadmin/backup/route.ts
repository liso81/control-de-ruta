import { NextRequest, NextResponse } from "next/server";
import { verificarSesionSuperadmin } from "@/lib/superadmin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Todas las tablas que forman parte del respaldo. No incluye password_hash
// de admins por seguridad (si hace falta restaurar logins, hay que resetear
// las contraseñas a mano, igual que hoy).
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
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const respaldo: Record<string, unknown> = {
    generado_en: new Date().toISOString(),
  };

  for (const tabla of TABLAS) {
    const { data, error } = await supabaseAdmin.from(tabla).select("*");
    respaldo[tabla] = error ? { error: error.message } : data;
  }

  // admins sin password_hash, por seguridad
  const { data: admins } = await supabaseAdmin.from("admins").select("id, username, empresa_id");
  respaldo["admins"] = admins ?? [];

  const fecha = new Date().toISOString().slice(0, 10);
  const contenido = JSON.stringify(respaldo, null, 2);

  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="respaldo-control-de-ruta-${fecha}.json"`,
    },
  });
}
