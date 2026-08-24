import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function requiereSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  return verificarSesion(token);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { nombre, capacidad_litros, matricula, marca, km_por_litro, km_base, precio_gasoleo_litro } = body;

  const { data: original, error: errorOriginal } = await supabaseAdmin
    .from("camiones")
    .select("capacidad_litros, litros_actual")
    .eq("id", id)
    .single();

  if (errorOriginal || !original) {
    return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 });
  }

  const cambios: Record<string, unknown> = {};
  if (nombre !== undefined) cambios.nombre = nombre;
  if (matricula !== undefined) cambios.matricula = matricula;
  if (marca !== undefined) cambios.marca = marca;
  if (km_por_litro !== undefined) cambios.km_por_litro = km_por_litro;
  if (km_base !== undefined) cambios.km_base = km_base;
  if (precio_gasoleo_litro !== undefined) cambios.precio_gasoleo_litro = precio_gasoleo_litro;

  // Si cambia la capacidad, ajustamos la existencia actual por la misma
  // diferencia (delta), y la topeamos para que nunca supere la nueva
  // capacidad ni baje de 0.
  if (capacidad_litros !== undefined && capacidad_litros !== original.capacidad_litros) {
    const delta = capacidad_litros - original.capacidad_litros;
    const nuevaExistencia = Math.min(
      capacidad_litros,
      Math.max(0, original.litros_actual + delta)
    );
    cambios.capacidad_litros = capacidad_litros;
    cambios.litros_actual = nuevaExistencia;
  }

  const { data, error } = await supabaseAdmin
    .from("camiones")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ camion: data });
}
