// lib/paralizaciones.ts
import { supabaseAdmin } from "@/lib/supabase";

const DIAS_VENTANA = 30;

export async function calcularUtilidadDiariaPromedio(camion_id: string): Promise<number> {
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - DIAS_VENTANA);
  const hace30Str = hace30.toISOString().slice(0, 10);

  const { data: turnos } = await supabaseAdmin
    .from("turnos")
    .select("id, fecha")
    .eq("camion_id", camion_id)
    .gte("fecha", hace30Str);

  const turnoIds = (turnos ?? []).map((t) => t.id);
  const diasOperados = new Set((turnos ?? []).map((t) => t.fecha)).size;

  if (turnoIds.length === 0 || diasOperados === 0) return 0;

  const { data: movimientos } = await supabaseAdmin
    .from("movimientos")
    .select("tipo, efectivo, transferencia, monto")
    .in("turno_id", turnoIds);

  const ingresosEfectivo = (movimientos ?? [])
    .filter((m) => m.tipo === "venta")
    .reduce((acc, m) => acc + (m.efectivo ?? 0) + (m.transferencia ?? 0), 0);
  const gastosChofer = (movimientos ?? [])
    .filter((m) => m.tipo === "gasto")
    .reduce((acc, m) => acc + (m.monto ?? 0), 0);

  const { data: cxc } = await supabaseAdmin
    .from("cuentas_por_cobrar")
    .select("monto")
    .eq("camion_id", camion_id)
    .eq("estado", "cobrado")
    .gte("fecha_cobro", hace30Str);
  const ingresosCxc = (cxc ?? []).reduce((acc, c) => acc + c.monto, 0);

  const { data: finanzas } = await supabaseAdmin
    .from("finanzas_movimientos")
    .select("tipo, monto")
    .eq("camion_id", camion_id)
    .in("tipo", ["gasto_servicio_tercero", "gasto_otro"])
    .gte("fecha", hace30Str);
  const gastosOtros = (finanzas ?? []).reduce((acc, f) => acc + f.monto, 0);

  const ingresos = ingresosEfectivo + ingresosCxc;
  const gastos = gastosChofer + gastosOtros;
  const utilidad = ingresos - gastos;

  return utilidad / diasOperados;
}
