import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const UMBRAL_PROXIMO_KM = 500;

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const camion_id = searchParams.get("camion_id");
  const km_actual_param = searchParams.get("km_actual");

  if (!camion_id || km_actual_param === null) {
    return NextResponse.json({ error: "Faltan camion_id o km_actual" }, { status: 400 });
  }

  const kmActual = parseFloat(km_actual_param);

  const { data: intervalos, error: errorIntervalos } = await supabaseAdmin
    .from("intervalos_mantenimiento")
    .select("*")
    .eq("camion_id", camion_id);

  if (errorIntervalos) {
    return NextResponse.json({ error: errorIntervalos.message }, { status: 500 });
  }

  const alertas = [];

  for (const intervalo of intervalos ?? []) {
    const { data: ultimoMantenimiento } = await supabaseAdmin
      .from("mantenimientos")
      .select("km")
      .eq("camion_id", camion_id)
      .eq("tipo", intervalo.tipo)
      .not("km", "is", null)
      .order("km", { ascending: false })
      .limit(1)
      .maybeSingle();

    const kmUltimo = ultimoMantenimiento?.km ?? 0;
    const kmProximo = kmUltimo + intervalo.intervalo_km;
    const kmFaltantes = kmProximo - kmActual;

    let estado: "ok" | "proximo" | "vencido" = "ok";
    if (kmFaltantes <= 0) estado = "vencido";
    else if (kmFaltantes <= UMBRAL_PROXIMO_KM) estado = "proximo";

    alertas.push({
      tipo: intervalo.tipo,
      intervalo_km: intervalo.intervalo_km,
      km_ultimo_mantenimiento: ultimoMantenimiento?.km ?? null,
      km_proximo: kmProximo,
      km_faltantes: kmFaltantes,
      estado,
    });
  }

  // Vencidos primero, luego próximos, luego ok
  const orden = { vencido: 0, proximo: 1, ok: 2 };
  alertas.sort((a, b) => orden[a.estado] - orden[b.estado]);

  return NextResponse.json({ alertas });
}
