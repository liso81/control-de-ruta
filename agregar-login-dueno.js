// agregar-login-dueno.js
// Corré esto UNA sola vez con: node agregar-login-dueno.js

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

// 1. Estados nuevos + capturarlos en el submit
reemplazarGlobal(
  "1-estados",
  `const [enviando, setEnviando] = useState(false);
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
  }`,
  `const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null);
  const [nombreCreado, setNombreCreado] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const res = await fetch("/api/superadmin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        dueño_nombre: dueñoNombre,
        dueño_telefono: dueñoTelefono,
        dueño_email: dueñoEmail || null,
        admin_username: adminUsername,
        admin_password: adminPassword,
      }),
    });
    const json = await res.json();
    setEnviando(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    setNombreCreado(nombre);
    setCodigoCreado(json.empresa?.codigo ?? null);
  }`
);

// 2. Mostrar usuario/contraseña en la pantalla de éxito, junto al código
reemplazarGlobal(
  "2-pantalla-exito",
  `<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-[#0E7C7B] tracking-widest">{codigoCreado}</p>
          </div>
          <button
            onClick={copiarCodigo}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium"
          >
            {copiado ? "¡Copiado!" : "Copiar código"}
          </button>`,
  `<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Código de la empresa</p>
            <p className="font-mono text-2xl font-bold text-[#0E7C7B] tracking-widest">{codigoCreado}</p>
          </div>
          <button
            onClick={copiarCodigo}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium"
          >
            {copiado ? "¡Copiado!" : "Copiar código"}
          </button>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm space-y-1">
            <p className="text-xs text-gray-500">Login del panel del dueño (veracsistem.org/admin)</p>
            <p>
              Usuario: <span className="font-mono font-semibold">{adminUsername}</span>
            </p>
            <p>
              Contraseña: <span className="font-mono font-semibold">{adminPassword}</span>
            </p>
          </div>`
);

// 3. Campos de usuario/contraseña en el formulario
reemplazarGlobal(
  "3-campos-form",
  `<input
          placeholder="Email (opcional)"
          value={dueñoEmail}
          onChange={(e) => setDueñoEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />

        <div className="flex gap-2 pt-2">`,
  `<input
          placeholder="Email (opcional)"
          value={dueñoEmail}
          onChange={(e) => setDueñoEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />

        <div className="border-t border-gray-100 pt-3 space-y-3">
          <p className="text-xs text-gray-500">Login del panel del dueño</p>
          <input
            placeholder="Usuario"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            required
          />
          <input
            placeholder="Contraseña"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
