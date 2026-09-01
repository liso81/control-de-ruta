// mejorar-tab-gastos.js
// Corré esto UNA sola vez con: node mejorar-tab-gastos.js

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

// Reemplaza SOLO dentro de la función TabGastos (para no chocar con TabVentas,
// que tiene botones "Guardar"/"Editar" con el mismo texto).
function reemplazarEnTabGastos(nombre, oldStr, newStr) {
  const scopeStart = content.indexOf("function TabGastos({");
  if (scopeStart === -1) throw new Error(`[${nombre}] No encontré 'function TabGastos({'`);
  let scopeEnd = content.indexOf("\nfunction ", scopeStart + 20);
  if (scopeEnd === -1) scopeEnd = content.length;

  const before = content.slice(0, scopeStart);
  const scope = content.slice(scopeStart, scopeEnd);
  const after = content.slice(scopeEnd);

  const pattern = new RegExp(flexiblePattern(oldStr), "g");
  const matches = scope.match(pattern);
  if (!matches || matches.length === 0) {
    throw new Error(`[${nombre}] No encontré el texto dentro de TabGastos (0 matches).`);
  }
  if (matches.length > 1) {
    throw new Error(`[${nombre}] Ambiguo dentro de TabGastos: ${matches.length} coincidencias.`);
  }
  const nuevoScope = scope.replace(pattern, () => newStr);
  content = before + nuevoScope + after;
}

// Reemplaza en TODO el archivo (para las partes que viven en el componente Home).
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

// 1. Estados nuevos
reemplazarEnTabGastos(
  "1-estados",
  `const [categoria, setCategoria] = useState(CATEGORIAS_GASTO[0]);
  const [observacion, setObservacion] = useState("");
  const [monto, setMonto] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [categoriaEdit, setCategoriaEdit] = useState("");
  const [montoEdit, setMontoEdit] = useState("");`,
  `const [categoria, setCategoria] = useState(CATEGORIAS_GASTO[0]);
  const [observacion, setObservacion] = useState("");
  const [monto, setMonto] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [categoriaEdit, setCategoriaEdit] = useState("");
  const [observacionEdit, setObservacionEdit] = useState("");
  const [montoEdit, setMontoEdit] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);`
);

// 2. Lógica: registrar / empezarEdicion / guardarEdicion + nueva eliminar()
reemplazarEnTabGastos(
  "2-logica",
  `const esOtros = categoria === "Otros";

  async function registrar() {
    const categoriaFinal = esOtros && observacion.trim() ? \`Otros: \${observacion.trim()}\` : categoria;
    const ok = await onRegistrar({ tipo: "gasto", categoria: categoriaFinal, monto: parseFloat(monto) || 0 });
    if (ok) {
      setMonto("");
      setObservacion("");
    }
  }

  function empezarEdicion(m: Movimiento) {
    setEditandoId(m.id);
    setCategoriaEdit(m.categoria ?? "");
    setMontoEdit(String(m.monto ?? ""));
  }

  async function guardarEdicion(m: Movimiento) {
    const ok = await onEditar(m.id, { categoria: categoriaEdit, monto: parseFloat(montoEdit) || 0 });
    if (ok) setEditandoId(null);
  }`,
  `const esOtros = categoria === "Otros";
  const esOtrosEdit = categoriaEdit === "Otros";

  async function registrar() {
    if (procesando) return;
    setProcesando(true);
    try {
      const categoriaFinal = esOtros && observacion.trim() ? \`Otros: \${observacion.trim()}\` : categoria;
      const ok = await onRegistrar({ tipo: "gasto", categoria: categoriaFinal, monto: parseFloat(monto) || 0 });
      if (ok) {
        setMonto("");
        setObservacion("");
      }
    } finally {
      setProcesando(false);
    }
  }

  function empezarEdicion(m: Movimiento) {
    setEditandoId(m.id);
    const cat = m.categoria ?? "";
    if (cat.startsWith("Otros:")) {
      setCategoriaEdit("Otros");
      setObservacionEdit(cat.replace("Otros:", "").trim());
    } else if (CATEGORIAS_GASTO.includes(cat)) {
      setCategoriaEdit(cat);
      setObservacionEdit("");
    } else {
      setCategoriaEdit("Otros");
      setObservacionEdit(cat);
    }
    setMontoEdit(String(m.monto ?? ""));
  }

  async function guardarEdicion(m: Movimiento) {
    if (guardandoEdit) return;
    setGuardandoEdit(true);
    try {
      const categoriaFinal = esOtrosEdit && observacionEdit.trim() ? \`Otros: \${observacionEdit.trim()}\` : categoriaEdit;
      const ok = await onEditar(m.id, { categoria: categoriaFinal, monto: parseFloat(montoEdit) || 0 });
      if (ok) setEditandoId(null);
    } finally {
      setGuardandoEdit(false);
    }
  }

  async function eliminar(m: Movimiento) {
    if (eliminandoId) return;
    if (!window.confirm(\`¿Eliminar este gasto de \${(m.monto ?? 0).toFixed(2)}? No se puede deshacer.\`)) return;
    setEliminandoId(m.id);
    try {
      await onEliminar(m.id);
    } finally {
      setEliminandoId(null);
    }
  }`
);

// 3. Botón "Registrar gasto" -> deshabilitado mientras procesa
reemplazarEnTabGastos(
  "3-boton-registrar",
  `<button onClick={registrar} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
        Registrar gasto
      </button>`,
  `<button
        onClick={registrar}
        disabled={procesando}
        className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition disabled:opacity-50"
      >
        {procesando ? "Procesando..." : "Registrar gasto"}
      </button>`
);

// 4. Formulario de edición: input de texto -> select con lista + input condicional
reemplazarEnTabGastos(
  "4-select-edicion",
  `<div className="space-y-1 py-1">
                <input
                  type="text"
                  value={categoriaEdit}
                  onChange={(e) => setCategoriaEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <input
                  type="number"
                  value={montoEdit}`,
  `<div className="space-y-1 py-1">
                <select
                  value={categoriaEdit}
                  onChange={(e) => setCategoriaEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                >
                  {CATEGORIAS_GASTO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {esOtrosEdit && (
                  <input
                    type="text"
                    value={observacionEdit}
                    onChange={(e) => setObservacionEdit(e.target.value)}
                    placeholder="Describí el gasto"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                )}
                <input
                  type="number"
                  value={montoEdit}`
);

// 5. Botón "Guardar" del modo edición -> deshabilitado mientras guarda
reemplazarEnTabGastos(
  "5-boton-guardar",
  `<div className="flex gap-2">
                  <button onClick={() => guardarEdicion(m)} className="rounded-xl bg-[var(--color-accent)] text-white px-3 py-2 font-semibold flex-1 active:scale-[0.98] transition">
                    Guardar
                  </button>`,
  `<div className="flex gap-2">
                  <button
                    onClick={() => guardarEdicion(m)}
                    disabled={guardandoEdit}
                    className="rounded-xl bg-[var(--color-accent)] text-white px-3 py-2 font-semibold flex-1 active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {guardandoEdit ? "Guardando..." : "Guardar"}
                  </button>`
);

// 6. Fila de cada gasto: agregar botón Eliminar
reemplazarEnTabGastos(
  "6-boton-eliminar",
  `<span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 active:scale-95 transition">
                    Editar
                  </button>
                </span>`,
  `<span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 active:scale-95 transition">
                    Editar
                  </button>
                  <button
                    onClick={() => eliminar(m)}
                    disabled={eliminandoId === m.id}
                    className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition disabled:opacity-50"
                  >
                    {eliminandoId === m.id ? "..." : "Eliminar"}
                  </button>
                </span>`
);

// 7. Firma del componente: agregar prop onEliminar
reemplazarEnTabGastos(
  "7-firma-componente",
  `function TabGastos({
  movimientos,
  onRegistrar,
  onEditar,
}: {
  movimientos: Movimiento[];
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
}) {`,
  `function TabGastos({
  movimientos,
  onRegistrar,
  onEditar,
  onEliminar,
}: {
  movimientos: Movimiento[];
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
  onEliminar: (id: string) => Promise<boolean>;
}) {`
);

// 8. Función eliminarMovimiento en el componente padre (Home) — global, es única en el archivo
reemplazarGlobal(
  "8-eliminarMovimiento",
  `async function editarMovimiento(id: string, datos: Partial<Movimiento>) {`,
  `async function eliminarMovimiento(id: string) {
    if (!turno || !camion) return false;
    setError("");
    const res = await fetch(\`/api/movimientos/\${id}\`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (json.error) {
      setError(json.error);
      return false;
    }
    await Promise.all([cargarMovimientos(turno.id), recargarCamion(camion.id)]);
    return true;
  }

  async function editarMovimiento(id: string, datos: Partial<Movimiento>) {`
);

// 9. Call site: pasar la prop onEliminar al componente — global, única
reemplazarGlobal(
  "9-call-site",
  `<TabGastos movimientos={gastos} onRegistrar={registrarMovimiento} onEditar={editarMovimiento} />`,
  `<TabGastos movimientos={gastos} onRegistrar={registrarMovimiento} onEditar={editarMovimiento} onEliminar={eliminarMovimiento} />`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
