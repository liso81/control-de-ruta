// lib/superadmin-auth.ts
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;
export const SUPERADMIN_COOKIE = "superadmin_session";

function obtenerClave() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function verificarSesionSuperadmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SUPERADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, obtenerClave());
    return payload.rol === "superadmin";
  } catch {
    return false;
  }
}
