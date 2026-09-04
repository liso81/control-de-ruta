// lib/formato.ts

// Formatea un número con separador de miles (punto) y decimales (coma),
// ej: 20000 -> "20.000,00". Acepta null/undefined y los trata como 0.
export function formatearMonto(valor: number | null | undefined, decimales = 2): string {
  const n = valor ?? 0;
  return n.toLocaleString("es", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
