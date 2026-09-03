// agregar-lista-respaldos.js
// Corré esto UNA sola vez con: node agregar-lista-respaldos.js

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

// 1. Estados nuevos, antes de marcarEnviado
reemplazarGlobal(
  "1-estados",
  `async function marcarEnviado(id: string) {`,
  `const [mostrarRespaldos, setMostrarRespaldos] = useState(false);
  const [respaldosGuardados, setRespaldosGuardados] = useState<{ nombre: string; creado: string; url: string | null }[]>([]);

  async function marcarEnviado(id: string) {`
);

// 2. Función cargarRespaldosGuardados, justo después de descargarRespaldo
reemplazarGlobal(
  "2-funcion",
  `async function descargarRespaldo() {
    const res = await fetch("/api/superadmin/backup");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = \`respaldo-control-de-ruta-\${new Date().toISOString().slice(0, 10)}.json\`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (`,
  `async function descargarRespaldo() {
    const res = await fetch("/api/superadmin/backup");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = \`respaldo-control-de-ruta-\${new Date().toISOString().slice(0, 10)}.json\`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function cargarRespaldosGuardados() {
    setMostrarRespaldos(!mostrarRespaldos);
    if (respaldosGuardados.length === 0) {
      const res = await fetch("/api/superadmin/respaldos");
      const json = await res.json();
      setRespaldosGuardados(json.respaldos ?? []);
    }
  }

  return (`
);

// 3. Botón "Respaldos guardados" al lado de "Respaldo del sistema"
reemplazarGlobal(
  "3-boton",
  `<button
            onClick={descargarRespaldo}
            className="rounded-full border border-gray-200 text-gray-600 text-sm px-4 py-2 font-medium"
          >
            Respaldo del sistema
          </button>`,
  `<button
            onClick={descargarRespaldo}
            className="rounded-full border border-gray-200 text-gray-600 text-sm px-4 py-2 font-medium"
          >
            Respaldo del sistema
          </button>
          <button
            onClick={cargarRespaldosGuardados}
            className="rounded-full border border-gray-200 text-gray-600 text-sm px-4 py-2 font-medium"
          >
            Respaldos guardados
          </button>`
);

// 4. Sección desplegable con la lista, arriba de las notificaciones
reemplazarGlobal(
  "4-seccion",
  `<div className="px-5 py-5 space-y-8">
        {notificaciones.length > 0 && (`,
  `<div className="px-5 py-5 space-y-8">
        {mostrarRespaldos && (
          <section className="bg-white rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Respaldos guardados (automáticos, semanales)</p>
            {respaldosGuardados.length === 0 && (
              <p className="text-xs text-gray-400">Todavía no hay respaldos automáticos guardados.</p>
            )}
            {respaldosGuardados.map((r) => (
              <div key={r.nombre} className="flex justify-between items-center text-sm">
                <span>{r.nombre}</span>
                {r.url ? (
                  <a href={r.url} className="text-[#0E7C7B] font-medium text-xs underline">
                    Descargar
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Sin link</span>
                )}
              </div>
            ))}
          </section>
        )}

        {notificaciones.length > 0 && (`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
