// arreglar-otros-gastos.js
// Corré esto UNA sola vez con: node arreglar-otros-gastos.js
// Corrige el patch anterior: mueve el estado "otrosGastos" y su fetch
// al lugar correcto, adentro de la función PanelFinanzas.

const fs = require("fs");
const path = "app/admin/page.tsx";

let content = fs.readFileSync(path, "utf8");
const original = content;

// 1. Sacar el estado mal ubicado (si está)
const wrongState = "\n  const [otrosGastos, setOtrosGastos] = useState<any[]>([]);";
if (content.includes(wrongState)) {
  content = content.replace(wrongState, "");
}

// 2. Sacar el fetch mal ubicado (si está)
const wrongFetchBlock = `
    const resMovimientos = await fetch("/api/admin/finanzas/movimientos?limite=200");
    const jsonMovimientos = await resMovimientos.json();
    setOtrosGastos((jsonMovimientos.movimientos ?? []).filter((m: any) => m.tipo === "gasto_otro"));`;
if (content.includes(wrongFetchBlock)) {
  content = content.replace(wrongFetchBlock, "");
}

// 3. Ubicar el inicio de la función PanelFinanzas
const panelStart = content.indexOf("function PanelFinanzas()");
if (panelStart === -1) {
  throw new Error("No encontré 'function PanelFinanzas()'. Avisale a Claude para revisar manualmente.");
}

// 4. Insertar el estado, buscando el anchor SOLO a partir de PanelFinanzas
const stateAnchor = "const [productos, setProductos] = useState<Producto[]>([]);";
const stateIdx = content.indexOf(stateAnchor, panelStart);
if (stateIdx === -1) {
  throw new Error("No encontré el anchor de estado dentro de PanelFinanzas.");
}
content =
  content.slice(0, stateIdx + stateAnchor.length) +
  "\n  const [otrosGastos, setOtrosGastos] = useState<any[]>([]);" +
  content.slice(stateIdx + stateAnchor.length);

// 5. Insertar el fetch, buscando el anchor SOLO a partir de PanelFinanzas
const fetchAnchor = "const jsonProductos = await resProductos.json();";
const fetchIdx = content.indexOf(fetchAnchor, panelStart);
if (fetchIdx === -1) {
  throw new Error("No encontré el anchor de fetch dentro de PanelFinanzas.");
}
const fetchInsert = `
    const resMovimientos = await fetch("/api/admin/finanzas/movimientos?limite=200");
    const jsonMovimientos = await resMovimientos.json();
    setOtrosGastos((jsonMovimientos.movimientos ?? []).filter((m: any) => m.tipo === "gasto_otro"));`;
content =
  content.slice(0, fetchIdx + fetchAnchor.length) +
  fetchInsert +
  content.slice(fetchIdx + fetchAnchor.length);

if (content === original) {
  throw new Error("El archivo no cambió. Avisale a Claude.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Fix aplicado correctamente a " + path);
