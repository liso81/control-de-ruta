import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const {
    camion_id,
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

  if ((credito ?? 0) > 0 && (!cliente_nota || !cliente_telefono)) {
    return NextResponse.json(
      { error: "Para ventas a crédito hace falta el nombre y teléfono del cliente" },
      { status: 400 }
    );
  }

  const { data: original, error: errorOriginal } = await supabaseAdmin
    .from("movimientos")
    .select("*")
    .eq("id", id)
    .single();

  if (errorOriginal || !original) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  const { data: actualizado, error: errorUpdate } = await supabaseAdmin
    .from("movimientos")
    .update({
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
    .eq("id", id)
    .select()
    .single();

  if (errorUpdate) {
    return NextResponse.json({ error: errorUpdate.message }, { status: 500 });
  }

  // Si es una venta y cambiaron los litros, ajustamos el stock del camión
  // por la diferencia (delta), de forma atómica.
  if (original.tipo === "venta" && camion_id) {
    const litrosViejos = original.litros ?? 0;
    const litrosNuevos = litros ?? 0;
    const delta = litrosNuevos - litrosViejos;

    if (delta !== 0) {
      const { error: errorResta } = await supabaseAdmin.rpc("restar_litros", {
        camion_id_param: camion_id,
        litros_param: delta,
      });

      if (errorResta) {
        return NextResponse.json({ error: errorResta.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ movimiento: actualizado });
}
