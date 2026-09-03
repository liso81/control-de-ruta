import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { PasoFlujoCaja } from "@/lib/tipos";

export const dynamic = "force-dynamic";

async function calcularPaso(soloHoy: boolean, empresaId: string | null): Promise<PasoFlujoCaja> {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioHoy = `${hoy}T00:00:00.000Z`;
  const finHoy = `${hoy}T23:59:59.999Z`;

  // Camiones y turnos de esta empresa (para poder filtrar "movimientos",
  // que no tiene empresa_id directo, solo turno_id -> camion_id).
  let queryCamiones = supabaseAdmin.from("camiones").select("id");
  if (empresaId) queryCamiones = queryCamiones.eq("empresa_id", empresaId);
  const { data: camionesEmpresa } = await queryCamiones;
  const camionIds = (camionesEmpresa ?? []).map((c) => c.id);

  const { data: turnosEmpresa } =
    camionIds.length > 0 ? await supabaseAdmin.from("turnos").select("id").in("camion_id", camionIds) : { data: [] };
  const turnoIds = (turnosEmpresa ?? []).map((t) => t.id);

  // --- Finanzas: capital, gastos de insumos/servicios/otros, fondo extraído ---
  let queryFinanzas = supabaseAdmin.from("finanzas_movimientos").select("tipo, monto");
  if (empresaId) queryFinanzas = queryFinanzas.eq("empresa_id", empresaId);
  if (soloHoy) queryFinanzas = queryFinanzas.eq("fecha", hoy);
  const { data: finanzas } = await queryFinanzas;

  const sumaPorTipo = (t: string) => (finanzas ?? []).filter((f) => f.tipo === t).reduce((acc, f) => acc + f.monto, 0);

  const capitalInyectado = sumaPorTipo("capital_inyectado");
  const gastosInsumos = sumaPorTipo("gasto_insumo");
  const gastosServiciosTerceros = sumaPorTipo("gasto_servicio_tercero");
  const gastosOtros = sumaPorTipo("gasto_otro");
  const fondoExtraido = sumaPorTipo("fondo_extraido");

  // --- Movimientos de choferes: ventas (efectivo+transferencia) y gastos ---
  let queryMovs = supabaseAdmin.from("movimientos").select("tipo, efectivo, transferencia, monto, created_at, turno_id");
  if (turnoIds.length > 0) queryMovs = queryMovs.in("turno_id", turnoIds);
  else if (empresaId) queryMovs = queryMovs.eq("turno_id", "___ninguno___"); // empresa sin camiones/turnos: no trae nada
  if (soloHoy) queryMovs = queryMovs.gte("created_at", inicioHoy).lte("created_at", finHoy);
  const { data: movs } = await queryMovs;

  const ingresosEfectivoTransferencia = (movs ?? [])
    .filter((m) => m.tipo === "venta")
    .reduce((acc, m) => acc + (m.efectivo ?? 0) + (m.transferencia ?? 0), 0);

  const gastosChofer = (movs ?? []).filter((m) => m.tipo === "gasto").reduce((acc, m) => acc + (m.monto ?? 0), 0);

  // --- Cuentas por cobrar cobradas ---
  let queryCxc = supabaseAdmin.from("cuentas_por_cobrar").select("monto, fecha_cobro, camion_id").eq("estado", "cobrado");
  if (camionIds.length > 0) queryCxc = queryCxc.in("camion_id", camionIds);
  else if (empresaId) queryCxc = queryCxc.eq("camion_id", "___ninguno___");
  if (soloHoy) queryCxc = queryCxc.eq("fecha_cobro", hoy);
  const { data: cxc } = await queryCxc;
  const ingresosCuentasCobradas = (cxc ?? []).reduce((acc, c) => acc + c.monto, 0);

  // --- Provisión: para "hoy" es el movimiento neto del día; para el
  // acumulado es el saldo total (crédito - débito) de todos los tiempos ---
  let queryProvision = supabaseAdmin.from("mayor_provision").select("tipo, monto, fecha, camion_id");
  if (camionIds.length > 0) queryProvision = queryProvision.in("camion_id", camionIds);
  else if (empresaId) queryProvision = queryProvision.eq("camion_id", "___ninguno___");
  if (soloHoy) queryProvision = queryProvision.eq("fecha", hoy);
  const { data: provisionEntradas } = await queryProvision;

  const creditos = (provisionEntradas ?? []).filter((p) => p.tipo === "credito").reduce((acc, p) => acc + p.monto, 0);
  const debitos = (provisionEntradas ?? []).filter((p) => p.tipo === "debito").reduce((acc, p) => acc + p.monto, 0);
  const provision = creditos - debitos;

  const ingresosTotal = ingresosEfectivoTransferencia + ingresosCuentasCobradas;
  const gastosTotal = gastosInsumos + gastosServiciosTerceros + gastosOtros + gastosChofer;
  const utilidadBruta = ingresosTotal - gastosTotal;
  const utilidadReal = utilidadBruta - provision;
  const efectivoAOperar = capitalInyectado + utilidadReal;
  const efectivoRealAOperar = efectivoAOperar - fondoExtraido;

  return {
    capitalInyectado,
    ingresosEfectivoTransferencia,
    ingresosCuentasCobradas,
    ingresosTotal,
    gastosInsumos,
    gastosServiciosTerceros,
    gastosOtros,
    gastosChofer,
    gastosTotal,
    utilidadBruta,
    provision,
    utilidadReal,
    efectivoAOperar,
    fondoExtraido,
    efectivoRealAOperar,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [diario, acumulado] = await Promise.all([
    calcularPaso(true, sesion.empresa_id ?? null),
    calcularPaso(false, sesion.empresa_id ?? null),
  ]);

  return NextResponse.json({ diario, acumulado });
}
