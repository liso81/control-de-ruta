import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DIAS_VENTANA = 30;

async function requiereSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  return verificarSesion(token);
}

// Calcula la utilidad diaria promedio de un camión mirando SOLO los
// últimos 30 días, dividiendo por los días que realmente tuvo turno
// (no por días de calendario), para que el promedio refleje el ritmo
// real de trabajo del camión.
export async function calcularUtilidadDiariaPromedio(camion_id: string): Promise<number> {
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - DIAS_VENTANA);
  const hace30Str = hace30.toISOString().slice(0, 10);
  const hace30Timestamp = `${hace30Str}T00:00:00.000Z`;

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

export async function GET(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const camion_id = searchParams.get("camion_id");

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const { data: paralizaciones, error } = await supabaseAdmin
    .from("paralizaciones")
    .select("*")
    .eq("camion_id", camion_id)
    .order("fecha_inicio", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const utilidadDiariaPromedio = await calcularUtilidadDiariaPromedio(camion_id);

  return NextResponse.json({ paralizaciones, utilidadDiariaPromedio });
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { camion_id, motivo, fecha_inicio, notas } = body;

  if (!camion_id || !motivo) {
    return NextResponse.json({ error: "Faltan camion_id o motivo" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("paralizaciones")
    .insert({
      camion_id,
      motivo,
      fecha_inicio: fecha_inicio || new Date().toISOString().slice(0, 10),
      notas: notas ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ paralizacion: data });
}
