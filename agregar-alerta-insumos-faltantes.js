// agregar-alerta-insumos-faltantes.js
// Corré esto UNA sola vez con: node agregar-alerta-insumos-faltantes.js

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
function reemplazarEnPanelReportes(nombre, oldStr, newStr) {
  const scopeStart = content.indexOf("function PanelReportes()");
  if (scopeStart === -1) throw new Error(`[${nombre}] No encontré 'function PanelReportes()'`);
  let scopeEnd = content.indexOf("\nfunction ", scopeStart + 20);
  if (scopeEnd === -1) scopeEnd = content.length;

  const before = content.slice(0, scopeStart);
  const scope = content.slice(scopeStart, scopeEnd);
  const after = content.slice(scopeEnd);

  const pattern = new RegExp(flexiblePattern(oldStr), "g");
  const matches = scope.match(pattern);
  if (!matches || matches.length === 0) {
    throw new Error(`[${nombre}] No encontré el texto dentro de PanelReportes (0 matches).`);
  }
  if (matches.length > 1) {
    throw new Error(`[${nombre}] Ambiguo dentro de PanelReportes: ${matches.length} coincidencias.`);
  }
  const nuevoScope = scope.replace(pattern, () => newStr);
  content = before + nuevoScope + after;
}

// 1. Estado nuevo + fetch (encadenado sobre lo de fondo de cobertura, ya aplicado)
reemplazarEnPanelReportes(
  "1-estado-y-fetch",
  `const [alertasProvisionSinAcreditar, setAlertasProvisionSinAcreditar] = useState<{ camion_id: string; camion_nombre: string; camion_matricula: string }[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarReportes();
  }, []);

  async function cargarReportes() {
    setCargando(true);
    const res = await fetch("/api/admin/reportes");
    const json = await res.json();
    setAlertasMantenimiento(json.alertasMantenimiento ?? []);
    setAlertasDocumentos(json.alertasDocumentos ?? []);
    setAlertasCxC(json.alertasCuentasPorCobrar ?? []);
    setAlertasParalizaciones(json.alertasParalizaciones ?? []);
    setAlertasProvisionFondos(json.alertasProvisionFondos ?? []);
    setAlertasProvisionSinAcreditar(json.alertasProvisionSinAcreditar ?? []);
    setCargando(false);
  }`,
  `const [alertasProvisionSinAcreditar, setAlertasProvisionSinAcreditar] = useState<{ camion_id: string; camion_nombre: string; camion_matricula: string }[]>([]);
  const [alertasInsumosFaltantes, setAlertasInsumosFaltantes] = useState<{ camion_id: string; camion_nombre: string; camion_matricula: string; tipo: string; producto_nombre: string; unidad: string | null; cantidad_necesaria: number; stock_actual: number; faltante: number }[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarReportes();
  }, []);

  async function cargarReportes() {
    setCargando(true);
    const res = await fetch("/api/admin/reportes");
    const json = await res.json();
    setAlertasMantenimiento(json.alertasMantenimiento ?? []);
    setAlertasDocumentos(json.alertasDocumentos ?? []);
    setAlertasCxC(json.alertasCuentasPorCobrar ?? []);
    setAlertasParalizaciones(json.alertasParalizaciones ?? []);
    setAlertasProvisionFondos(json.alertasProvisionFondos ?? []);
    setAlertasProvisionSinAcreditar(json.alertasProvisionSinAcreditar ?? []);
    setAlertasInsumosFaltantes(json.alertasInsumosFaltantes ?? []);
    setCargando(false);
  }`
);

// 2. Incluir en la condición de "sin alertas"
reemplazarEnPanelReportes(
  "2-sinAlertas",
  `const sinAlertas =
    alertasMantenimiento.length === 0 &&
    alertasDocumentos.length === 0 &&
    alertasCxC.length === 0 &&
    alertasParalizaciones.length === 0 &&
    alertasProvisionFondos.length === 0 &&
    alertasProvisionSinAcreditar.length === 0;`,
  `const sinAlertas =
    alertasMantenimiento.length === 0 &&
    alertasDocumentos.length === 0 &&
    alertasCxC.length === 0 &&
    alertasParalizaciones.length === 0 &&
    alertasProvisionFondos.length === 0 &&
    alertasProvisionSinAcreditar.length === 0 &&
    alertasInsumosFaltantes.length === 0;`
);

// 3. Bloque visual, justo antes de Paralizaciones
reemplazarEnPanelReportes(
  "3-bloque-visual",
  `{alertasParalizaciones.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Paralizaciones activas</h3>`,
  `{alertasInsumosFaltantes.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Insumos que vas a necesitar</h3>
          <div className="space-y-2">
            {alertasInsumosFaltantes.map((a, i) => (
              <div key={i} className="rounded-2xl shadow-sm p-4 border text-[var(--color-warn)] bg-[var(--color-warn-soft)] border-[var(--color-warn)]">
                <p className="font-semibold text-sm">
                  ⚡ {a.camion_matricula || a.camion_nombre} — {a.tipo}
                </p>
                <p className="text-sm">
                  Necesitás {a.cantidad_necesaria} {a.unidad || ""} de {a.producto_nombre}, tenés {a.stock_actual} en inventario (faltan {a.faltante}).
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasParalizaciones.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Paralizaciones activas</h3>`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
