import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const camionId = searchParams.get("camion_id");

  // Si ya sabemos el ID exacto (dispositivo ya vinculado a un camión),
  // devolvemos solo ese camión. No es un listado completo, así que no hay
  // riesgo de mezclar empresas.
  if (camionId) {
    const { data, error } = await supabaseAdmin.from("camiones").select("*").eq("id", camionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ camiones: data });
  }

  const { count: totalEmpresas } = await supabaseAdmin
    .from("empresas")
    .select("id", { count: "exact", head: true });

  // Mientras exista una sola empresa en todo el sistema, este endpoint
  // sigue funcionando exactamente igual que antes (sin fricción para vos).
  // Si ya hay más de una empresa, hay que pasar por el link de invitación
  // de cada empresa (/unirse/[token]) en vez de listar todos los camiones.
  if ((totalEmpresas ?? 0) > 1) {
    return NextResponse.json(
      { error: "Usá el link de invitación de tu empresa para vincular este teléfono.", camiones: [] },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.from("camiones").select("*").order("nombre");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ camiones: data });
}
