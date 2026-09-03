// lib/finanzas-gastos.ts
import { supabaseAdmin } from "@/lib/supabase";
import type { CategoriaGasto } from "@/lib/gemini-vision";

const APP_BASE_URL = process.env.APP_BASE_URL || "https://veracsistem.org";

export async function registrarGastoEnPanel(params: {
  categoria: CategoriaGasto;
  camionId: string | null;
  empresaId: string | null;
  monto: number;
  descripcion: string | null;
  proveedor: string | null;
  producto_nombre?: string | null;
  cantidad?: number | null;
  unidad?: string | null;
  tipo_mantenimiento?: string | null;
}): Promise<{ ok: boolean; etiqueta: string }> {
  const body: Record<string, unknown> = {
    camion_id: params.camionId,
    empresa_id: params.empresaId,
    monto: params.monto,
    proveedor: params.proveedor,
    descripcion: params.descripcion,
  };

  if (params.categoria === "insumo") {
    body.tipo = "gasto_insumo";
    body.cantidad = params.cantidad ?? 1;

    // Buscamos si ya existe un producto con nombre parecido, DENTRO DE LA MISMA
    // EMPRESA, para no duplicar y respetar el sistema de precio promedio.
    let productoIdEncontrado: string | null = null;
    if (params.producto_nombre) {
      let query = supabaseAdmin
        .from("productos")
        .select("id")
        .ilike("nombre", `%${params.producto_nombre}%`)
        .limit(1);
      if (params.empresaId) query = query.eq("empresa_id", params.empresaId);
      const { data: productoExistente } = await query.maybeSingle();
      productoIdEncontrado = productoExistente?.id ?? null;
    }

    if (productoIdEncontrado) {
      body.producto_id = productoIdEncontrado;
    } else {
      body.producto_nombre_nuevo = params.producto_nombre || params.descripcion || "Insumo sin nombre";
      body.unidad_nueva = params.unidad ?? null;
    }
  } else if (params.categoria === "servicio_tercero") {
    body.tipo = "gasto_servicio_tercero";
    body.tipo_mantenimiento = params.tipo_mantenimiento ?? "Correctivo / reparación";
  } else {
    body.tipo = "gasto_otro";
  }

  const res = await fetch(`${APP_BASE_URL}/api/admin/finanzas/movimientos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-automation-key": process.env.AUTOMATION_API_KEY as string,
    },
    body: JSON.stringify(body),
  });

  const etiqueta =
    body.tipo === "gasto_insumo"
      ? "📦 Insumo (inventario)"
      : body.tipo === "gasto_servicio_tercero"
      ? "🔧 Servicio de tercero"
      : "🧾 Otro gasto";

  return { ok: res.ok, etiqueta };
}
