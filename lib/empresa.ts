import { supabaseAdmin } from "@/lib/supabase";

// Devuelve true si el camión pertenece a la empresa de la sesión (o si la
// sesión no tiene empresa asignada, para no romper compatibilidad vieja).
export async function camionPerteneceAEmpresa(camion_id: string, empresa_id: string | null): Promise<boolean> {
  if (!empresa_id) return true;

  const { data } = await supabaseAdmin
    .from("camiones")
    .select("id")
    .eq("id", camion_id)
    .eq("empresa_id", empresa_id)
    .maybeSingle();

  return !!data;
}
