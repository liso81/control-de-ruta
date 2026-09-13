import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";
import { obtenerGastadoPorCategoria, primerYUltimoDiaDelMes } from "@/lib/mi-banco/db";

export const dynamic = "force-dynamic";

async function autenticado(request) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  return !!sesion;
}

export async function GET(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: presupuestos, error } = await supabaseAdmin
    .from("mb_presupuestos")
    .select("*, categoria:mb_categorias(nombre, icono, color)");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { desde, hasta } = primerYUltimoDiaDelMes();
  const gastado = await obtenerGastadoPorCategoria(desde, hasta);

  const resultado = (presupuestos ?? []).map((p) => ({
    ...p,
    gastado_mes_actual: gastado.get(p.categoria_id) ?? 0,
  }));

  return NextResponse.json(resultado);
}

// Crea o actualiza (por categoria) el presupuesto mensual.
export async function PUT(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { categoria_id, monto_mensual } = body;

  if (!categoria_id || monto_mensual === undefined || monto_mensual < 0) {
    return NextResponse.json({ error: "Faltan datos o el monto no es valido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("mb_presupuestos")
    .upsert({ categoria_id, monto_mensual }, { onConflict: "categoria_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
