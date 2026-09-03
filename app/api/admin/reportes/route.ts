import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { TipoDocumento } from "@/lib/tipos";
import { calcularUtilidadDiariaPromedio } from "@/lib/paralizaciones";

export const dynamic = "force-dynamic";

const UMBRAL_PROXIMO_KM = 500;
const UMBRAL_PROXIMO_DIAS = 30;
const UMBRAL_CXC_PROXIMO_DIAS = 15;
const UMBRAL_CXC_VENCIDO_DIAS = 30;

async function calcularKmActual(camion: {
  id: string;
  km_base: number | null;
  km_por_litro: number | null;
  precio_gasoleo_litro: number | null;
}) {
  const { data: turnos } = await supabaseAdmin.from("turnos").select("id").eq("camion_id", camion.id);
  const turnoIds = (turnos ?? []).map((t) => t.id);

  let montoGasoleoTotal = 0;
  if (turnoIds.length > 0) {
    const { data: movimientos } = await supabaseAdmin
      .from("movimientos")
      .select("monto")
      .eq("tipo", "compra_gasoleo")
      .in("turno_id", turnoIds);
    montoGasoleoTotal = (movimientos ?? []).reduce((acc, m) => acc + (m.monto ?? 0), 0);
  }

  const kmBase = camion.km_base ?? 0;
  const kmPorLitro = camion.km_por_litro ?? 0;
  const precioLitro = camion.precio_gasoleo_litro ?? 0;
  const litrosEstimados = precioLitro > 0 ? montoGasoleoTotal / precioLitro : 0;

  return kmBase + litrosEstimados * kmPorLitro;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let queryCamiones = supabaseAdmin.from("camiones").select("*");
  if (sesion.empresa_id) {
    queryCamiones = queryCamiones.eq("empresa_id", sesion.empresa_id);
  }
  const { data: camiones } = await queryCamiones;

  const alertasMantenimiento = [];
  const alertasDocumentos = [];

  for (const camion of camiones ?? []) {
    const kmActual = await calcularKmActual(camion);

    const { data: intervalos } = await supabaseAdmin
      .from("intervalos_mantenimiento")
      .select("*")
      .eq("camion_id", camion.id);

    for (const intervalo of intervalos ?? []) {
      const { data: ultimo } = await supabaseAdmin
        .from("mantenimientos")
        .select("km")
        .eq("camion_id", camion.id)
        .eq("tipo", intervalo.tipo)
        .not("km", "is", null)
        .order("km", { ascending: false })
        .limit(1)
        .maybeSingle();

      const kmUltimo = ultimo?.km ?? 0;
      const kmProximo = kmUltimo + intervalo.intervalo_km;
      const kmFaltantes = kmProximo - kmActual;

      let estado: "ok" | "proximo" | "vencido" = "ok";
      if (kmFaltantes <= 0) estado = "vencido";
      else if (kmFaltantes <= UMBRAL_PROXIMO_KM) estado = "proximo";

      if (estado !== "ok") {
        alertasMantenimiento.push({
          camion_id: camion.id,
          camion_nombre: camion.nombre,
          camion_matricula: camion.matricula,
          tipo: intervalo.tipo,
          intervalo_km: intervalo.intervalo_km,
          km_ultimo_mantenimiento: ultimo?.km ?? null,
          km_proximo: kmProximo,
          km_faltantes: kmFaltantes,
          estado,
        });
      }
    }

    const { data: documentos } = await supabaseAdmin
      .from("documentos_vehiculo")
      .select("*")
      .eq("camion_id", camion.id)
      .order("fecha_caducidad", { ascending: false });

    const tiposDocumento: TipoDocumento[] = ["seguro", "inspeccion_tecnica", "carta_alquiler"];
    for (const tipoDoc of tiposDocumento) {
      const vigente = (documentos ?? []).find((d) => d.tipo === tipoDoc);
      if (!vigente) continue;

      const hoy = new Date();
      const caducidad = new Date(vigente.fecha_caducidad);
      const diasRestantes = Math.round((caducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      let estado: "ok" | "proximo" | "vencido" = "ok";
      if (diasRestantes <= 0) estado = "vencido";
      else if (diasRestantes <= UMBRAL_PROXIMO_DIAS) estado = "proximo";

      if (estado !== "ok") {
        alertasDocumentos.push({
          camion_id: camion.id,
          camion_nombre: camion.nombre,
          camion_matricula: camion.matricula,
          tipo: tipoDoc,
          fecha_caducidad: vigente.fecha_caducidad,
          dias_restantes: diasRestantes,
          estado,
        });
      }
    }
  }

  const orden = { vencido: 0, proximo: 1, ok: 2 };
  alertasMantenimiento.sort((a, b) => orden[a.estado] - orden[b.estado]);
  alertasDocumentos.sort((a, b) => orden[a.estado] - orden[b.estado]);

  // --- Paralizaciones activas: cuánto representa cada una en utilidad no
  // generada, usando el promedio diario de los últimos 30 días de ese camión ---
  const alertasParalizaciones = [];
  for (const camion of camiones ?? []) {
    const { data: paralizacionesActivas } = await supabaseAdmin
      .from("paralizaciones")
      .select("*")
      .eq("camion_id", camion.id)
      .is("fecha_fin", null);

    for (const p of paralizacionesActivas ?? []) {
      const hoy = new Date();
      const inicio = new Date(p.fecha_inicio);
      const diasParado = Math.max(1, Math.round((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
      const utilidadDiariaPromedio = await calcularUtilidadDiariaPromedio(camion.id);
      const costoEstimado = diasParado * utilidadDiariaPromedio;

      alertasParalizaciones.push({
        id: p.id,
        camion_id: camion.id,
        camion_nombre: camion.nombre,
        camion_matricula: camion.matricula,
        motivo: p.motivo,
        fecha_inicio: p.fecha_inicio,
        diasParado,
        utilidadDiariaPromedio,
        costoEstimado,
      });
    }
  }

  alertasParalizaciones.sort((a, b) => b.diasParado - a.diasParado);

  // --- Cuentas por cobrar envejecidas ---
  const camionIds = (camiones ?? []).map((c) => c.id);
  const { data: cuentasPendientes } =
    camionIds.length > 0
      ? await supabaseAdmin
          .from("cuentas_por_cobrar")
          .select("*, camion:camiones(nombre, matricula)")
          .eq("estado", "pendiente")
          .in("camion_id", camionIds)
      : { data: [] };

  const hoy = new Date();
  const alertasCuentasPorCobrar = [];
  for (const cuenta of cuentasPendientes ?? []) {
    const fechaVenta = new Date(cuenta.fecha_venta);
    const diasAntiguedad = Math.round((hoy.getTime() - fechaVenta.getTime()) / (1000 * 60 * 60 * 24));

    if (diasAntiguedad >= UMBRAL_CXC_PROXIMO_DIAS) {
      alertasCuentasPorCobrar.push({
        id: cuenta.id,
        cliente_nombre: cuenta.cliente_nombre,
        cliente_telefono: cuenta.cliente_telefono,
        monto: cuenta.monto,
        fecha_venta: cuenta.fecha_venta,
        dias_antiguedad: diasAntiguedad,
        camion_nombre: cuenta.camion?.nombre ?? null,
        camion_matricula: cuenta.camion?.matricula ?? null,
        estado: diasAntiguedad >= UMBRAL_CXC_VENCIDO_DIAS ? "vencido" : "proximo",
      });
    }
  }

  alertasCuentasPorCobrar.sort((a, b) => b.dias_antiguedad - a.dias_antiguedad);

  // --- Fondo de cobertura (Provisión de Fondos) ---
  const { data: provisiones } =
    camionIds.length > 0
      ? await supabaseAdmin.from("provision_fondos").select("camion_id, datos").in("camion_id", camionIds)
      : { data: [] };
  const provisionPorCamion = new Map((provisiones ?? []).map((p) => [p.camion_id, p.datos]));

  const alertasProvisionFondos = (camiones ?? [])
    .filter((c) => {
      const datos = provisionPorCamion.get(c.id);
      return !datos || Object.keys(datos).length === 0;
    })
    .map((c) => ({
      camion_id: c.id,
      camion_nombre: c.nombre,
      camion_matricula: c.matricula,
    }));

  const hoyStr = new Date().toISOString().slice(0, 10);
  const { data: creditosHoy } =
    camionIds.length > 0
      ? await supabaseAdmin
          .from("mayor_provision")
          .select("camion_id")
          .eq("fecha", hoyStr)
          .eq("tipo", "credito")
          .in("camion_id", camionIds)
      : { data: [] };

  const camionesConCreditoHoy = new Set((creditosHoy ?? []).map((c) => c.camion_id));

  const alertasProvisionSinAcreditar = (camiones ?? [])
    .filter((c) => {
      const datos = provisionPorCamion.get(c.id);
      const tieneConfig = datos && Object.keys(datos).length > 0;
      return tieneConfig && !camionesConCreditoHoy.has(c.id);
    })
    .map((c) => ({
      camion_id: c.id,
      camion_nombre: c.nombre,
      camion_matricula: c.matricula,
    }));

  // --- Insumos que van a faltar para mantenimientos próximos/vencidos,
  // según la "carta de mantenimiento previa" (mantenimiento_bom) ---
  let queryBom = supabaseAdmin.from("mantenimiento_bom").select("*, producto:productos(nombre, unidad, stock_actual)");
  if (sesion.empresa_id) {
    queryBom = queryBom.eq("empresa_id", sesion.empresa_id);
  }
  const { data: bom } = await queryBom;

  const alertasInsumosFaltantes: {
    camion_id: string;
    camion_nombre: string;
    camion_matricula: string;
    tipo: string;
    producto_nombre: string;
    unidad: string | null;
    cantidad_necesaria: number;
    stock_actual: number;
    faltante: number;
  }[] = [];

  for (const alerta of alertasMantenimiento) {
    const requeridos = (bom ?? []).filter((b) => b.tipo === alerta.tipo);
    for (const req of requeridos) {
      const stockActual = req.producto?.stock_actual ?? 0;
      if (stockActual < req.cantidad_necesaria) {
        alertasInsumosFaltantes.push({
          camion_id: alerta.camion_id,
          camion_nombre: alerta.camion_nombre,
          camion_matricula: alerta.camion_matricula,
          tipo: alerta.tipo,
          producto_nombre: req.producto?.nombre ?? "Producto",
          unidad: req.producto?.unidad ?? null,
          cantidad_necesaria: req.cantidad_necesaria,
          stock_actual: stockActual,
          faltante: req.cantidad_necesaria - stockActual,
        });
      }
    }
  }

  return NextResponse.json({
    alertasMantenimiento,
    alertasDocumentos,
    alertasCuentasPorCobrar,
    alertasParalizaciones,
    alertasProvisionFondos,
    alertasProvisionSinAcreditar,
    alertasInsumosFaltantes,
  });
}
