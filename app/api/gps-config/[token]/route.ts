import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function buscarPorToken(token: string) {
  const { data } = await supabaseAdmin
    .from("gps_configuracion")
    .select("camion_id, setup_token, token_expira, camion:camiones(nombre, matricula)")
    .eq("setup_token", token)
    .maybeSingle();

  if (!data) return null;
  if (!data.token_expira || new Date(data.token_expira) < new Date()) return null;

  const camionInfo = Array.isArray(data.camion) ? data.camion[0] : data.camion;

  return {
    camion_id: data.camion_id,
    camion_nombre: camionInfo?.nombre ?? null,
    camion_matricula: camionInfo?.matricula ?? null,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const registro = await buscarPorToken(token);

  if (!registro) {
    return NextResponse.json({ error: "Este link no es válido o ya venció" }, { status: 404 });
  }

  return NextResponse.json({
    camion_nombre: registro.camion_nombre,
    camion_matricula: registro.camion_matricula,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const registro = await buscarPorToken(token);

  if (!registro) {
    return NextResponse.json({ error: "Este link no es válido o ya venció" }, { status: 404 });
  }

  const body = await request.json();
  const { servidor_url, usuario, password, iccid } = body;

  if (!servidor_url || !usuario || !password) {
    return NextResponse.json({ error: "Completá servidor, usuario y contraseña" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("gps_configuracion")
    .update({
      servidor_url,
      usuario,
      password,
      iccid: iccid || null,
      setup_token: null,
      token_expira: null,
      updated_at: new Date().toISOString(),
    })
    .eq("camion_id", registro.camion_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
