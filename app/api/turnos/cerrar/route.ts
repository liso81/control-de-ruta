import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const { turno_id, efectivo_entregado, remanente, desglose_efectivo } = body;

  if (!turno_id || efectivo_entregado === undefined || remanente === undefined) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("turnos")
    .update({
      estado: "cerrado",
      efectivo_entregado,
      remanente,
      desglose_efectivo: desglose_efectivo ?? null,
    })
    .eq("id", turno_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ turno: data });
}
