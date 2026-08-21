import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    turno_id,
    camion_id,
    tipo,
    litros,
    precio_litro,
    monto,
    efectivo,
    transferencia,
    credito,
    categoria,
    cliente_nota,
    cliente_telefono,
  } = body;

  if (!turno_id || !tipo) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  if ((credito ?? 0) > 0 && (!cliente_nota || !cliente_telefono)) {
    return NextResponse.json(
      { error: "Para ventas a crédito hace falta el nombre y teléfono del cliente" },
      { status: 400 }
    );
  }

  const { data: movimiento, error: errorMovimiento } = await supabaseAdmin
    .from("movimientos")
    .insert({
      turno_id,
      tipo,
      litros: litros ?? null,
      precio_litro: precio_litro ?? null,
      monto: monto ?? null,
      efectivo: efectivo ?? 0,
      transferencia: transferencia ?? 0,
      credito: credito ?? 0,
      categoria: categoria ?? null,
      cliente_nota: cliente_nota ?? null,
      cliente_telefono: cliente_telefono ?? null,
    })
    .select()
    .single();

  if (errorMovimiento) {
    return NextResponse.json({ error: errorMovimiento.message }, { status: 500 });
  }

  if (tipo === "compra_agua" && camion_id) {
    const { data: camion } = await supabaseAdmin
      .from("camiones")
      .select("capacidad_litros")
      .eq("id", camion_id)
      .single();

    if (camion) {
      await supabaseAdmin
        .from("camiones")
        .update({ litros_actual: camion.capacidad_litros })
        .eq("id", camion_id);
    }
  }

  // Usamos una función SQL (RPC) para restar de forma atómica: la resta
  // ocurre entera dentro de la base de datos, así que si llegan dos ventas
  // casi al mismo tiempo, no se pisan entre sí.
  if (tipo === "venta" && camion_id && litros) {
    const { error: errorResta } = await supabaseAdmin.rpc("restar_litros", {
      camion_id_param: camion_id,
      litros_param: litros,
    });

    if (errorResta) {
      return NextResponse.json({ error: errorResta.message }, { status: 500 });
    }
  }

  return NextResponse.json({ movimiento });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const turno_id = searchParams.get("turno_id");

  if (!turno_id) {
    return NextResponse.json({ error: "Falta turno_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("movimientos")
    .select("*")
    .eq("turno_id", turno_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movimientos: data });
}
