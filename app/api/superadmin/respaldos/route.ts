import { NextRequest, NextResponse } from "next/server";
import { verificarSesionSuperadmin } from "@/lib/superadmin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await verificarSesionSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: archivos, error } = await supabaseAdmin.storage
    .from("respaldos")
    .list("", { sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const conLinks = await Promise.all(
    (archivos ?? []).map(async (archivo) => {
      const { data } = await supabaseAdmin.storage
        .from("respaldos")
        .createSignedUrl(archivo.name, 60 * 10); // el link vale 10 minutos
      return { nombre: archivo.name, creado: archivo.created_at, url: data?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ respaldos: conLinks });
}
