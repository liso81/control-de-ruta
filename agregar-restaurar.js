// agregar-restaurar.js
// Corré esto UNA sola vez con: node agregar-restaurar.js

const fs = require("fs");
const path = "app/superadmin/dashboard/page.tsx";
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

// 1. Botón "Restaurar" al lado de los otros dos botones del header
reemplazarGlobal(
  "1-boton-header",
  `<button
            onClick={cargarRespaldosGuardados}
            className="rounded-full border border-gray-200 text-gray-600 text-sm px-4 py-2 font-medium"
          >
            Respaldos guardados
          </button>`,
  `<button
            onClick={cargarRespaldosGuardados}
            className="rounded-full border border-gray-200 text-gray-600 text-sm px-4 py-2 font-medium"
          >
            Respaldos guardados
          </button>
          <button
            onClick={() => setMostrarRestaurar(true)}
            className="rounded-full border border-red-200 text-red-600 text-sm px-4 py-2 font-medium"
          >
            Restaurar
          </button>`
);

// 2. Estado para mostrar el modal de restaurar
reemplazarGlobal(
  "2-estado",
  `const [mostrarRespaldos, setMostrarRespaldos] = useState(false);
  const [respaldosGuardados, setRespaldosGuardados] = useState<{ nombre: string; creado: string; url: string | null }[]>([]);`,
  `const [mostrarRespaldos, setMostrarRespaldos] = useState(false);
  const [respaldosGuardados, setRespaldosGuardados] = useState<{ nombre: string; creado: string; url: string | null }[]>([]);
  const [mostrarRestaurar, setMostrarRestaurar] = useState(false);`
);

// 3. Render del modal, justo antes del formulario de nueva empresa (mismo patrón)
reemplazarGlobal(
  "3-render-modal",
  `{mostrarForm && (
        <FormularioNuevaEmpresa`,
  `{mostrarRestaurar && (
        <ModalRestaurar onClose={() => setMostrarRestaurar(false)} empresas={empresas} onRestaurado={cargarDatos} />
      )}

      {mostrarForm && (
        <FormularioNuevaEmpresa`
);

// 4. Componente ModalRestaurar, agregado antes de FormularioNuevaEmpresa
reemplazarGlobal(
  "4-componente",
  `function FormularioNuevaEmpresa({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {`,
  `function ModalRestaurar({
  onClose,
  empresas,
  onRestaurado,
}: {
  onClose: () => void;
  empresas: Empresa[];
  onRestaurado: () => void;
}) {
  const [archivo, setArchivo] = useState<any>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [modo, setModo] = useState<"todo" | "empresa">("empresa");
  const [empresaId, setEmpresaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState("");

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setArchivo(JSON.parse(reader.result as string));
        setError("");
      } catch {
        setError("Ese archivo no es un respaldo JSON válido.");
        setArchivo(null);
      }
    };
    reader.readAsText(file);
  }

  async function confirmarRestaurar() {
    if (!archivo) {
      setError("Elegí primero un archivo de respaldo.");
      return;
    }
    if (modo === "empresa" && !empresaId) {
      setError("Elegí qué empresa restaurar.");
      return;
    }

    const frase = modo === "todo" ? "RESTAURAR TODO" : "RESTAURAR";
    const confirmacion = window.prompt(
      \`Esto va a \${modo === "todo" ? "BORRAR Y REEMPLAZAR TODO EL SISTEMA" : "borrar y reemplazar los datos de esa empresa"} con lo que hay en el archivo. No se puede deshacer.\\n\\nEscribí "\${frase}" para confirmar:\`
    );
    if (confirmacion !== frase) {
      if (confirmacion !== null) window.alert("No coincide, no se restauró nada.");
      return;
    }

    setEnviando(true);
    setError("");
    const res = await fetch("/api/superadmin/restaurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo, empresaId: modo === "empresa" ? empresaId : undefined, datos: archivo }),
    });
    const json = await res.json();
    setEnviando(false);

    if (json.error) {
      setError(json.error);
      return;
    }
    setResultado(json.passwordTemporal);
    onRestaurado();
  }

  const empresasDelArchivo: { id: string; nombre: string }[] = archivo?.empresas ?? [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        {resultado ? (
          <>
            <h2 className="font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              ✅ Restauración completa
            </h2>
            <p className="text-sm text-gray-500">
              Los usuarios restaurados quedaron con esta contraseña temporal (avisales que la cambien):
            </p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="font-mono text-lg font-bold text-[#0E7C7B]">{resultado}</p>
            </div>
            <button onClick={onClose} className="w-full rounded-xl bg-[#0E7C7B] text-white py-3 text-sm font-medium">
              Listo
            </button>
          </>
        ) : (
          <>
            <h2 className="font-semibold text-red-600" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Restaurar desde respaldo
            </h2>
            <p className="text-xs text-gray-500">
              Los logins restaurados no traen contraseña (por seguridad) — van a quedar con una contraseña temporal
              que te vamos a mostrar al final.
            </p>

            <input type="file" accept="application/json" onChange={elegirArchivo} className="text-sm" />
            {nombreArchivo && <p className="text-xs text-gray-500">Archivo: {nombreArchivo}</p>}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={modo === "empresa"} onChange={() => setModo("empresa")} />
                Restaurar solo una empresa
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={modo === "todo"} onChange={() => setModo("todo")} />
                Restaurar TODO el sistema
              </label>
            </div>

            {modo === "empresa" && (
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              >
                <option value="">Elegí una empresa del archivo</option>
                {empresasDelArchivo.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-500">
                Cancelar
              </button>
              <button
                onClick={confirmarRestaurar}
                disabled={enviando}
                className="flex-1 rounded-xl bg-red-600 text-white py-3 text-sm font-medium disabled:opacity-60"
              >
                {enviando ? "Restaurando..." : "Restaurar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FormularioNuevaEmpresa({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
