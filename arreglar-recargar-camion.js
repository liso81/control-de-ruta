// arreglar-recargar-camion.js
// Corré esto UNA sola vez con: node arreglar-recargar-camion.js

const fs = require("fs");
const path = "app/page.tsx";
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
  "recargarCamion",
  `async function recargarCamion(camionId: string) {
    const res = await fetch("/api/camiones");
    const json = await res.json();
    const actualizado = (json.camiones ?? []).find((c: Camion) => c.id === camionId);
    if (actualizado) setCamion(actualizado);
    return actualizado as Camion | undefined;
  }`,
  `async function recargarCamion(camionId: string) {
    const res = await fetch(\`/api/camiones?camion_id=\${camionId}\`);
    const json = await res.json();
    const actualizado = (json.camiones ?? []).find((c: Camion) => c.id === camionId);
    if (actualizado) setCamion(actualizado);
    return actualizado as Camion | undefined;
  }`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
