import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";

export const dynamic = "force-dynamic";

async function autenticado(request) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  return !!sesion;
}

export async function GET(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("mb_categorias")
    .select("*")
    .order("tipo", { ascending: true })
    .order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, tipo, icono, color, orden } = body;

  if (!nombre || !["ingreso", "gasto"].includes(tipo)) {
    return NextResponse.json({ error: "Faltan datos o el tipo no es valido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("mb_categorias")
    .insert({ nombre, tipo, icono: icono || "🏷️", color: color || "#6b7280", orden: orden ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
