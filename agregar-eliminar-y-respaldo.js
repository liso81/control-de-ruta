// agregar-eliminar-y-respaldo.js
// Corré esto UNA sola vez con: node agregar-eliminar-y-respaldo.js

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

// 1. Función eliminarEmpresa + función descargarRespaldo, justo antes del "return ("
reemplazarGlobal(
  "1-funciones",
  `async function marcarEnviado(id: string) {
    await fetch("/api/superadmin/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    cargarDatos();
  }

  return (`,
  `async function marcarEnviado(id: string) {
    await fetch("/api/superadmin/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    cargarDatos();
  }

  async function eliminarEmpresa(id: string, nombre: string) {
    const confirmacion = window.prompt(
      \`Esto borra "\${nombre}" y TODOS sus datos (camiones, ventas, gastos, choferes, todo). No se puede deshacer.\\n\\nEscribí el nombre exacto de la empresa para confirmar:\`
    );
    if (confirmacion !== nombre) {
      if (confirmacion !== null) window.alert("El nombre no coincide, no se borró nada.");
      return;
    }
    setAccionEnCurso(\`\${id}:eliminar\`);
    try {
      await fetch(\`/api/superadmin/empresas/\${id}\`, { method: "DELETE" });
      await cargarDatos();
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function descargarRespaldo() {
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

  return (`
);

// 2. Botón de respaldo en el header, al lado de "+ Nueva empresa"
reemplazarGlobal(
  "2-header",
  `<button
          onClick={() => setMostrarForm(true)}
          className="rounded-full bg-[#0E7C7B] text-white text-sm px-4 py-2 font-medium"
        >
          + Nueva empresa
        </button>`,
  `<div className="flex gap-2">
          <button
            onClick={descargarRespaldo}
            className="rounded-full border border-gray-200 text-gray-600 text-sm px-4 py-2 font-medium"
          >
            Respaldo del sistema
          </button>
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-full bg-[#0E7C7B] text-white text-sm px-4 py-2 font-medium"
          >
            + Nueva empresa
          </button>
        </div>`
);

// 3. Botón "Eliminar cliente" en la tarjeta de cada empresa
reemplazarGlobal(
  "3-boton-eliminar",
  `<button
                    onClick={() => accionEmpresa(empresa.id, "desbloquear")}
                    disabled={!!accionEnCurso}
                    className="rounded-lg border border-emerald-200 text-emerald-600 text-xs px-3 py-1.5 font-medium disabled:opacity-50"
                  >
                    Desbloquear
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>`,
  `<button
                    onClick={() => accionEmpresa(empresa.id, "desbloquear")}
                    disabled={!!accionEnCurso}
                    className="rounded-lg border border-emerald-200 text-emerald-600 text-xs px-3 py-1.5 font-medium disabled:opacity-50"
                  >
                    Desbloquear
                  </button>
                )}
                <button
                  onClick={() => eliminarEmpresa(empresa.id, empresa.nombre)}
                  disabled={!!accionEnCurso}
                  className="rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs px-3 py-1.5 font-medium disabled:opacity-50"
                >
                  {accionEnCurso === \`\${empresa.id}:eliminar\` ? "Borrando..." : "Eliminar cliente"}
                </button>
              </div>
            </div>
          ))}
        </section>`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
