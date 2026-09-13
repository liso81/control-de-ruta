import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log("Uso: node scripts/mi-banco-crear-usuario.mjs <usuario> <contraseña>");
  process.exit(1);
}

const password_hash = await bcrypt.hash(password, 10);

const { data, error } = await supabase
  .from("mb_usuarios")
  .upsert({ username, password_hash }, { onConflict: "username" })
  .select();

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
} else {
  console.log("Usuario de Mi Banco listo:", data);
}
