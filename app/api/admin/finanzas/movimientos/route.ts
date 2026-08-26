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

export async function GET(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limite = searchParams.get("limite") ?? "50";

  const { data, error } = await supabaseAdmin
    .from("finanzas_movimientos")
    .select("*, camion:camiones(nombre, matricula), producto:productos(nombre)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(parseInt(limite));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movimientos: data });
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    tipo,
    camion_id,
    producto_id,
    cantidad,
    monto,
    proveedor,
    descripcion,
    fecha,
    submayor,
    tipo_mantenimiento,
    km,
  } = body;

  if (!tipo || monto === undefined) {
    return NextResponse.json({ error: "Faltan tipo o monto" }, { status: 400 });
  }

  const fechaFinal = fecha || new Date().toISOString().slice(0, 10);
  let mantenimiento_id: string | null = null;

  // --- Compra de insumos: sube el stock del producto en Inventario ---
  if (tipo === "gasto_insumo") {
    if (!producto_id || !cantidad) {
      return NextResponse.json({ error: "Faltan producto_id o cantidad" }, { status: 400 });
    }
    const { data: producto } = await supabaseAdmin
      .from("productos")
      .select("stock_actual")
      .eq("id", producto_id)
      .single();

    if (producto) {
      const nuevoPrecioUnitario = cantidad > 0 ? monto / cantidad : undefined;
      await supabaseAdmin
        .from("productos")
        .update({
          stock_actual: producto.stock_actual + cantidad,
          ...(nuevoPrecioUnitario !== undefined ? { precio_unitario: nuevoPrecioUnitario } : {}),
        })
        .eq("id", producto_id);
    }
  }

  // --- Servicio de tercero: genera el registro en Mantenimientos ---
  if (tipo === "gasto_servicio_tercero") {
    if (!camion_id) {
      return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
    }
    const { data: mantenimiento } = await supabaseAdmin
      .from("mantenimientos")
      .insert({
        camion_id,
        tipo: tipo_mantenimiento || "Correctivo / reparación",
        fecha: fechaFinal,
        km: km ?? null,
        costo_total: monto,
        proveedor_tercero: proveedor ?? null,
        costo_servicio_tercero: monto,
        descripcion_servicio_tercero: descripcion ?? null,
      })
      .select()
      .single();

    mantenimiento_id = mantenimiento?.id ?? null;
  }

  // --- Si se indicó un submayor, debitamos el Mayor de Provisión de ese camión ---
  if (submayor && camion_id) {
    await supabaseAdmin.from("mayor_provision").insert({
      camion_id,
      submayor,
      fecha: fechaFinal,
      tipo: "debito",
      monto,
      descripcion: descripcion || `Débito por ${tipo}`,
    });
  }

  const { data: movimiento, error } = await supabaseAdmin
    .from("finanzas_movimientos")
    .insert({
      tipo,
      camion_id: camion_id ?? null,
      producto_id: producto_id ?? null,
      cantidad: cantidad ?? null,
      monto,
      proveedor: proveedor ?? null,
      descripcion: descripcion ?? null,
      fecha: fechaFinal,
      mantenimiento_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movimiento });
}
