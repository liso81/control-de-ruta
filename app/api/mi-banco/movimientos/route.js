import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOMBRE_COOKIE, verificarSesion } from "@/lib/mi-banco/auth";

export const dynamic = "force-dynamic";

async function autenticado(request) {
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  return !!sesion;
}

export async function GET(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cuentaId = searchParams.get("cuenta_id");
  const categoriaId = searchParams.get("categoria_id");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const limite = Number(searchParams.get("limite") || 100);

  let query = supabaseAdmin
    .from("mb_movimientos")
    .select("*, cuenta:mb_cuentas(nombre, icono), categoria:mb_categorias(nombre, icono, color)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limite);

  if (cuentaId) query = query.eq("cuenta_id", cuentaId);
  if (categoriaId) query = query.eq("categoria_id", categoriaId);
  if (desde) query = query.gte("fecha", desde);
  if (hasta) query = query.lte("fecha", hasta);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  if (!(await autenticado(request))) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { cuenta_id, categoria_id, tipo, monto, descripcion, comercio, fecha } = body;

  if (!cuenta_id || !["ingreso", "gasto"].includes(tipo) || !monto || monto <= 0) {
    return NextResponse.json({ error: "Faltan datos o el monto no es valido" }, { status: 400 });
  }

  const montoConSigno = tipo === "gasto" ? -Math.abs(monto) : Math.abs(monto);

  const { data, error } = await supabaseAdmin
    .from("mb_movimientos")
    .insert({
      cuenta_id,
      categoria_id: categoria_id || null,
      tipo,
      monto: montoConSigno,
      descripcion: descripcion || null,
      comercio: comercio || null,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      origen: "manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
