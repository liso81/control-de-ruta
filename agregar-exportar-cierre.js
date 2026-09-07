// agregar-exportar-cierre.js
// Corré esto UNA sola vez con: node agregar-exportar-cierre.js
// Antes hay que instalar las librerías: npm install xlsx jspdf

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

// 1. Imports de las librerías nuevas
reemplazarGlobal(
  "1-imports",
  `import { useEffect, useState, useRef } from "react";
import { formatearMonto } from "@/lib/formato";`,
  `import { useEffect, useState, useRef } from "react";
import { formatearMonto } from "@/lib/formato";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";`
);

// 2. Funciones exportarExcel / exportarPDF dentro de DetalleTurno, justo
// antes del "return (" del componente.
reemplazarGlobal(
  "2-funciones",
  `const efectivoDisponible = turno.saldo_inicial + turno.fondo_dueno + ventasEfectivo - totalCompras - totalGastos;

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver
      </button>
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">
        {turno.fecha} · {turno.chofer_nombre}
      </h2>`,
  `const efectivoDisponible = turno.saldo_inicial + turno.fondo_dueno + ventasEfectivo - totalCompras - totalGastos;

  const gastosAgrupados = agruparPorConcepto(
    [...compras, ...gastos].map((m) => ({ concepto: m.categoria ?? m.tipo, monto: m.monto ?? 0 }))
  );

  function exportarExcel() {
    const resumen: (string | number)[][] = [
      ["Cierre de turno"],
      ["Fecha", turno.fecha],
      ["Chofer", turno.chofer_nombre],
      [],
      ["Saldo inicial", turno.saldo_inicial],
      ["Fondo añadido", turno.fondo_dueno],
      ["Ventas en efectivo", ventasEfectivo],
      ["Ventas totales", ventasTotales],
      ["Compras", totalCompras],
      ["Gastos", totalGastos],
      ["Efectivo disponible", efectivoDisponible],
    ];

    if (turno.estado === "cerrado") {
      resumen.push([], ["Liquidación"]);
      resumen.push(["Entregado", turno.efectivo_entregado ?? 0]);
      resumen.push(["Remanente", turno.remanente ?? 0]);
      if (turno.desglose_efectivo) {
        resumen.push([], ["Desglose de billetes"]);
        Object.entries(turno.desglose_efectivo)
          .filter(([, cant]) => (cant as number) > 0)
          .forEach(([denom, cant]) => {
            resumen.push([\`\${cant} x \${denom}\`, Number(denom) * Number(cant)]);
          });
      }
    }

    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

    const filasVentas: (string | number)[][] = [
      ["Litros", "Cliente", "Monto"],
      ...ventas.map((m) => [m.litros ?? "", m.cliente_nota ?? "", m.monto ?? 0]),
    ];
    const wsVentas = XLSX.utils.aoa_to_sheet(filasVentas);

    const filasGastos: (string | number)[][] = [
      ["Concepto", "Cantidad", "Total"],
      ...gastosAgrupados.map((g) => [g.concepto, g.cantidad, g.total]),
    ];
    const wsGastos = XLSX.utils.aoa_to_sheet(filasGastos);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");
    XLSX.utils.book_append_sheet(wb, wsGastos, "Compras y gastos");

    XLSX.writeFile(wb, \`cierre-\${turno.fecha}-\${turno.chofer_nombre}.xlsx\`);
  }

  function exportarPDF() {
    const doc = new jsPDF();
    let y = 15;

    doc.setFontSize(16);
    doc.text("Cierre de turno", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(\`Fecha: \${turno.fecha}\`, 14, y);
    y += 6;
    doc.text(\`Chofer: \${turno.chofer_nombre}\`, 14, y);
    y += 10;

    doc.setFontSize(12);
    doc.text("Resumen", 14, y);
    y += 6;
    doc.setFontSize(10);
    const filasResumen: [string, string][] = [
      ["Saldo inicial", formatearMonto(turno.saldo_inicial)],
      ["Fondo añadido", formatearMonto(turno.fondo_dueno)],
      ["Ventas en efectivo", formatearMonto(ventasEfectivo)],
      ["Ventas totales", formatearMonto(ventasTotales)],
      ["Compras", formatearMonto(totalCompras)],
      ["Gastos", formatearMonto(totalGastos)],
      ["Efectivo disponible", formatearMonto(efectivoDisponible)],
    ];
    filasResumen.forEach(([label, val]) => {
      doc.text(\`\${label}: \${val}\`, 14, y);
      y += 6;
    });

    if (turno.estado === "cerrado") {
      y += 4;
      doc.setFontSize(12);
      doc.text("Liquidación", 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(\`Entregado: \${formatearMonto(turno.efectivo_entregado ?? 0)}\`, 14, y);
      y += 6;
      doc.text(\`Remanente: \${formatearMonto(turno.remanente ?? 0)}\`, 14, y);
      y += 6;
      if (turno.desglose_efectivo) {
        Object.entries(turno.desglose_efectivo)
          .filter(([, cant]) => (cant as number) > 0)
          .forEach(([denom, cant]) => {
            doc.text(\`\${cant} x \${denom} = \${formatearMonto(Number(denom) * Number(cant))}\`, 14, y);
            y += 5;
          });
      }
    }

    y += 6;
    doc.setFontSize(12);
    doc.text("Ventas", 14, y);
    y += 6;
    doc.setFontSize(9);
    if (ventas.length === 0) {
      doc.text("Sin ventas.", 14, y);
      y += 5;
    }
    ventas.forEach((m) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(\`Venta \${m.litros ? m.litros + "L" : ""} \${m.cliente_nota ?? ""} - \${formatearMonto(m.monto ?? 0)}\`, 14, y);
      y += 5;
    });

    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(12);
    doc.text("Compras y gastos", 14, y);
    y += 6;
    doc.setFontSize(9);
    if (gastosAgrupados.length === 0) {
      doc.text("Sin compras ni gastos.", 14, y);
      y += 5;
    }
    gastosAgrupados.forEach((g) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(\`\${g.concepto} (x\${g.cantidad}) - \${formatearMonto(g.total)}\`, 14, y);
      y += 5;
    });

    doc.save(\`cierre-\${turno.fecha}-\${turno.chofer_nombre}.pdf\`);
  }

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver
      </button>
      <div className="flex gap-2 mb-2">
        <button
          onClick={exportarExcel}
          className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 active:scale-95 transition"
        >
          📊 Exportar Excel
        </button>
        <button
          onClick={exportarPDF}
          className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 active:scale-95 transition"
        >
          📄 Exportar PDF
        </button>
      </div>
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">
        {turno.fecha} · {turno.chofer_nombre}
      </h2>`
);

if (content === original) {
  throw new Error("El archivo no cambió. Algo salió mal.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ Patch aplicado correctamente a " + path);
