import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const { cuenta_origen_id, cuenta_destino_id, monto, descripcion, fecha } = body;

  if (!cuenta_origen_id || !cuenta_destino_id || !monto || monto <= 0) {
    return NextResponse.json({ error: "Faltan datos o el monto no es valido" }, { status: 400 });
  }
  if (cuenta_origen_id === cuenta_destino_id) {
    return NextResponse.json({ error: "La cuenta de origen y destino no pueden ser la misma" }, { status: 400 });
  }

  const grupoId = randomUUID();
  const fechaMovimiento = fecha || new Date().toISOString().slice(0, 10);

  const { error } = await supabaseAdmin.from("mb_movimientos").insert([
    {
      cuenta_id: cuenta_origen_id,
      tipo: "transferencia",
      monto: -Math.abs(monto),
      descripcion: descripcion || "Transferencia entre cuentas",
      fecha: fechaMovimiento,
      transferencia_grupo_id: grupoId,
    },
    {
      cuenta_id: cuenta_destino_id,
      tipo: "transferencia",
      monto: Math.abs(monto),
      descripcion: descripcion || "Transferencia entre cuentas",
      fecha: fechaMovimiento,
      transferencia_grupo_id: grupoId,
    },
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, transferencia_grupo_id: grupoId });
}
