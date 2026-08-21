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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { nombre, capacidad_litros } = body;

  const cambios: Record<string, unknown> = {};
  if (nombre !== undefined) cambios.nombre = nombre;
  if (capacidad_litros !== undefined) cambios.capacidad_litros = capacidad_litros;

  const { data, error } = await supabaseAdmin
    .from("camiones")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ camion: data });
}
