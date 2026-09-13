import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { crearSesion, NOMBRE_COOKIE, MAX_AGE } from "@/lib/mi-banco/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Faltan usuario o contrasena" }, { status: 400 });
  }

  const { data: usuario, error } = await supabaseAdmin
    .from("mb_usuarios")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error || !usuario) {
    return NextResponse.json({ error: "Usuario o contrasena incorrectos" }, { status: 401 });
  }

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) {
    return NextResponse.json({ error: "Usuario o contrasena incorrectos" }, { status: 401 });
  }

  const token = await crearSesion(usuario.username);

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
