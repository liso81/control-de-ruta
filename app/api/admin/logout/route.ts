import { NextResponse } from "next/server";
import { NOMBRE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(NOMBRE_COOKIE, "", { path: "/", maxAge: 0 });
  return respuesta;
}
