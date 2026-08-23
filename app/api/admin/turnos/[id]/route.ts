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

  const { data: turno, error: errorTurno } = await supabaseAdmin
    .from("turnos")
    .select("*")
    .eq("id", id)
    .single();

  if (errorTurno || !turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const { data: movimientos, error: errorMovimientos } = await supabaseAdmin
    .from("movimientos")
    .select("*")
    .eq("turno_id", id)
    .order("created_at", { ascending: false });

  if (errorMovimientos) {
    return NextResponse.json({ error: errorMovimientos.message }, { status: 500 });
  }

  return NextResponse.json({ turno, movimientos });
}
