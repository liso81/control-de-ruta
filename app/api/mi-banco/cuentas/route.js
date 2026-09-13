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

  try {
    const cuentas = await obtenerCuentasConSaldo();
    return NextResponse.json(cuentas);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, tipo, icono, color, saldo_inicial, orden } = body;

  if (!nombre || !tipo || !["cuenta", "sobre"].includes(tipo)) {
    return NextResponse.json({ error: "Faltan datos o el tipo no es valido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("mb_cuentas")
    .insert({
      nombre,
      tipo,
      icono: icono || (tipo === "sobre" ? "🧧" : "💳"),
      color: color || "#4f46e5",
      saldo_inicial: saldo_inicial || 0,
      orden: orden ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
