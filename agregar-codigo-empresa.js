// agregar-codigo-empresa.js
// Corré esto UNA sola vez con: node agregar-codigo-empresa.js

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

// 1. Agregar el campo codigo al tipo Empresa
reemplazarGlobal(
  "1-tipo",
  `type Empresa = {
  id: string;
  nombre: string;
  dueño_nombre: string;
  dueño_telefono: string;
  estado: "demo" | "activa" | "bloqueada" | "cancelada";
  licencia: Licencia | null;
};`,
  `type Empresa = {
  id: string;
  nombre: string;
  dueño_nombre: string;
  dueño_telefono: string;
  estado: "demo" | "activa" | "bloqueada" | "cancelada";
  licencia: Licencia | null;
  codigo: string | null;
};`
);

// 2. Mostrar el código en cada tarjeta de empresa
reemplazarGlobal(
  "2-tarjeta",
  `<div>
                  <p className="font-medium">{empresa.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {empresa.dueño_nombre} · {empresa.dueño_telefono}
                  </p>
                </div>`,
  `<div>
                  <p className="font-medium">{empresa.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {empresa.dueño_nombre} · {empresa.dueño_telefono}
                  </p>
                  {empresa.codigo && (
                    <p className="text-xs mt-1">
                      Código: <span className="font-mono font-semibold text-[#0E7C7B]">{empresa.codigo}</span>
                    </p>
                  )}
                </div>`
);

// 3. Formulario: capturar el código creado y mostrar pantalla de éxito antes de cerrar
reemplazarGlobal(
  "3-formulario",
  `function FormularioNuevaEmpresa({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [dueñoNombre, setDueñoNombre] = useState("");
  const [dueñoTelefono, setDueñoTelefono] = useState("");
  const [dueñoEmail, setDueñoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    await fetch("/api/superadmin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        dueño_nombre: dueñoNombre,
        dueño_telefono: dueñoTelefono,
        dueño_email: dueñoEmail || null,
      }),
    });
    setEnviando(false);
    onCreada();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
      >
        <h2 className="font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Nueva empresa (licencia demo, 30 días)
        </h2>

        <input
          placeholder="Nombre del negocio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Nombre del dueño"
          value={dueñoNombre}
          onChange={(e) => setDueñoNombre(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Teléfono (con código de país, ej: 244923...)"
          value={dueñoTelefono}
          onChange={(e) => setDueñoTelefono(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Email (opcional)"
          value={dueñoEmail}
          onChange={(e) => setDueñoEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-xl bg-[#0E7C7B] text-white py-3 text-sm font-medium disabled:opacity-60"
          >
            {enviando ? "Creando..." : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );`,
  `function FormularioNuevaEmpresa({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [dueñoNombre, setDueñoNombre] = useState("");
  const [dueñoTelefono, setDueñoTelefono] = useState("");
  const [dueñoEmail, setDueñoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null);
  const [nombreCreado, setNombreCreado] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch("/api/superadmin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        dueño_nombre: dueñoNombre,
        dueño_telefono: dueñoTelefono,
        dueño_email: dueñoEmail || null,
      }),
    });
    const json = await res.json();
    setEnviando(false);
    setNombreCreado(nombre);
    setCodigoCreado(json.empresa?.codigo ?? null);
  }

  function copiarCodigo() {
    if (!codigoCreado) return;
    navigator.clipboard.writeText(codigoCreado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (codigoCreado) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
        <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            ✅ {nombreCreado} creada
          </h2>
          <p className="text-sm text-gray-500">
            Este es el código de la empresa. Se lo tenés que dar al dueño — lo va a necesitar para vincular su
            Telegram y a los choferes.
          </p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-[#0E7C7B] tracking-widest">{codigoCreado}</p>
          </div>
          <button
            onClick={copiarCodigo}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium"
          >
            {copiado ? "¡Copiado!" : "Copiar código"}
          </button>
          <button
            onClick={onCreada}
            className="w-full rounded-xl bg-[#0E7C7B] text-white py-3 text-sm font-medium"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
      >
        <h2 className="font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Nueva empresa (licencia demo, 30 días)
        </h2>

        <input
          placeholder="Nombre del negocio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Nombre del dueño"
          value={dueñoNombre}
          onChange={(e) => setDueñoNombre(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Teléfono (con código de país, ej: 244923...)"
          value={dueñoTelefono}
          onChange={(e) => setDueñoTelefono(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Email (opcional)"
          value={dueñoEmail}
          onChange={(e) => setDueñoEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-xl bg-[#0E7C7B] text-white py-3 text-sm font-medium disabled:opacity-60"
          >
            {enviando ? "Creando..." : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
