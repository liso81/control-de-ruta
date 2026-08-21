import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { crearSesion, NOMBRE_COOKIE, MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Faltan usuario o contraseña" }, { status: 400 });
  }

  const { data: admin, error } = await supabaseAdmin
    .from("admins")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error || !admin) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const coincide = await bcrypt.compare(password, admin.password_hash);
  if (!coincide) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await crearSesion(admin.username);

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });

  return respuesta;
}
