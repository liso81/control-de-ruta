// arreglar-salir-chofer.js
// Corré esto UNA sola vez con: node arreglar-salir-chofer.js

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

// 1. iniciar(): antes de mostrar el listado (que puede estar bloqueado),
// chequear si este teléfono ya tiene un device_id aprobado.
reemplazarGlobal(
  "1-iniciar",
  `async function iniciar() {
    const camionGuardado = localStorage.getItem("camion_id");
    if (!camionGuardado) {
      const res = await fetch("/api/camiones");
      const json = await res.json();
      if (json.error) setErrorCamiones(json.error);
      setCamiones(json.camiones ?? []);
      setCargando(false);
      return;
    }
    await cargarCamionYTurno(camionGuardado);
  }`,
  `async function iniciar() {
    const camionGuardado = localStorage.getItem("camion_id");
    if (!camionGuardado) {
      // Si este teléfono ya fue aprobado antes (aunque haya tocado "Salir"),
      // lo reconocemos solo, sin pedir el link de invitación de nuevo.
      const deviceId = localStorage.getItem("device_id");
      if (deviceId) {
        const resEstado = await fetch(\`/api/unirse/estado?device_id=\${deviceId}\`);
        const jsonEstado = await resEstado.json();
        if (jsonEstado.estado === "aprobado" && jsonEstado.camion_id) {
          localStorage.setItem("camion_id", jsonEstado.camion_id);
          await cargarCamionYTurno(jsonEstado.camion_id);
          return;
        }
      }

      const res = await fetch("/api/camiones");
      const json = await res.json();
      if (json.error) setErrorCamiones(json.error);
      setCamiones(json.camiones ?? []);
      setCargando(false);
      return;
    }
    await cargarCamionYTurno(camionGuardado);
  }`
);

// 2. salir(): solo borra el camión activo, no el device_id (así lo puede
// reconocer de nuevo al volver a entrar).
reemplazarGlobal(
  "2-salir",
  `function salir() {
    localStorage.removeItem("camion_id");
    window.location.reload();
  }`,
  `function salir() {
    localStorage.removeItem("camion_id");
    // OJO: a propósito NO borramos "device_id" — así, si este teléfono ya
    // fue aprobado, se re-vincula solo al volver a entrar, sin pedir el
    // link de invitación de nuevo.
    window.location.reload();
  }`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
