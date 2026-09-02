// app/api/superadmin/empresas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verificarSesionSuperadmin } from "@/lib/superadmin-auth";
import { crearLicenciaDemo } from "@/lib/licencias";
import { supabaseAdmin } from "@/lib/supabase";

function generarCodigo() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// GET: lista de empresas con su licencia vigente (la última emitida)
export async function GET(req: NextRequest) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: empresas, error: errEmpresas } = await supabaseAdmin
    .from("empresas")
    .select("*")
    .order("created_at", { ascending: false });
  if (errEmpresas) {
    return NextResponse.json({ error: errEmpresas.message }, { status: 500 });
  }

  const { data: licencias, error: errLicencias } = await supabaseAdmin
    .from("licencias")
    .select("*")
    .order("created_at", { ascending: false });
  if (errLicencias) {
    return NextResponse.json({ error: errLicencias.message }, { status: 500 });
  }

  const conLicencia = (empresas ?? []).map((empresa) => {
    const licenciaVigente = (licencias ?? []).find((l) => l.empresa_id === empresa.id);
    return { ...empresa, licencia: licenciaVigente ?? null };
  });

  return NextResponse.json({ empresas: conLicencia });
}

// POST: crear empresa nueva + código único + su licencia demo de 30 días
export async function POST(req: NextRequest) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { nombre, dueño_nombre, dueño_telefono, dueño_email } = await req.json();

  if (!nombre || !dueño_nombre || !dueño_telefono) {
    return NextResponse.json(
      { error: "Faltan datos: nombre, dueño_nombre y dueño_telefono son obligatorios" },
      { status: 400 }
    );
  }

  // Generamos un código único, reintentando si por casualidad ya existe.
  let codigo = generarCodigo();
  for (let intento = 0; intento < 5; intento++) {
    const { data: existente } = await supabaseAdmin
      .from("empresas")
      .select("id")
      .eq("codigo", codigo)
      .maybeSingle();
    if (!existente) break;
    codigo = generarCodigo();
  }

  const { data: empresa, error: errEmpresa } = await supabaseAdmin
    .from("empresas")
    .insert({ nombre, dueño_nombre, dueño_telefono, dueño_email, estado: "demo", codigo })
    .select()
    .single();

  if (errEmpresa) {
    return NextResponse.json({ error: errEmpresa.message }, { status: 500 });
  }

  const nuevaLicencia = crearLicenciaDemo(empresa.id);
  const { data: licencia, error: errLicencia } = await supabaseAdmin
    .from("licencias")
    .insert(nuevaLicencia)
    .select()
    .single();

  if (errLicencia) {
    return NextResponse.json({ error: errLicencia.message }, { status: 500 });
  }

  return NextResponse.json({ empresa, licencia }, { status: 201 });
}
