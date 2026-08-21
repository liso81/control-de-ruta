import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const nombre = process.argv[2];
const capacidad = parseFloat(process.argv[3]);

if (!nombre || !capacidad) {
  console.log("Uso: node scripts/crear-camion.mjs <nombre> <capacidad_litros>");
  process.exit(1);
}

const { data, error } = await supabase
  .from("camiones")
  .insert({ nombre, capacidad_litros: capacidad, litros_actual: capacidad })
  .select();

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Camión creado:", data);
}
