import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { camionPerteneceAEmpresa } from "@/lib/empresa";

export const dynamic = "force-dynamic";

const MAX_DISPOSITIVOS_POR_CAMION = 2;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion || !sesion.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { solicitud_id, camion_id } = body;

  if (!solicitud_id || !camion_id) {
    return NextResponse.json({ error: "Faltan solicitud_id o camion_id" }, { status: 400 });
  }

  if (!(await camionPerteneceAEmpresa(camion_id, sesion.empresa_id))) {
    return NextResponse.json({ error: "Ese camión no pertenece a tu empresa" }, { status: 403 });
  }

  const { count } = await supabaseAdmin
    .from("chofer_dispositivos")
    .select("id", { count: "exact", head: true })
    .eq("camion_id", camion_id)
    .eq("estado", "aprobado");

  if ((count ?? 0) >= MAX_DISPOSITIVOS_POR_CAMION) {
    return NextResponse.json(
      { error: `Ese camión ya tiene ${MAX_DISPOSITIVOS_POR_CAMION} teléfonos vinculados. Revocá uno antes de agregar otro.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("chofer_dispositivos")
    .update({ estado: "aprobado", camion_id, updated_at: new Date().toISOString() })
    .eq("id", solicitud_id)
    .eq("empresa_id", sesion.empresa_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dispositivo: data });
}
