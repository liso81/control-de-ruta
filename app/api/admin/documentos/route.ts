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
    .from("documentos_vehiculo")
    .select("*")
    .eq("camion_id", camion_id)
    .order("fecha_caducidad", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documentos: data });
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { camion_id, tipo, fecha_emision, fecha_caducidad } = body;

  if (!camion_id || !tipo || !fecha_caducidad) {
    return NextResponse.json({ error: "Faltan camion_id, tipo o fecha_caducidad" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("documentos_vehiculo")
    .insert({
      camion_id,
      tipo,
      fecha_emision: fecha_emision ?? null,
      fecha_caducidad,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documento: data });
}
