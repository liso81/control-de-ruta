// agregar-carta-mantenimiento.js
// Corré esto UNA sola vez con: node agregar-carta-mantenimiento.js

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

// Reemplazamos toda la función PanelMantenimientos para agregar el panel de
// configuración de la "carta de mantenimiento previa" (BOM), antes de la
// lista de camiones (es una configuración global, no por camión).
reemplazarGlobal(
  "panel-mantenimientos-completo",
  `function PanelMantenimientos() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [camionSeleccionado, setCamionSeleccionado] = useState<Camion | null>(null);

  useEffect(() => {
    cargarCamiones();
  }, []);

  async function cargarCamiones() {
    setCargando(true);
    const res = await fetch("/api/admin/camiones");
    const json = await res.json();
    setCamiones(json.camiones ?? []);
    setCargando(false);
  }

  if (camionSeleccionado) {
    return <DetalleMantenimientoCamion camion={camionSeleccionado} onVolver={() => setCamionSeleccionado(null)} />;
  }

  return (
    <div>
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Elegí un camión</h2>
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-left active:scale-[0.98] transition"
          >
            <p className="font-display font-semibold text-[var(--color-ink)]">{c.matricula || c.nombre}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">{c.nombre}</p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-[var(--color-ink-soft)]">No hay camiones cargados todavía.</p>}
      </div>
    </div>
  );
}`,
  `function PanelMantenimientos() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [camionSeleccionado, setCamionSeleccionado] = useState<Camion | null>(null);

  useEffect(() => {
    cargarCamiones();
  }, []);

  async function cargarCamiones() {
    setCargando(true);
    const res = await fetch("/api/admin/camiones");
    const json = await res.json();
    setCamiones(json.camiones ?? []);
    setCargando(false);
  }

  if (camionSeleccionado) {
    return <DetalleMantenimientoCamion camion={camionSeleccionado} onVolver={() => setCamionSeleccionado(null)} />;
  }

  return (
    <div>
      <CartaMantenimientoPrevia />

      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Elegí un camión</h2>
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-left active:scale-[0.98] transition"
          >
            <p className="font-display font-semibold text-[var(--color-ink)]">{c.matricula || c.nombre}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">{c.nombre}</p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-[var(--color-ink-soft)]">No hay camiones cargados todavía.</p>}
      </div>
    </div>
  );
}

function CartaMantenimientoPrevia() {
  const [mostrar, setMostrar] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [tipo, setTipo] = useState(TIPOS_MANTENIMIENTO[0]);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (mostrar) cargarTodo();
  }, [mostrar]);

  async function cargarTodo() {
    setCargando(true);
    const [resBom, resProductos] = await Promise.all([
      fetch("/api/admin/mantenimiento-bom"),
      fetch("/api/admin/productos"),
    ]);
    const jsonBom = await resBom.json();
    const jsonProductos = await resProductos.json();
    setItems(jsonBom.items ?? []);
    setProductos(jsonProductos.productos ?? []);
    setCargando(false);
  }

  async function agregar() {
    setError("");
    if (!productoId || !cantidad) {
      setError("Elegí un producto y una cantidad");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/admin/mantenimiento-bom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, producto_id: productoId, cantidad_necesaria: parseFloat(cantidad) }),
    });
    const json = await res.json();
    setGuardando(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    setProductoId("");
    setCantidad("");
    await cargarTodo();
  }

  async function eliminar(id: number) {
    await fetch(\`/api/admin/mantenimiento-bom/\${id}\`, { method: "DELETE" });
    await cargarTodo();
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setMostrar(!mostrar)}
        className="text-sm font-medium rounded-xl border border-[var(--color-border)] px-3 py-1.5 active:scale-95 transition bg-white mb-2"
      >
        {mostrar ? "Ocultar" : "Configurar"} carta de mantenimiento previa
      </button>

      {mostrar && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm p-4 space-y-2">
          <p className="text-xs text-[var(--color-ink-soft)] mb-1">
            Lista de insumos que normalmente necesita cada tipo de mantenimiento. Cuando un mantenimiento esté próximo o vencido, se compara contra tu Inventario y te avisa si falta algo.
          </p>

          {cargando && <p className="text-[var(--color-ink-soft)] text-sm">Cargando...</p>}

          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo de mantenimiento</p>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          >
            {TIPOS_MANTENIMIENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Producto (del Inventario)</p>
          <select
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          >
            <option value="">Elegí un producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Cantidad que necesita</p>
          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej: 4"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          />

          {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}

          <button
            onClick={agregar}
            disabled={guardando}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Agregar a la carta"}
          </button>

          {items.length > 0 && (
            <div className="pt-2 space-y-1">
              {items.map((it) => (
                <div key={it.id} className="text-sm border-b pb-1 flex justify-between items-center">
                  <span>
                    <strong>{it.tipo}</strong> · {it.cantidad_necesaria} {it.producto?.unidad || ""} de {it.producto?.nombre}
                  </span>
                  <button
                    onClick={() => eliminar(it.id)}
                    className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
