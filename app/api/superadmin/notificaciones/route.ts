// app/api/superadmin/notificaciones/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verificarSesionSuperadmin } from "@/lib/superadmin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("notificaciones")
    .select("*, empresas(*)")
    .eq("enviado", false)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notificaciones: data });
}

export async function PATCH(req: NextRequest) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json();

  const { error } = await supabaseAdmin
    .from("notificaciones")
    .update({ enviado: true })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
