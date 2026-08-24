import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const { data: camion, error: errorCamion } = await supabaseAdmin
    .from("camiones")
    .select("km_base, km_por_litro, precio_gasoleo_litro")
    .eq("id", id)
    .single();

  if (errorCamion || !camion) {
    return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 });
  }

  // El chofer solo carga el MONTO gastado en gasóleo (no litros). Para
  // estimar litros, dividimos ese monto por el precio por litro configurado
  // acá. Con eso, multiplicado por el rendimiento (km/L), estimamos el
  // kilometraje recorrido.
  const { data: turnos } = await supabaseAdmin.from("turnos").select("id").eq("camion_id", id);
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

  const litrosGasoleoEstimados = precioLitro > 0 ? montoGasoleoTotal / precioLitro : 0;
  const kmEstimadoRecorrido = litrosGasoleoEstimados * kmPorLitro;
  const kmActual = kmBase + kmEstimadoRecorrido;

  return NextResponse.json({
    km_base: kmBase,
    monto_gasoleo_total: montoGasoleoTotal,
    litros_gasoleo_estimados: litrosGasoleoEstimados,
    km_por_litro: kmPorLitro,
    precio_gasoleo_litro: precioLitro,
    km_actual: kmActual,
    falta_precio_configurado: precioLitro <= 0,
  });
}
