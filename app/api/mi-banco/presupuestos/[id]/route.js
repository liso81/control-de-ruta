import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";

export async function DELETE(request, { params }) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("mb_presupuestos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
