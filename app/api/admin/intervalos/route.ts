import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function requiereSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  return verificarSesion(token);
}

export async function GET(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const camion_id = searchParams.get("camion_id");

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("intervalos_mantenimiento")
    .select("*")
    .eq("camion_id", camion_id)
    .order("tipo");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ intervalos: data });
}

// Crea o actualiza el intervalo para un tipo (upsert por camion_id + tipo).
export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { camion_id, tipo, intervalo_km } = body;

  if (!camion_id || !tipo || !intervalo_km) {
    return NextResponse.json({ error: "Faltan camion_id, tipo o intervalo_km" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("intervalos_mantenimiento")
    .upsert({ camion_id, tipo, intervalo_km }, { onConflict: "camion_id,tipo" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ intervalo: data });
}
