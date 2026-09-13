import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";

export async function DELETE(request, { params }) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  // Si es una pata de una transferencia, borramos las dos juntas.
  const { data: movimiento } = await supabaseAdmin
    .from("mb_movimientos")
    .select("transferencia_grupo_id")
    .eq("id", id)
    .maybeSingle();

  if (movimiento?.transferencia_grupo_id) {
    const { error } = await supabaseAdmin
      .from("mb_movimientos")
      .delete()
      .eq("transferencia_grupo_id", movimiento.transferencia_grupo_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin.from("mb_movimientos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
