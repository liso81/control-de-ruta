import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { nombre, unidad, precio_unitario, stock_actual } = body;

  const cambios: Record<string, unknown> = {};
  if (nombre !== undefined) cambios.nombre = nombre;
  if (unidad !== undefined) cambios.unidad = unidad;
  if (precio_unitario !== undefined) cambios.precio_unitario = precio_unitario;
  if (stock_actual !== undefined) cambios.stock_actual = stock_actual;

  const { data, error } = await supabaseAdmin
    .from("productos")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ producto: data });
}
