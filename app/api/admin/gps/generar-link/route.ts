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
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { camion_id } = body;

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const setupToken = crypto.randomBytes(24).toString("hex");
  const expira = new Date();
  expira.setHours(expira.getHours() + 48); // el link vale por 48 horas

  const { error } = await supabaseAdmin.from("gps_configuracion").upsert(
    {
      camion_id,
      setup_token: setupToken,
      token_expira: expira.toISOString(),
    },
    { onConflict: "camion_id", ignoreDuplicates: false }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: setupToken });
}
