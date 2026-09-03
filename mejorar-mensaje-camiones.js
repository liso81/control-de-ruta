// mejorar-mensaje-camiones.js
// Corré esto UNA sola vez con: node mejorar-mensaje-camiones.js

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

// 1. Agregar estado para el mensaje de error
reemplazarGlobal(
  "1-estado",
  `const [camiones, setCamiones] = useState<Camion[]>([]);`,
  `const [camiones, setCamiones] = useState<Camion[]>([]);
  const [errorCamiones, setErrorCamiones] = useState("");`
);

// 2. Guardar el mensaje de error si vino
reemplazarGlobal(
  "2-guardar-error",
  `const camionGuardado = localStorage.getItem("camion_id");
    if (!camionGuardado) {
      const res = await fetch("/api/camiones");
      const json = await res.json();
      setCamiones(json.camiones ?? []);
      setCargando(false);
      return;
    }`,
  `const camionGuardado = localStorage.getItem("camion_id");
    if (!camionGuardado) {
      const res = await fetch("/api/camiones");
      const json = await res.json();
      if (json.error) setErrorCamiones(json.error);
      setCamiones(json.camiones ?? []);
      setCargando(false);
      return;
    }`
);

// 3. Mostrar el mensaje real en vez del genérico
reemplazarGlobal(
  "3-mostrar-error",
  `{camiones.length === 0 && <p className="text-[var(--color-ink-soft)]">No hay camiones cargados todavía.</p>}`,
  `{camiones.length === 0 && (
            <p className="text-[var(--color-ink-soft)]">{errorCamiones || "No hay camiones cargados todavía."}</p>
          )}`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
