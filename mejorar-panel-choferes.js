// mejorar-panel-choferes.js
// Corré esto UNA sola vez con: node mejorar-panel-choferes.js

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

// 1. Teléfono clickeable (llama) en la tarjeta de pendientes, y agregar botón "Rechazar"
reemplazarGlobal(
  "1-pendientes",
  `<p className="text-sm font-semibold text-[var(--color-ink)] mb-1">
                  {s.telefono || "Sin número"}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)] mb-2">
                  Solicitó acceso · {new Date(s.created_at).toLocaleString("es")}
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
                </button>`,
  `<div className="flex justify-between items-center mb-1">
                  {s.telefono ? (
                    <a href={\`tel:\${s.telefono}\`} className="text-sm font-semibold text-[var(--color-accent)] underline">
                      📞 {s.telefono}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Sin número</p>
                  )}
                </div>
                <p className="text-xs text-[var(--color-ink-soft)] mb-2">
                  Solicitó acceso · {new Date(s.created_at).toLocaleString("es")}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => aprobar(s.id)}
                    disabled={!camionElegido[s.id] || aprobando === s.id}
                    className="flex-1 rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2 text-sm active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {aprobando === s.id ? "Aprobando..." : "Aprobar"}
                  </button>
                  <button
                    onClick={() => revocar(s.id)}
                    className="rounded-xl border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-3 py-2 text-sm active:scale-95 transition"
                  >
                    Rechazar
                  </button>
                </div>`
);

// 2. Teléfono clickeable también en la lista de "Choferes con acceso"
reemplazarGlobal(
  "2-aprobados",
  `<span className="text-sm">{s.camion?.matricula || s.camion?.nombre || "Camión"}</span>
                <button
                  onClick={() => revocar(s.id)}
                  className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition"
                >
                  Revocar
                </button>`,
  `<div>
                  <p className="text-sm font-medium">{s.camion?.matricula || s.camion?.nombre || "Camión"}</p>
                  {s.telefono && (
                    <a href={\`tel:\${s.telefono}\`} className="text-xs text-[var(--color-accent)] underline">
                      📞 {s.telefono}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => revocar(s.id)}
                  className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition"
                >
                  Revocar
                </button>`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
