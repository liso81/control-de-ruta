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

// Devuelve SOLO si está configurado o no, y el ICCID (que no es secreto).
// Nunca devuelve usuario/contraseña de vuelta, ni siquiera para editar:
// si querés cambiarlos, se vuelven a escribir de cero.
export async function GET(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const camion_id = searchParams.get("camion_id");

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("gps_configuracion")
    .select("servidor_url, iccid, updated_at")
    .eq("camion_id", camion_id)
    .maybeSingle();

  return NextResponse.json({
    configurado: !!data,
    servidor_url: data?.servidor_url ?? null,
    iccid: data?.iccid ?? null,
    updated_at: data?.updated_at ?? null,
  });
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { camion_id, servidor_url, usuario, password, iccid } = body;

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("gps_configuracion").upsert(
    {
      camion_id,
      servidor_url: servidor_url || null,
      usuario: usuario || null,
      password: password || null,
      iccid: iccid || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "camion_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
