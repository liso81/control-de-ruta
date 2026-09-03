// mostrar-telefono-solicitudes.js
// Corré esto UNA sola vez con: node mostrar-telefono-solicitudes.js

const fs = require("fs");
const path = "app/admin/page.tsx";
let content = fs.readFileSync(path, "utf8");
const original = content;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function flexiblePattern(str) {
  return escapeRegex(str.trim()).replace(/\s+/g, "\\s+");
}
function reemplazarGlobal(nombre, oldStr, newStr) {
  const pattern = new RegExp(flexiblePattern(oldStr), "g");
  const matches = content.match(pattern);
  if (!matches || matches.length === 0) {
    throw new Error(`[${nombre}] No encontré el texto (0 matches).`);
  }
  if (matches.length > 1) {
    throw new Error(`[${nombre}] Ambiguo: ${matches.length} coincidencias.`);
  }
  content = content.replace(pattern, () => newStr);
}

reemplazarGlobal(
  "mostrar-telefono",
  `<p className="text-sm text-[var(--color-ink-soft)] mb-2">
                  Solicitud nueva · {new Date(s.created_at).toLocaleString("es")}
                </p>`,
  `<p className="text-sm font-semibold text-[var(--color-ink)] mb-1">
                  {s.telefono || "Sin número"}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)] mb-2">
                  Solicitó acceso · {new Date(s.created_at).toLocaleString("es")}
                </p>`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
