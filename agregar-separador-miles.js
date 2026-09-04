// agregar-separador-miles.js
// Corré esto UNA sola vez con: node agregar-separador-miles.js

const fs = require("fs");

const ARCHIVOS = ["app/page.tsx", "app/admin/page.tsx"];

for (const archivo of ARCHIVOS) {
  let content = fs.readFileSync(archivo, "utf8");
  const original = content;
  let totalReemplazos = 0;

  // Caso 1: (expresion).toFixed(2)  -- sin paréntesis anidados adentro
  content = content.replace(/\(([^()]*)\)\.toFixed\(2\)/g, (match, expr) => {
    totalReemplazos++;
    return `formatearMonto(${expr})`;
  });

  // Caso 2: identificador.encadenado.toFixed(2)  -- sin paréntesis
  content = content.replace(/\b([a-zA-Z_$][\w$]*(?:\??\.[a-zA-Z_$][\w$]*)+)\.toFixed\(2\)/g, (match, expr) => {
    totalReemplazos++;
    return `formatearMonto(${expr})`;
  });

  if (totalReemplazos === 0) {
    console.log(`⚠️  ${archivo}: no se encontraron .toFixed(2) para reemplazar (¿ya estaba aplicado?)`);
    continue;
  }

  // Agregar el import, justo después de la primera línea "import ... from ..."
  if (!content.includes('from "@/lib/formato"')) {
    const primerImport = content.match(/^import .+;\n/m);
    if (primerImport) {
      content = content.replace(
        primerImport[0],
        primerImport[0] + `import { formatearMonto } from "@/lib/formato";\n`
      );
    }
  }

  if (content === original) {
    console.log(`⚠️  ${archivo}: no cambió nada.`);
    continue;
  }

  fs.writeFileSync(archivo, content, "utf8");
  console.log(`✅ ${archivo}: ${totalReemplazos} reemplazos aplicados.`);
}
