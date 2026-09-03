import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: muestra el nombre de la empresa para la pantalla "Solicitar acceso a X"
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: invitacion } = await supabaseAdmin
    .from("empresa_invitaciones")
    .select("empresa_id, empresas(nombre)")
    .eq("token", token)
    .maybeSingle();

  if (!invitacion) {
    return NextResponse.json({ error: "Link inválido o vencido" }, { status: 404 });
  }

  return NextResponse.json({
    empresa_id: invitacion.empresa_id,
    empresa_nombre: (invitacion as any).empresas?.nombre ?? "tu empresa",
  });
}

// POST: el chofer solicita acceso desde su teléfono
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json();
  const { device_id } = body;

  if (!device_id) {
    return NextResponse.json({ error: "Falta device_id" }, { status: 400 });
  }

  const { data: invitacion } = await supabaseAdmin
    .from("empresa_invitaciones")
    .select("empresa_id")
    .eq("token", token)
    .maybeSingle();

  if (!invitacion) {
    return NextResponse.json({ error: "Link inválido o vencido" }, { status: 404 });
  }

  // Si este teléfono ya había solicitado antes, no lo reseteamos a pendiente
  // si ya estaba aprobado o revocado — solo devolvemos su estado actual.
  const { data: existente } = await supabaseAdmin
    .from("chofer_dispositivos")
    .select("*")
    .eq("empresa_id", invitacion.empresa_id)
    .eq("device_id", device_id)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ estado: existente.estado, camion_id: existente.camion_id });
  }

  const { data: nuevo, error } = await supabaseAdmin
    .from("chofer_dispositivos")
    .insert({ empresa_id: invitacion.empresa_id, device_id, estado: "pendiente" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ estado: nuevo.estado, camion_id: nuevo.camion_id });
}
