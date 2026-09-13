import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";
import { obtenerCuentasConSaldo, obtenerGastadoPorCategoria, primerYUltimoDiaDelMes } from "@/lib/mi-banco/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuentas = await obtenerCuentasConSaldo();
  const balanceTotal = cuentas.filter((c) => c.tipo === "cuenta").reduce((acc, c) => acc + c.saldo, 0);

  const { desde, hasta } = primerYUltimoDiaDelMes();
  const gastadoPorCategoriaMap = await obtenerGastadoPorCategoria(desde, hasta);

  const { data: categorias } = await supabaseAdmin.from("mb_categorias").select("id, nombre, icono, color");
  const categoriaPorId = new Map((categorias ?? []).map((c) => [c.id, c]));

  const gastoPorCategoria = Array.from(gastadoPorCategoriaMap.entries())
    .map(([categoria_id, total]) => ({
      categoria_id,
      nombre: categoriaPorId.get(categoria_id)?.nombre ?? "Sin categoria",
      color: categoriaPorId.get(categoria_id)?.color ?? "#6b7280",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // Evolucion de los ultimos 6 meses (ingresos vs gastos).
  const hoy = new Date();
  const inicioRango = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 5, 1));
  const { data: movimientosRango } = await supabaseAdmin
    .from("mb_movimientos")
    .select("tipo, monto, fecha")
    .in("tipo", ["ingreso", "gasto"])
    .gte("fecha", inicioRango.toISOString().slice(0, 10));

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    meses.push({ clave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, ingresos: 0, gastos: 0 });
  }
  const mesPorClave = new Map(meses.map((m) => [m.clave, m]));

  for (const mov of movimientosRango ?? []) {
    const clave = mov.fecha.slice(0, 7);
    const bucket = mesPorClave.get(clave);
    if (!bucket) continue;
    if (mov.tipo === "ingreso") bucket.ingresos += Number(mov.monto);
    else bucket.gastos += Math.abs(Number(mov.monto));
  }

  return NextResponse.json({
    balanceTotal,
    cuentas,
    gastoPorCategoria,
    evolucionMensual: meses,
  });
}
