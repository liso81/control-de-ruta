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
  const camion_id = searchParams.get("camion_id");

  if (!camion_id) {
    return NextResponse.json({ error: "Falta camion_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("mantenimientos")
    .select("*")
    .eq("camion_id", camion_id)
    .order("fecha", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mantenimientos: data });
}

interface ProductoUsado {
  producto_id: string;
  cantidad: number;
}

export async function POST(request: Request) {
  const sesion = await requiereSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    camion_id,
    tipo,
    fecha,
    km,
    productos,
    costo_servicio_tercero,
    proveedor_tercero,
    descripcion_servicio_tercero,
    notas,
  } = body as {
    camion_id: string;
    tipo: string;
    fecha?: string;
    km?: number;
    productos?: ProductoUsado[];
    costo_servicio_tercero?: number;
    proveedor_tercero?: string;
    descripcion_servicio_tercero?: string;
    notas?: string;
  };

  if (!camion_id || !tipo) {
    return NextResponse.json({ error: "Faltan camion_id o tipo" }, { status: 400 });
  }

  const productosUsados = productos ?? [];

  // Buscamos el precio ACTUAL de cada producto usado, para calcular el
  // subtotal y también para descontar del stock.
  let costoProductos = 0;
  const lineasProductos: {
    producto_id: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario_momento: number;
    subtotal: number;
  }[] = [];

  for (const p of productosUsados) {
    const { data: producto, error: errorProducto } = await supabaseAdmin
      .from("productos")
      .select("*")
      .eq("id", p.producto_id)
      .single();

    if (errorProducto || !producto) {
      return NextResponse.json({ error: `Producto no encontrado: ${p.producto_id}` }, { status: 400 });
    }

    if (producto.stock_actual < p.cantidad) {
      return NextResponse.json(
        { error: `Stock insuficiente de "${producto.nombre}". Disponible: ${producto.stock_actual}` },
        { status: 400 }
      );
    }

    const subtotal = producto.precio_unitario * p.cantidad;
    costoProductos += subtotal;

    lineasProductos.push({
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      cantidad: p.cantidad,
      precio_unitario_momento: producto.precio_unitario,
      subtotal,
    });
  }

  const costoTotal = costoProductos + (costo_servicio_tercero ?? 0);

  const { data: mantenimiento, error: errorMantenimiento } = await supabaseAdmin
    .from("mantenimientos")
    .insert({
      camion_id,
      tipo,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      km: km ?? null,
      costo_total: costoTotal,
      proveedor_tercero: proveedor_tercero ?? null,
      costo_servicio_tercero: costo_servicio_tercero ?? 0,
      descripcion_servicio_tercero: descripcion_servicio_tercero ?? null,
      notas: notas ?? null,
    })
    .select()
    .single();

  if (errorMantenimiento) {
    return NextResponse.json({ error: errorMantenimiento.message }, { status: 500 });
  }

  // Insertamos las líneas de productos usados y descontamos stock.
  for (const linea of lineasProductos) {
    await supabaseAdmin.from("mantenimiento_productos").insert({
      mantenimiento_id: mantenimiento.id,
      ...linea,
    });

    const { data: productoActual } = await supabaseAdmin
      .from("productos")
      .select("stock_actual")
      .eq("id", linea.producto_id)
      .single();

    if (productoActual) {
      await supabaseAdmin
        .from("productos")
        .update({ stock_actual: productoActual.stock_actual - linea.cantidad })
        .eq("id", linea.producto_id);
    }
  }

  return NextResponse.json({ mantenimiento });
}
