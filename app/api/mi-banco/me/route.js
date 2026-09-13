import { NextResponse } from "next/server";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const token = request.cookies.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);

  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  return NextResponse.json({ username: sesion.username });
}
