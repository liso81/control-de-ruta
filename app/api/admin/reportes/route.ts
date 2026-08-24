import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { TipoDocumento } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const UMBRAL_PROXIMO_KM = 500;
const UMBRAL_PROXIMO_DIAS = 30;

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

  const { data: camiones } = await supabaseAdmin.from("camiones").select("*");

  const alertasMantenimiento = [];
  const alertasDocumentos = [];

  for (const camion of camiones ?? []) {
    // --- Alertas de mantenimiento preventivo ---
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

    // --- Alertas de documentos (seguro, inspección, carta de alquiler) ---
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

  return NextResponse.json({ alertasMantenimiento, alertasDocumentos });
}
