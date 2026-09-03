import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion || !sesion.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { solicitud_id } = body;

  if (!solicitud_id) {
    return NextResponse.json({ error: "Falta solicitud_id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("chofer_dispositivos")
    .update({ estado: "revocado", updated_at: new Date().toISOString() })
    .eq("id", solicitud_id)
    .eq("empresa_id", sesion.empresa_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
