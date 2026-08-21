import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Busca el turno abierto de HOY para un camión, o lo crea si no existe.
export async function POST(request: Request) {
  const body = await request.json();
  const { camion_id, chofer_nombre } = body;

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: existente, error: errorBusqueda } = await supabaseAdmin
    .from("turnos")
    .select("*")
    .eq("camion_id", camion_id)
    .eq("fecha", hoy)
    .eq("estado", "abierto")
    .maybeSingle();

  if (errorBusqueda) {
    return NextResponse.json({ error: errorBusqueda.message }, { status: 500 });
  }

  if (existente) {
    return NextResponse.json({ turno: existente });
  }

  if (!chofer_nombre) {
    return NextResponse.json({ requiereNombre: true });
  }

  const { data: turnoAnterior } = await supabaseAdmin
    .from("turnos")
    .select("remanente")
    .eq("camion_id", camion_id)
    .eq("estado", "cerrado")
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  const saldo_inicial = turnoAnterior?.remanente ?? 0;

  const { data: nuevo, error: errorCreacion } = await supabaseAdmin
    .from("turnos")
    .insert({
      camion_id,
      fecha: hoy,
      chofer_nombre,
      saldo_inicial,
      estado: "abierto",
    })
    .select()
    .single();

  if (errorCreacion) {
    return NextResponse.json({ error: errorCreacion.message }, { status: 500 });
  }

  return NextResponse.json({ turno: nuevo });
}
