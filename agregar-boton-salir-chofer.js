// agregar-boton-salir-chofer.js
// Corré esto UNA sola vez con: node agregar-boton-salir-chofer.js

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

reemplazarGlobal(
  "boton-salir",
  `if (!turno) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-ink-soft)]">Cargando turno...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto" style={{ background: "var(--color-bg)" }}>
      <h1 className="font-display text-3xl font-bold mb-1 text-[var(--color-ink)]">CONTROL DE RUTA</h1>
      <p className="text-[var(--color-ink-soft)] mb-2">
        {turno.chofer_nombre} · {camion.matricula || camion.nombre}
      </p>`,
  `if (!turno) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-ink-soft)]">Cargando turno...</p>
      </main>
    );
  }

  function salir() {
    localStorage.removeItem("camion_id");
    window.location.reload();
  }

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto" style={{ background: "var(--color-bg)" }}>
      <div className="flex justify-between items-start mb-1">
        <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">CONTROL DE RUTA</h1>
        <button
          onClick={salir}
          className="text-xs font-medium rounded-xl border border-[var(--color-border)] px-3 py-1.5 active:scale-95 transition bg-white"
        >
          Salir
        </button>
      </div>
      <p className="text-[var(--color-ink-soft)] mb-2">
        {turno.chofer_nombre} · {camion.matricula || camion.nombre}
      </p>`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
