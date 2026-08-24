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

  const { data, error } = await supabaseAdmin.from("productos").select("*").order("nombre");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ productos: data });
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, unidad, precio_unitario, stock_actual } = body;

  if (!nombre || precio_unitario === undefined) {
    return NextResponse.json({ error: "Faltan nombre o precio" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("productos")
    .insert({
      nombre,
      unidad: unidad ?? null,
      precio_unitario,
      stock_actual: stock_actual ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ producto: data });
}
