import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const device_id = searchParams.get("device_id");
  const token = searchParams.get("token");

  if (!device_id || !token) {
    return NextResponse.json({ error: "Faltan device_id o token" }, { status: 400 });
  }

  const { data: invitacion } = await supabaseAdmin
    .from("empresa_invitaciones")
    .select("empresa_id")
    .eq("token", token)
    .maybeSingle();

  if (!invitacion) {
    return NextResponse.json({ error: "Link inválido o vencido" }, { status: 404 });
  }

  const { data: dispositivo } = await supabaseAdmin
    .from("chofer_dispositivos")
    .select("estado, camion_id")
    .eq("empresa_id", invitacion.empresa_id)
    .eq("device_id", device_id)
    .maybeSingle();

  if (!dispositivo) {
    return NextResponse.json({ estado: "no_solicitado" });
  }

  return NextResponse.json({ estado: dispositivo.estado, camion_id: dispositivo.camion_id });
}
