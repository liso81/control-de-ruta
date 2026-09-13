import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";
import { obtenerCuentasConSaldo } from "@/lib/mi-banco/db";

export const dynamic = "force-dynamic";

async function autenticado(request) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  return !!sesion;
}

export async function GET(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: metas, error } = await supabaseAdmin.from("mb_metas").select("*").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cuentas = await obtenerCuentasConSaldo();
  const saldoPorCuenta = new Map(cuentas.map((c) => [c.id, c.saldo]));

  const resultado = (metas ?? []).map((m) => ({
    ...m,
    monto_actual: m.cuenta_id ? saldoPorCuenta.get(m.cuenta_id) ?? 0 : Number(m.monto_actual_manual),
  }));

  return NextResponse.json(resultado);
}

export async function POST(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, monto_objetivo, cuenta_id, fecha_objetivo, icono, color } = body;

  if (!nombre || !monto_objetivo || monto_objetivo <= 0) {
    return NextResponse.json({ error: "Faltan datos o el monto objetivo no es valido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("mb_metas")
    .insert({
      nombre,
      monto_objetivo,
      cuenta_id: cuenta_id || null,
      fecha_objetivo: fecha_objetivo || null,
      icono: icono || "🎯",
      color: color || "#0ea5e9",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
