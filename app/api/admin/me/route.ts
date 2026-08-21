import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);

  if (!sesion) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, username: sesion.username });
}
