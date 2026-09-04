// agregar-eliminar-compras.js
// Corré esto UNA sola vez con: node agregar-eliminar-compras.js

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

// 1. Firma de TabCompras: agregar prop onEliminar
reemplazarGlobal(
  "1-firma",
  `function TabCompras({
  movimientos,
  camion,
  precioPromedioHoy,
  onRegistrar,
  onEditar,
}: {
  movimientos: Movimiento[];
  camion: Camion;
  precioPromedioHoy: number | null;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
}) {`,
  `function TabCompras({
  movimientos,
  camion,
  precioPromedioHoy,
  onRegistrar,
  onEditar,
  onEliminar,
}: {
  movimientos: Movimiento[];
  camion: Camion;
  precioPromedioHoy: number | null;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
  onEliminar: (id: string) => Promise<boolean>;
}) {`
);

// 2. Estado para saber cuál se está eliminando
reemplazarGlobal(
  "2-estado",
  `const [valorAgua, setValorAgua] = useState("");
  const [esGratis, setEsGratis] = useState(false);
  const [precioGasoleo, setPrecioGasoleo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [montoEdit, setMontoEdit] = useState("");`,
  `const [valorAgua, setValorAgua] = useState("");
  const [esGratis, setEsGratis] = useState(false);
  const [precioGasoleo, setPrecioGasoleo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [montoEdit, setMontoEdit] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);`
);

// 3. Botón Eliminar en la fila
reemplazarGlobal(
  "3-boton",
  `<div className="flex justify-between items-center">
                <span>{m.tipo === "compra_agua" ? "Agua" : "Gasóleo"}</span>
                <span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 active:scale-95 transition">
                    Editar
                  </button>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabVentas({`,
  `<div className="flex justify-between items-center">
                <span>{m.tipo === "compra_agua" ? "Agua" : "Gasóleo"}</span>
                <span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 active:scale-95 transition">
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(\`¿Eliminar esta compra de \${(m.monto ?? 0).toFixed(2)}? No se puede deshacer.\`)) return;
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
          </div>
        ))}
      </div>
    </div>
  );
}

function TabVentas({`
);

// 4. Call site: pasar la prop
reemplazarGlobal(
  "4-callsite",
  `<TabCompras
        movimientos={compras}
        camion={camion}
        precioPromedioHoy={precioPromedioHoy}
        onRegistrar={registrarMovimiento}
        onEditar={editarMovimiento}
      />`,
  `<TabCompras
        movimientos={compras}
        camion={camion}
        precioPromedioHoy={precioPromedioHoy}
        onRegistrar={registrarMovimiento}
        onEditar={editarMovimiento}
        onEliminar={eliminarMovimiento}
      />`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
