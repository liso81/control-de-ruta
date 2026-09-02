import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "admin_session";
const MAX_AGE_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

function obtenerClave() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function crearSesion(username: string, empresa_id: string | null) {
  const token = await new SignJWT({ username, empresa_id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEGUNDOS}s`)
    .sign(obtenerClave());

  return token;
}

export async function verificarSesion(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, obtenerClave());
    return payload as { username: string; empresa_id: string | null };
  } catch {
    return null;
  }
}

export const NOMBRE_COOKIE = COOKIE_NAME;
export const MAX_AGE = MAX_AGE_SEGUNDOS;
