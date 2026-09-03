// agregar-panel-choferes.js
// Corré esto UNA sola vez con: node agregar-panel-choferes.js

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

// 1. Agregar "choferes" al tipo TabId
reemplazarGlobal(
  "1-tabid",
  `type TabId = "reportes" | "vehiculos" | "operaciones" | "mantenimientos" | "inventario" | "cxc" | "provision" | "finanzas";`,
  `type TabId = "reportes" | "vehiculos" | "operaciones" | "mantenimientos" | "inventario" | "cxc" | "provision" | "finanzas" | "choferes";`
);

// 2. Agregar la pestaña a "Más"
reemplazarGlobal(
  "2-tabsmas",
  `const tabsMas: { id: TabId; label: string }[] = [
    { id: "mantenimientos", label: "Mantenimientos" },
    { id: "inventario", label: "Inventario" },
    { id: "cxc", label: "Cuentas x Cobrar" },
    { id: "provision", label: "Provisión de Fondos" },
  ];`,
  `const tabsMas: { id: TabId; label: string }[] = [
    { id: "mantenimientos", label: "Mantenimientos" },
    { id: "inventario", label: "Inventario" },
    { id: "cxc", label: "Cuentas x Cobrar" },
    { id: "provision", label: "Provisión de Fondos" },
    { id: "choferes", label: "Choferes" },
  ];`
);

// 3. Renderizar el panel nuevo
reemplazarGlobal(
  "3-render",
  `{tab === "provision" && <PanelProvisionFondos />}
        {tab === "finanzas" && <PanelFinanzas />}`,
  `{tab === "provision" && <PanelProvisionFondos />}
        {tab === "finanzas" && <PanelFinanzas />}
        {tab === "choferes" && <PanelChoferes />}`
);

// 4. Insertar el componente PanelChoferes completo, antes de PanelReportes
reemplazarGlobal(
  "4-componente",
  `function PanelReportes() {`,
  `function PanelChoferes() {
  const [link, setLink] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [aprobando, setAprobando] = useState<number | null>(null);
  const [camionElegido, setCamionElegido] = useState<Record<number, string>>({});

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    const [resLink, resSolicitudes, resCamiones] = await Promise.all([
      fetch("/api/admin/choferes/generar-link"),
      fetch("/api/admin/choferes/solicitudes"),
      fetch("/api/admin/camiones"),
    ]);
    const jsonLink = await resLink.json();
    const jsonSolicitudes = await resSolicitudes.json();
    const jsonCamiones = await resCamiones.json();
    setLink(jsonLink.token ? \`\${window.location.origin}/unirse/\${jsonLink.token}\` : null);
    setSolicitudes(jsonSolicitudes.solicitudes ?? []);
    setCamiones(jsonCamiones.camiones ?? []);
    setCargando(false);
  }

  async function generarLink() {
    setGenerando(true);
    const res = await fetch("/api/admin/choferes/generar-link", { method: "POST" });
    const json = await res.json();
    setGenerando(false);
    if (json.token) setLink(\`\${window.location.origin}/unirse/\${json.token}\`);
  }

  function copiarLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function aprobar(solicitudId: number) {
    const camionId = camionElegido[solicitudId];
    if (!camionId) return;
    setAprobando(solicitudId);
    const res = await fetch("/api/admin/choferes/aprobar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solicitud_id: solicitudId, camion_id: camionId }),
    });
    const json = await res.json();
    setAprobando(null);
    if (json.error) {
      window.alert(json.error);
      return;
    }
    await cargarTodo();
  }

  async function revocar(solicitudId: number) {
    if (!window.confirm("¿Revocar el acceso de este teléfono?")) return;
    await fetch("/api/admin/choferes/revocar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solicitud_id: solicitudId }),
    });
    await cargarTodo();
  }

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const aprobados = solicitudes.filter((s) => s.estado === "aprobado");

  return (
    <div>
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Choferes</h2>

      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Link para nuevos choferes</p>
        {link ? (
          <>
            <p className="text-xs text-[var(--color-ink-soft)] break-all mb-2">{link}</p>
            <div className="flex gap-2">
              <button
                onClick={copiarLink}
                className="flex-1 rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2 text-sm active:scale-[0.98] transition"
              >
                {copiado ? "¡Copiado!" : "Copiar link"}
              </button>
              <button
                onClick={generarLink}
                disabled={generando}
                className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm active:scale-95 transition disabled:opacity-50"
              >
                {generando ? "..." : "Regenerar"}
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={generarLink}
            disabled={generando}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition disabled:opacity-50"
          >
            {generando ? "Generando..." : "Generar link"}
          </button>
        )}
        <p className="text-xs text-[var(--color-ink-soft)] mt-2">
          Mandaselo por WhatsApp a un chofer nuevo. Al abrirlo va a pedir acceso, y vos elegís acá a qué camión lo asignás.
        </p>
      </div>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {!cargando && pendientes.length > 0 && (
        <div className="mb-4">
          <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Solicitudes pendientes</p>
          <div className="space-y-2">
            {pendientes.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
                <p className="text-sm text-[var(--color-ink-soft)] mb-2">
                  Solicitud nueva · {new Date(s.created_at).toLocaleString("es")}
                </p>
                <select
                  value={camionElegido[s.id] ?? ""}
                  onChange={(e) => setCamionElegido({ ...camionElegido, [s.id]: e.target.value })}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm mb-2"
                >
                  <option value="">Elegí un camión</option>
                  {camiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.matricula || c.nombre}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => aprobar(s.id)}
                  disabled={!camionElegido[s.id] || aprobando === s.id}
                  className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2 text-sm active:scale-[0.98] transition disabled:opacity-50"
                >
                  {aprobando === s.id ? "Aprobando..." : "Aprobar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!cargando && (
        <div>
          <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Choferes con acceso</p>
          {aprobados.length === 0 && <p className="text-[var(--color-ink-soft)] text-sm">Ninguno todavía.</p>}
          <div className="space-y-2">
            {aprobados.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-3 flex justify-between items-center"
              >
                <span className="text-sm">{s.camion?.matricula || s.camion?.nombre || "Camión"}</span>
                <button
                  onClick={() => revocar(s.id)}
                  className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition"
                >
                  Revocar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PanelReportes() {`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
