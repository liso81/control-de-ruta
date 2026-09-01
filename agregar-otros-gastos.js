// agregar-otros-gastos.js
// Corré esto UNA sola vez con: node agregar-otros-gastos.js
// Parchea app/admin/page.tsx para mostrar los gastos tipo "gasto_otro" (los del bot de Telegram) en la pantalla de Finanzas.

const fs = require("fs");
const path = "app/admin/page.tsx";

let content = fs.readFileSync(path, "utf8");
const original = content;

// 1. Agregar el estado nuevo, justo después del estado de productos
const stateAnchor = "const [productos, setProductos] = useState<Producto[]>([]);";
if (!content.includes(stateAnchor)) {
  throw new Error("No encontré el anchor 1 (estado de productos). Avisale a Claude para revisar manualmente.");
}
content = content.replace(
  stateAnchor,
  stateAnchor + "\n  const [otrosGastos, setOtrosGastos] = useState<any[]>([]);"
);

// 2. Traer los movimientos gasto_otro dentro de cargarTodo()
const fetchAnchor = "const jsonProductos = await resProductos.json();";
if (!content.includes(fetchAnchor)) {
  throw new Error("No encontré el anchor 2 (jsonProductos). Avisale a Claude para revisar manualmente.");
}
content = content.replace(
  fetchAnchor,
  fetchAnchor +
    `
    const resMovimientos = await fetch("/api/admin/finanzas/movimientos?limite=200");
    const jsonMovimientos = await resMovimientos.json();
    setOtrosGastos((jsonMovimientos.movimientos ?? []).filter((m: any) => m.tipo === "gasto_otro"));`
);

// 3. Insertar la sección visual antes de "Registrar movimiento"
const jsxAnchor = "{/* Registrar movimiento */}";
if (!content.includes(jsxAnchor)) {
  throw new Error("No encontré el anchor 3 (Registrar movimiento). Avisale a Claude para revisar manualmente.");
}
const jsxBlock = `{/* Otros gastos (Telegram / manual) */}
      {otrosGastos.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
          <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">🧾 Otros gastos</p>
          <div className="space-y-1">
            {otrosGastos.map((m) => (
              <div key={m.id} className="text-sm border-b pb-1 flex justify-between">
                <span>
                  {m.descripcion || "Otro gasto"}
                  {m.proveedor ? \` · \${m.proveedor}\` : ""}
                  {m.camion ? \` · \${m.camion.matricula || m.camion.nombre}\` : ""}
                </span>
                <span className="text-[var(--color-danger)]">-{(m.monto ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      `;
content = content.replace(jsxAnchor, jsxBlock + jsxAnchor);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal, no se aplicó ningún reemplazo.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
