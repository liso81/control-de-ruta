"use client";

import { useEffect, useState } from "react";
import { formatearMonto } from "@/lib/formato";

export default function TabPresupuestos() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [categoriasGasto, setCategoriasGasto] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaId, setCategoriaId] = useState("");
  const [montoMensual, setMontoMensual] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const [resPres, resCat] = await Promise.all([
      fetch("/api/mi-banco/presupuestos"),
      fetch("/api/mi-banco/categorias"),
    ]);
    if (resPres.ok) setPresupuestos(await resPres.json());
    if (resCat.ok) {
      const todas = await resCat.json();
      setCategoriasGasto(todas.filter((c) => c.tipo === "gasto"));
    }
    setCargando(false);
  }

  async function guardar(e) {
    e.preventDefault();
    setError("");
    if (!categoriaId || !montoMensual) return;

    const res = await fetch("/api/mi-banco/presupuestos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria_id: categoriaId, monto_mensual: Number(montoMensual) }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo guardar el presupuesto");
      return;
    }

    setCategoriaId("");
    setMontoMensual("");
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    await fetch(`/api/mi-banco/presupuestos/${id}`, { method: "DELETE" });
    cargar();
  }

  const categoriasSinPresupuesto = categoriasGasto.filter(
    (c) => !presupuestos.some((p) => p.categoria_id === c.id)
  );

  return (
    <div className="space-y-6">
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-3">
        <select className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Elegi una categoria de gasto...</option>
          {categoriasGasto.map((c) => (
            <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
          ))}
        </select>
        <input type="number" step="0.01" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Presupuesto mensual" value={montoMensual} onChange={(e) => setMontoMensual(e.target.value)} />
        <button className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700">Guardar</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {categoriasGasto.length === 0 && (
        <p className="text-sm text-slate-400">Primero crea alguna categoria de gasto en la pestana Categorias.</p>
      )}
      {categoriaId === "" && categoriasSinPresupuesto.length === 0 && categoriasGasto.length > 0 && presupuestos.length > 0 && (
        <p className="text-sm text-slate-400">Ya tenes presupuesto para todas tus categorias de gasto.</p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : presupuestos.length === 0 ? (
          <p className="text-sm text-slate-400">Todavia no definiste presupuestos.</p>
        ) : (
          <div className="space-y-4">
            {presupuestos.map((p) => {
              const porcentaje = p.monto_mensual > 0 ? Math.min(100, (p.gastado_mes_actual / p.monto_mensual) * 100) : 0;
              const sobrepasado = p.gastado_mes_actual > p.monto_mensual;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">{p.categoria?.icono} {p.categoria?.nombre}</span>
                    <span className={sobrepasado ? "text-red-600 font-medium" : "text-slate-600"}>
                      {formatearMonto(p.gastado_mes_actual)} / {formatearMonto(p.monto_mensual)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sobrepasado ? "bg-red-500" : "bg-indigo-500"}`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  <button onClick={() => eliminar(p.id)} className="text-xs text-red-500 hover:underline mt-1">
                    Eliminar presupuesto
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
