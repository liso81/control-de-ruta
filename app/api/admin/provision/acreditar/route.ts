import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { DatosProvisionFondos, Submayor } from "@/lib/tipos";

export const dynamic = "force-dynamic";

function numero(v: string | undefined): number {
  const n = parseFloat(v ?? "");
  return isNaN(n) ? 0 : n;
}

function divisionSegura(numerador: number, ...divisores: number[]): number {
  for (const d of divisores) {
    if (!d) return 0;
  }
  let resultado = numerador;
  for (const d of divisores) resultado = resultado / d;
  return resultado;
}

function calcularMontosDiarios(datos: DatosProvisionFondos): Record<Submayor, number> {
  const a = numero(datos.diasTrabajoMes);
  const b = numero(datos.posiblesViajes);
  const c = numero(datos.promedioKm);

  const d = numero(datos.valorVehiculo);
  const e = numero(datos.vidaUtilVehiculo);
  const f = numero(datos.valorNeumaticos);
  const g = numero(datos.vidaUtilNeumaticos);
  const h = numero(datos.valorBaterias);
  const i = numero(datos.vidaUtilBaterias);
  const j = numero(datos.valorInspeccion);
  const k = numero(datos.vidaUtilInspeccion);
  const l = numero(datos.valorSeguro);
  const m = numero(datos.vidaUtilSeguro);
  const n = numero(datos.valorCartaAlquiler);
  const o = numero(datos.vidaUtilCartaAlquiler);

  const p = numero(datos.valorAceite);
  const q = numero(datos.capacidadEnvase);
  const r = numero(datos.capacidadMotor);
  const s = numero(datos.kmCambioAceite);
  const t = numero(datos.valorFiltro);
  const u = numero(datos.valorOtroMaterial);

  const chapisteria = numero(datos.valorChapisteria);
  const pintura = numero(datos.valorPintura);
  const arreglosMotor = numero(datos.valorArreglosMotor);
  const otrasRoturas = numero(datos.valorOtrasRoturas);

  const costoAceitePorCambio = q ? (p / q) * r : 0;

  return {
    vehiculo: divisionSegura(d, e, 12, a),
    neumaticos: divisionSegura(f, g, a),
    baterias: divisionSegura(h, i, a),
    inspeccion: divisionSegura(j, k, a),
    seguro: divisionSegura(l, m, a),
    carta_alquiler: divisionSegura(n, o, a),
    aceite: s ? divisionSegura(costoAceitePorCambio, s) * b * c : 0,
    filtros: s ? divisionSegura(t, s) * b * c : 0,
    otros_materiales: s ? divisionSegura(u, s) * b * c : 0,
    chapisteria: divisionSegura(chapisteria, 12, a),
    pintura: divisionSegura(pintura, 12, a),
    arreglos_motor: divisionSegura(arreglosMotor, 12, a),
    otras_roturas: divisionSegura(otrasRoturas, 12, a),
  };
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { camion_id } = body;

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const { data: provision, error: errorProvision } = await supabaseAdmin
    .from("provision_fondos")
    .select("datos")
    .eq("camion_id", camion_id)
    .maybeSingle();

  if (errorProvision) {
    return NextResponse.json({ error: errorProvision.message }, { status: 500 });
  }

  if (!provision || !provision.datos) {
    return NextResponse.json({ error: "No hay datos de provisión guardados para este camión" }, { status: 400 });
  }

  const montos = calcularMontosDiarios(provision.datos as DatosProvisionFondos);
  const hoy = new Date().toISOString().slice(0, 10);

  const entradas = Object.entries(montos)
    .filter(([, monto]) => monto > 0)
    .map(([submayor, monto]) => ({
      camion_id,
      submayor,
      fecha: hoy,
      tipo: "credito",
      monto,
      descripcion: "Provisión diaria",
    }));

  if (entradas.length === 0) {
    return NextResponse.json(
      { error: "Todos los montos calculados dieron 0. Revisá que los datos de Provisión estén completos." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("mayor_provision")
    .upsert(entradas, { onConflict: "camion_id,submayor,fecha,tipo" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entradas: entradas.length });
}
