// agregar-eliminar-ventas.js
// Corré esto UNA sola vez con: node agregar-eliminar-ventas.js

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

// 1. Firma de TabVentas: agregar prop onEliminar
reemplazarGlobal(
  "1-firma",
  `function TabVentas({
  movimientos,
  camion,
  onRegistrar,
  onEditar,
}: {
  movimientos: Movimiento[];
  camion: Camion;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
}) {`,
  `function TabVentas({
  movimientos,
  camion,
  onRegistrar,
  onEditar,
  onEliminar,
}: {
  movimientos: Movimiento[];
  camion: Camion;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
  onEliminar: (id: string) => Promise<boolean>;
}) {`
);

// 2. Estado para saber cuál se está eliminando
reemplazarGlobal(
  "2-estado",
  `const [litros, setLitros] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const [credito, setCredito] = useState("");
  const [clienteNota, setClienteNota] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [errorLocal, setErrorLocal] = useState("");`,
  `const [litros, setLitros] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const [credito, setCredito] = useState("");
  const [clienteNota, setClienteNota] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [errorLocal, setErrorLocal] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);`
);

// 3. Función eliminar + botón en la fila
reemplazarGlobal(
  "3-boton",
  `<div className="flex justify-between items-center">
                <span>
                  venta · {m.litros}L {m.cliente_nota ? \`· \${m.cliente_nota}\` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 active:scale-95 transition">
                    Editar
                  </button>
                </span>
              </div>
            )}
          </div>`,
  `<div className="flex justify-between items-center">
                <span>
                  venta · {m.litros}L {m.cliente_nota ? \`· \${m.cliente_nota}\` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 active:scale-95 transition">
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(\`¿Eliminar esta venta de \${(m.monto ?? 0).toFixed(2)}? No se puede deshacer.\`)) return;
                      setEliminandoId(m.id);
                      await onEliminar(m.id);
                      setEliminandoId(null);
                    }}
                    disabled={eliminandoId === m.id}
                    className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition disabled:opacity-50"
                  >
                    {eliminandoId === m.id ? "..." : "Eliminar"}
                  </button>
                </span>
              </div>
            )}
          </div>`
);

// 4. Call site: pasar la prop
reemplazarGlobal(
  "4-callsite",
  `<TabVentas movimientos={ventas} camion={camion} onRegistrar={registrarMovimiento} onEditar={editarMovimiento} />`,
  `<TabVentas movimientos={ventas} camion={camion} onRegistrar={registrarMovimiento} onEditar={editarMovimiento} onEliminar={eliminarMovimiento} />`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
