// agregar-boton-todas-partidas.js
// Corré esto UNA sola vez con: node agregar-boton-todas-partidas.js

const fs = require("fs");
const path = "app/admin/page.tsx";

let content = fs.readFileSync(path, "utf8");
const original = content;

// 1. Agregar estado nuevo justo después del estado de otrosGastos
const stateAnchor = "const [otrosGastos, setOtrosGastos] = useState<any[]>([]);";
if (!content.includes(stateAnchor)) {
  throw new Error("No encontré el anchor de estado otrosGastos. Avisale a Claude.");
}
content = content.replace(
  stateAnchor,
  stateAnchor +
    "\n  const [todosMovimientos, setTodosMovimientos] = useState<any[]>([]);\n  const [mostrarTodos, setMostrarTodos] = useState(false);"
);

// 2. Guardar también la lista completa (no filtrada) al cargar
const fetchAnchor =
  'setOtrosGastos((jsonMovimientos.movimientos ?? []).filter((m: any) => m.tipo === "gasto_otro"));';
if (!content.includes(fetchAnchor)) {
  throw new Error("No encontré el anchor de fetch de otrosGastos. Avisale a Claude.");
}
content = content.replace(
  fetchAnchor,
  fetchAnchor + "\n    setTodosMovimientos(jsonMovimientos.movimientos ?? []);"
);

// 3. Reemplazar el bloque JSX de "Otros gastos" por la versión mejorada + botón
const oldJsxBlock = `{/* Otros gastos (Telegram / manual) */}
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

if (!content.includes(oldJsxBlock)) {
  throw new Error(
    "No encontré el bloque JSX anterior de Otros gastos. Puede que ya esté modificado — avisale a Claude."
  );
}

const newJsxBlock = `{/* Otros gastos (Telegram / manual) */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">🧾 Otros gastos</p>
        <div className="space-y-1">
          {otrosGastos.length === 0 && (
            <p className="text-sm text-[var(--color-ink-soft)]">Sin otros gastos registrados todavía.</p>
          )}
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

      {/* Botón + lista completa de TODAS las partidas */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <button
          onClick={() => setMostrarTodos(!mostrarTodos)}
          className="w-full text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 active:scale-95 transition"
        >
          {mostrarTodos ? "Ocultar todas las partidas" : "📋 Ver todas las partidas de gastos"}
        </button>

        {mostrarTodos && (
          <div className="space-y-1 mt-3 max-h-96 overflow-y-auto">
            {todosMovimientos.length === 0 && (
              <p className="text-sm text-[var(--color-ink-soft)]">Sin movimientos registrados.</p>
            )}
            {todosMovimientos.map((m) => (
              <div key={m.id} className="text-sm border-b pb-1">
                <div className="flex justify-between">
                  <span className="font-medium">{m.tipo}</span>
                  <span className={m.monto >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-danger)]"}>
                    {(m.monto ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-ink-soft)]">
                  {m.fecha}
                  {m.descripcion ? \` · \${m.descripcion}\` : ""}
                  {m.proveedor ? \` · \${m.proveedor}\` : ""}
                  {m.camion ? \` · \${m.camion.matricula || m.camion.nombre}\` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      `;

content = content.replace(oldJsxBlock, newJsxBlock);

if (content === original) {
  throw new Error("El archivo no cambió.");
}

fs.writeFileSync(path, content, "utf8");
console.log('✅ Patch aplicado: botón "Ver todas las partidas de gastos" agregado.');
