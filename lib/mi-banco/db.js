// lib/mi-banco/db.js
// Helpers de calculo compartidos entre las rutas API y el bot de Telegram.
import { supabaseAdmin } from "@/lib/supabase";

// Trae todas las cuentas activas con su saldo actual calculado
// (saldo_inicial + suma de sus movimientos).
export async function obtenerCuentasConSaldo() {
  const { data: cuentas, error: errCuentas } = await supabaseAdmin
    .from("mb_cuentas")
    .select("*")
    .eq("activa", true)
    .order("orden", { ascending: true });

  if (errCuentas) throw errCuentas;

  const { data: sumas, error: errSumas } = await supabaseAdmin
    .from("mb_movimientos")
    .select("cuenta_id, monto");

  if (errSumas) throw errSumas;

  const totalesPorCuenta = new Map();
  for (const m of sumas ?? []) {
    totalesPorCuenta.set(m.cuenta_id, (totalesPorCuenta.get(m.cuenta_id) ?? 0) + Number(m.monto));
  }

  return (cuentas ?? []).map((c) => ({
    ...c,
    saldo: Number(c.saldo_inicial) + (totalesPorCuenta.get(c.id) ?? 0),
  }));
}

export function primerYUltimoDiaDelMes(fecha = new Date()) {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth();
  const primero = new Date(Date.UTC(anio, mes, 1));
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0));
  const aISO = (d) => d.toISOString().slice(0, 10);
  return { desde: aISO(primero), hasta: aISO(ultimo) };
}

// Total gastado (valor positivo) por categoria dentro de un rango de fechas.
export async function obtenerGastadoPorCategoria(desde, hasta) {
  const { data, error } = await supabaseAdmin
    .from("mb_movimientos")
    .select("categoria_id, monto")
    .eq("tipo", "gasto")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  if (error) throw error;

  const totales = new Map();
  for (const m of data ?? []) {
    if (!m.categoria_id) continue;
    totales.set(m.categoria_id, (totales.get(m.categoria_id) ?? 0) + Math.abs(Number(m.monto)));
  }
  return totales;
}
