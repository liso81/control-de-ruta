// lib/mi-banco/auth.js
// Sesion propia para el modulo de finanzas personales, separada del
// sistema de login de empresas/choferes (cookie y secreto distintos).
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.MB_JWT_SECRET || process.env.JWT_SECRET;
const COOKIE_NAME = "mb_session";
const MAX_AGE_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias

function obtenerClave() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function crearSesion(username) {
  return await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEGUNDOS}s`)
    .sign(obtenerClave());
}

export async function verificarSesion(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, obtenerClave());
    return payload;
  } catch {
    return null;
  }
}

export function requerirSesion(request) {
  const token = request.cookies.get(NOMBRE_COOKIE)?.value;
  return verificarSesion(token);
}

export const NOMBRE_COOKIE = COOKIE_NAME;
export const MAX_AGE = MAX_AGE_SEGUNDOS;
