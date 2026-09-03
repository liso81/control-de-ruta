import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DIAS_TENDENCIA = 30;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const empresaId = sesion.empresa_id ?? null;

  let queryCamiones = supabaseAdmin.from("camiones").select("id, nombre, matricula");
  if (empresaId) queryCamiones = queryCamiones.eq("empresa_id", empresaId);
  const { data: camiones } = await queryCamiones;
  const camionIds = (camiones ?? []).map((c) => c.id);

  const { data: turnos } =
    camionIds.length > 0
      ? await supabaseAdmin.from("turnos").select("id, camion_id").in("camion_id", camionIds)
      : { data: [] };
  const turnoIds = (turnos ?? []).map((t) => t.id);

  const { data: movimientos } =
    turnoIds.length > 0
      ? await supabaseAdmin
          .from("movimientos")
          .select("tipo, efectivo, transferencia, litros, monto, turno_id, created_at")
          .in("turno_id", turnoIds)
      : { data: [] };

  const { data: cxc } =
    camionIds.length > 0
      ? await supabaseAdmin
          .from("cuentas_por_cobrar")
          .select("monto, camion_id, estado, fecha_cobro")
          .eq("estado", "cobrado")
          .in("camion_id", camionIds)
      : { data: [] };

  let queryFinanzas = supabaseAdmin.from("finanzas_movimientos").select("tipo, monto, camion_id, fecha");
  if (empresaId) queryFinanzas = queryFinanzas.eq("empresa_id", empresaId);
  const { data: finanzas } = await queryFinanzas;

  const { data: provisionEntradas } =
    camionIds.length > 0
      ? await supabaseAdmin.from("mayor_provision").select("tipo, monto, fecha, camion_id").in("camion_id", camionIds)
      : { data: [] };

  const mapaTurnoCamion = new Map((turnos ?? []).map((t) => [t.id, t.camion_id]));

  // --- Comparativo por camión ---
  const comparativoPorCamion = (camiones ?? []).map((c) => {
    const turnosDeEsteCamion = new Set((turnos ?? []).filter((t) => t.camion_id === c.id).map((t) => t.id));

    const ventasCamion = (movimientos ?? []).filter((m) => m.tipo === "venta" && turnosDeEsteCamion.has(m.turno_id));
    const gastosChoferCamion = (movimientos ?? []).filter(
      (m) => m.tipo === "gasto" && turnosDeEsteCamion.has(m.turno_id)
    );

    const ingresosEfectivo = ventasCamion.reduce((acc, m) => acc + (m.efectivo ?? 0) + (m.transferencia ?? 0), 0);
    const ingresosCxc = (cxc ?? []).filter((x) => x.camion_id === c.id).reduce((acc, x) => acc + x.monto, 0);
    const ingresos = ingresosEfectivo + ingresosCxc;

    const gastosServiciosYOtros = (finanzas ?? [])
      .filter((f) => f.camion_id === c.id && (f.tipo === "gasto_servicio_tercero" || f.tipo === "gasto_otro"))
      .reduce((acc, f) => acc + f.monto, 0);
    const gastosChofer = gastosChoferCamion.reduce((acc, m) => acc + (m.monto ?? 0), 0);
    const gastos = gastosServiciosYOtros + gastosChofer;

    const litrosVendidos = ventasCamion.reduce((acc, m) => acc + (m.litros ?? 0), 0);
    const utilidad = ingresos - gastos;

    return {
      camion_id: c.id,
      camion_nombre: c.nombre,
      camion_matricula: c.matricula,
      ingresos,
      gastos,
      utilidad,
      litrosVendidos,
      utilidadPorLitro: litrosVendidos > 0 ? utilidad / litrosVendidos : 0,
    };
  });

  comparativoPorCamion.sort((a, b) => b.utilidadPorLitro - a.utilidadPorLitro);

  // --- Composición de gastos (acumulado histórico) ---
  const composicionGastos = {
    insumos: (finanzas ?? []).filter((f) => f.tipo === "gasto_insumo").reduce((acc, f) => acc + f.monto, 0),
    serviciosTerceros: (finanzas ?? [])
      .filter((f) => f.tipo === "gasto_servicio_tercero")
      .reduce((acc, f) => acc + f.monto, 0),
    otros: (finanzas ?? []).filter((f) => f.tipo === "gasto_otro").reduce((acc, f) => acc + f.monto, 0),
    gastosChofer: (movimientos ?? []).filter((m) => m.tipo === "gasto").reduce((acc, m) => acc + (m.monto ?? 0), 0),
  };

  // --- Tendencia acumulada (últimos 30 días) ---
  const hoy = new Date();
  const dias: string[] = [];
  for (let i = DIAS_TENDENCIA - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }

  let acumulado = 0;
  const tendencia = dias.map((fecha) => {
    const ingresosDia =
      (movimientos ?? [])
        .filter((m) => m.tipo === "venta" && m.created_at.slice(0, 10) === fecha)
        .reduce((acc, m) => acc + (m.efectivo ?? 0) + (m.transferencia ?? 0), 0) +
      (cxc ?? []).filter((x) => x.fecha_cobro === fecha).reduce((acc, x) => acc + x.monto, 0);

    const gastosDia =
      (movimientos ?? [])
        .filter((m) => m.tipo === "gasto" && m.created_at.slice(0, 10) === fecha)
        .reduce((acc, m) => acc + (m.monto ?? 0), 0) +
      (finanzas ?? [])
        .filter((f) => f.fecha === fecha && f.tipo !== "capital_inyectado" && f.tipo !== "fondo_extraido")
        .reduce((acc, f) => acc + f.monto, 0);

    const provisionDia = (provisionEntradas ?? [])
      .filter((p) => p.fecha === fecha)
      .reduce((acc, p) => acc + (p.tipo === "credito" ? p.monto : -p.monto), 0);

    const utilidadDia = ingresosDia - gastosDia - provisionDia;
    acumulado += utilidadDia;

    return { fecha, utilidadDia, utilidadAcumulada: acumulado };
  });

  return NextResponse.json({ comparativoPorCamion, tendencia, composicionGastos });
}
