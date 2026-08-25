import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { SUBMAYORES_PROVISION } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const camion_id = searchParams.get("camion_id");

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const { data: entradas, error } = await supabaseAdmin
    .from("mayor_provision")
    .select("*")
    .eq("camion_id", camion_id)
    .order("fecha", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const saldos = SUBMAYORES_PROVISION.map((submayor) => {
    const propias = (entradas ?? []).filter((e) => e.submayor === submayor);
    const creditos = propias.filter((e) => e.tipo === "credito").reduce((acc, e) => acc + e.monto, 0);
    const debitos = propias.filter((e) => e.tipo === "debito").reduce((acc, e) => acc + e.monto, 0);
    return { submayor, saldo: creditos - debitos };
  });

  const saldoTotal = saldos.reduce((acc, s) => acc + s.saldo, 0);

  return NextResponse.json({ saldos, saldoTotal, entradas: entradas ?? [] });
}
