import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, NOMBRE_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function obtenerSesion(request: Request) {
  const claveAutomatizacion = request.headers.get("x-automation-key");
  if (claveAutomatizacion && claveAutomatizacion === process.env.AUTOMATION_API_KEY) {
    // El bot de Telegram autentica con clave, no con cookie de sesión.
    // Por ahora, mientras solo exista una empresa, no restringe por empresa_id.
    // TODO: cuando haya varias empresas usando el bot, pasar empresa_id explícito.
    return { username: "automation", empresa_id: null as string | null };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  return verificarSesion(token);
}

export async function GET(request: Request) {
  const sesion = await obtenerSesion(request);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limite = searchParams.get("limite") ?? "50";

  let query = supabaseAdmin
    .from("finanzas_movimientos")
    .select("*, camion:camiones(nombre, matricula), producto:productos(nombre)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(parseInt(limite));

  if (sesion.empresa_id) {
    query = query.eq("empresa_id", sesion.empresa_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movimientos: data });
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion(request);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    tipo,
    camion_id,
    producto_id: producto_id_recibido,
    producto_nombre_nuevo,
    unidad_nueva,
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
  let producto_id = producto_id_recibido || null;

  if (tipo === "gasto_insumo") {
    if (!cantidad) {
      return NextResponse.json({ error: "Falta la cantidad" }, { status: 400 });
    }
    if (!producto_id && !producto_nombre_nuevo) {
      return NextResponse.json({ error: "Falta elegir un producto o escribir uno nuevo" }, { status: 400 });
    }

    const precioCompraUnitario = cantidad > 0 ? monto / cantidad : 0;

    if (!producto_id && producto_nombre_nuevo) {
      const { data: nuevoProducto, error: errorCrear } = await supabaseAdmin
        .from("productos")
        .insert({
          nombre: producto_nombre_nuevo,
          unidad: unidad_nueva ?? null,
          precio_unitario: precioCompraUnitario,
          stock_actual: cantidad,
          empresa_id: sesion.empresa_id ?? null,
        })
        .select()
        .single();

      if (errorCrear) {
        return NextResponse.json({ error: errorCrear.message }, { status: 500 });
      }
      producto_id = nuevoProducto.id;
    } else if (producto_id) {
      const { data: producto } = await supabaseAdmin
        .from("productos")
        .select("stock_actual, precio_unitario")
        .eq("id", producto_id)
        .single();

      if (producto) {
        const valorInventarioActual = producto.stock_actual * producto.precio_unitario;
        const nuevoStock = producto.stock_actual + cantidad;
        const nuevoPrecioPromedio = nuevoStock > 0 ? (valorInventarioActual + monto) / nuevoStock : producto.precio_unitario;

        await supabaseAdmin
          .from("productos")
          .update({ stock_actual: nuevoStock, precio_unitario: nuevoPrecioPromedio })
          .eq("id", producto_id);
      }
    }
  }

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
      empresa_id: sesion.empresa_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movimiento });
}
