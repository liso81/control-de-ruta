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

  let query = supabaseAdmin
    .from("mantenimiento_bom")
    .select("*, producto:productos(nombre, unidad, stock_actual)")
    .order("tipo");
  if (sesion.empresa_id) {
    query = query.eq("empresa_id", sesion.empresa_id);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { tipo, producto_id, cantidad_necesaria } = body;

  if (!tipo || !producto_id || !cantidad_necesaria) {
    return NextResponse.json({ error: "Faltan tipo, producto_id o cantidad_necesaria" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("mantenimiento_bom")
    .upsert(
      { tipo, producto_id, cantidad_necesaria, empresa_id: sesion.empresa_id ?? null },
      { onConflict: "tipo,producto_id" }
    )
    .select("*, producto:productos(nombre, unidad, stock_actual)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
