import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Movimiento } from "@/lib/tipos";

export const dynamic = "force-dynamic";

function calcularEfectivoDisponible(
  saldoInicial: number,
  fondoDueno: number,
  movimientos: Movimiento[]
) {
  const ventasEfectivo = movimientos
    .filter((m) => m.tipo === "venta")
    .reduce((acc, m) => acc + (m.efectivo ?? 0), 0);
  const compras = movimientos
    .filter((m) => m.tipo === "compra_agua" || m.tipo === "compra_gasoleo")
    .reduce((acc, m) => acc + (m.monto ?? 0), 0);
  const gastos = movimientos
    .filter((m) => m.tipo === "gasto")
    .reduce((acc, m) => acc + (m.monto ?? 0), 0);

  return saldoInicial + fondoDueno + ventasEfectivo - compras - gastos;
}

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

  // Si es un egreso, verificamos que el nuevo monto no supere el efectivo
  // disponible (calculado SIN este movimiento, para no contarlo dos veces).
  if (original.tipo === "compra_agua" || original.tipo === "compra_gasoleo" || original.tipo === "gasto") {
    const { data: turno } = await supabaseAdmin
      .from("turnos")
      .select("saldo_inicial, fondo_dueno")
      .eq("id", original.turno_id)
      .single();

    const { data: movimientosExistentes } = await supabaseAdmin
      .from("movimientos")
      .select("*")
      .eq("turno_id", original.turno_id)
      .neq("id", id);

    if (turno) {
      const disponibleSinEste = calcularEfectivoDisponible(
        turno.saldo_inicial ?? 0,
        turno.fondo_dueno ?? 0,
        (movimientosExistentes ?? []) as Movimiento[]
      );

      if ((monto ?? 0) > disponibleSinEste) {
        return NextResponse.json(
          {
            error: `No hay suficiente efectivo disponible. Disponible: ${disponibleSinEste.toFixed(2)}, intentaste dejarlo en: ${(monto ?? 0).toFixed(2)}.`,
          },
          { status: 400 }
        );
      }
    }
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: movimiento, error: errorBuscar } = await supabaseAdmin
    .from("movimientos")
    .select("*")
    .eq("id", id)
    .single();

  if (errorBuscar || !movimiento) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  // Si era una venta con litros, devolvemos esos litros al camión antes de borrar el registro.
  if (movimiento.tipo === "venta" && movimiento.litros) {
    const { data: turno } = await supabaseAdmin
      .from("turnos")
      .select("camion_id")
      .eq("id", movimiento.turno_id)
      .single();

    if (turno?.camion_id) {
      await supabaseAdmin.rpc("restar_litros", {
        camion_id_param: turno.camion_id,
        litros_param: -movimiento.litros,
      });
    }
  }

  const { error: errorDelete } = await supabaseAdmin.from("movimientos").delete().eq("id", id);

  if (errorDelete) {
    return NextResponse.json({ error: errorDelete.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
