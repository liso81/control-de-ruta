import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const { data: mantenimiento, error: errorMantenimiento } = await supabaseAdmin
    .from("mantenimientos")
    .select("*")
    .eq("id", id)
    .single();

  if (errorMantenimiento || !mantenimiento) {
    return NextResponse.json({ error: "Mantenimiento no encontrado" }, { status: 404 });
  }

  const { data: productos } = await supabaseAdmin
    .from("mantenimiento_productos")
    .select("*")
    .eq("mantenimiento_id", id);

  return NextResponse.json({ mantenimiento: { ...mantenimiento, productos: productos ?? [] } });
}
