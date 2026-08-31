// app/api/superadmin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { SUPERADMIN_COOKIE } from "@/lib/superadmin-auth";

const JWT_SECRET = process.env.JWT_SECRET!;
const MAX_AGE_SEGUNDOS = 60 * 60 * 12; // 12 horas

function obtenerClave() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function POST(req: NextRequest) {
  const { usuario, password } = await req.json();

  if (
    usuario !== process.env.SUPERADMIN_USER ||
    password !== process.env.SUPERADMIN_PASSWORD
  ) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = await new SignJWT({ rol: "superadmin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEGUNDOS}s`)
    .sign(obtenerClave());

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SUPERADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEGUNDOS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SUPERADMIN_COOKIE);
  return res;
}
