import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const { turno_id, fondo_dueno } = body;

  if (!turno_id || fondo_dueno === undefined) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("turnos")
    .update({ fondo_dueno })
    .eq("id", turno_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ turno: data });
}
