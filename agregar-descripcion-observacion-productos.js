// agregar-descripcion-observacion-productos.js
// Corré esto UNA sola vez con: node agregar-descripcion-observacion-productos.js

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

// 1. Tipo del estado: agregar descripcion y observacion
reemplazarGlobal(
  "1-estado",
  `const [lineasProductos, setLineasProductos] = useState<{ producto_id: string; cantidad: string }[]>([]);`,
  `const [lineasProductos, setLineasProductos] = useState<{ producto_id: string; cantidad: string; descripcion: string; observacion: string }[]>([]);`
);

// 2. agregarLineaProducto: nueva línea con los campos vacíos
reemplazarGlobal(
  "2-agregar-linea",
  `function agregarLineaProducto() {
    setLineasProductos([...lineasProductos, { producto_id: "", cantidad: "" }]);
  }`,
  `function agregarLineaProducto() {
    setLineasProductos([...lineasProductos, { producto_id: "", cantidad: "", descripcion: "", observacion: "" }]);
  }`
);

// 3. actualizarLinea: aceptar los dos campos nuevos
reemplazarGlobal(
  "3-actualizar-linea",
  `function actualizarLinea(index: number, campo: "producto_id" | "cantidad", valor: string) {
    const copia = [...lineasProductos];
    copia[index] = { ...copia[index], [campo]: valor };
    setLineasProductos(copia);
  }`,
  `function actualizarLinea(index: number, campo: "producto_id" | "cantidad" | "descripcion" | "observacion", valor: string) {
    const copia = [...lineasProductos];
    copia[index] = { ...copia[index], [campo]: valor };
    setLineasProductos(copia);
  }`
);

// 4. Al armar el payload, mandar descripcion y observacion también
reemplazarGlobal(
  "4-productos-validos",
  `const productosValidos = lineasProductos
      .filter((l) => l.producto_id && l.cantidad)
      .map((l) => ({ producto_id: l.producto_id, cantidad: parseFloat(l.cantidad) }));`,
  `const productosValidos = lineasProductos
      .filter((l) => l.producto_id && l.cantidad)
      .map((l) => ({
        producto_id: l.producto_id,
        cantidad: parseFloat(l.cantidad),
        descripcion: l.descripcion.trim() || null,
        observacion: l.observacion.trim() || null,
      }));`
);

// 5. JSX: agregar los dos inputs debajo de cada línea
reemplazarGlobal(
  "5-jsx-linea",
  `{lineasProductos.map((linea, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={linea.producto_id}
              onChange={(e) => actualizarLinea(i, "producto_id", e.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 flex-1"
            >
              <option value="">Elegir producto</option>
              {productosDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (stock: {p.stock_actual})
                </option>
              ))}
            </select>
            <input
              type="number"
              value={linea.cantidad}
              onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)}
              placeholder="Cant."
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 w-20"
            />
            <button onClick={() => quitarLineaProducto(i)} className="rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm active:scale-95 transition">
              ✕
            </button>
          </div>
        ))}`,
  `{lineasProductos.map((linea, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] p-2 space-y-1">
            <div className="flex gap-2">
              <select
                value={linea.producto_id}
                onChange={(e) => actualizarLinea(i, "producto_id", e.target.value)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 flex-1"
              >
                <option value="">Elegir producto</option>
                {productosDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (stock: {p.stock_actual})
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={linea.cantidad}
                onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)}
                placeholder="Cant."
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 w-20"
              />
              <button onClick={() => quitarLineaProducto(i)} className="rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm active:scale-95 transition">
                ✕
              </button>
            </div>
            <input
              type="text"
              value={linea.descripcion}
              onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)}
              placeholder="Descripción del producto"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={linea.observacion}
              onChange={(e) => actualizarLinea(i, "observacion", e.target.value)}
              placeholder="Observación (opcional)"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
        ))}`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
