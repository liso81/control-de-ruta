import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion || !sesion.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const nuevoToken = crypto.randomBytes(12).toString("hex");

  const { error } = await supabaseAdmin
    .from("empresa_invitaciones")
    .upsert({ empresa_id: sesion.empresa_id, token: nuevoToken }, { onConflict: "empresa_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: nuevoToken });
}

// Trae el link actual si ya existe, sin generar uno nuevo.
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion || !sesion.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("empresa_invitaciones")
    .select("token")
    .eq("empresa_id", sesion.empresa_id)
    .maybeSingle();

  return NextResponse.json({ token: data?.token ?? null });
}
