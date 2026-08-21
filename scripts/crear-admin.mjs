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
  console.log("Uso: node scripts/crear-admin.mjs <usuario> <contraseña>");
  process.exit(1);
}

const password_hash = await bcrypt.hash(password, 10);

const { data, error } = await supabase
  .from("admins")
  .insert({ username, password_hash })
  .select();

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Admin creado:", data);
}
