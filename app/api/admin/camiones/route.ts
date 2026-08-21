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

export async function GET() {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from("camiones").select("*").order("nombre");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ camiones: data });
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, capacidad_litros, matricula, marca, km_por_litro } = body;

  if (!nombre || !capacidad_litros) {
    return NextResponse.json({ error: "Faltan nombre o capacidad" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("camiones")
    .insert({
      nombre,
      capacidad_litros,
      litros_actual: capacidad_litros,
      matricula: matricula ?? null,
      marca: marca ?? null,
      km_por_litro: km_por_litro ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ camion: data });
}
