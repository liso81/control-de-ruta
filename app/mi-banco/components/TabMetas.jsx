"use client";

import { useEffect, useState } from "react";
import { formatearMonto } from "@/lib/formato";

export default function TabMetas() {
  const [metas, setMetas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [montoObjetivo, setMontoObjetivo] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const [resMetas, resCuentas] = await Promise.all([
      fetch("/api/mi-banco/metas"),
      fetch("/api/mi-banco/cuentas"),
    ]);
    if (resMetas.ok) setMetas(await resMetas.json());
    if (resCuentas.ok) setCuentas(await resCuentas.json());
    setCargando(false);
  }

  async function crear(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !montoObjetivo) return;

    const res = await fetch("/api/mi-banco/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        monto_objetivo: Number(montoObjetivo),
        cuenta_id: cuentaId || null,
        fecha_objetivo: fechaObjetivo || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear la meta");
      return;
    }

    setNombre("");
    setMontoObjetivo("");
    setCuentaId("");
    setFechaObjetivo("");
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar esta meta?")) return;
    await fetch(`/api/mi-banco/metas/${id}`, { method: "DELETE" });
    cargar();
  }

  async function actualizarManual(id, valor) {
    await fetch(`/api/mi-banco/metas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto_actual_manual: Number(valor) || 0 }),
    });
    cargar();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={crear} className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre de la meta" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input type="number" step="0.01" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Monto objetivo" value={montoObjetivo} onChange={(e) => setMontoObjetivo(e.target.value)} />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
          <option value="">Sin cuenta ligada (manual)</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
          ))}
        </select>
        <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={fechaObjetivo} onChange={(e) => setFechaObjetivo(e.target.value)} />
        <button className="rounded-lg bg-indigo-600 text-white text-sm font-medium py-2 hover:bg-indigo-700 sm:col-span-2 lg:col-span-4">
          Crear meta
        </button>
        {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{error}</p>}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : metas.length === 0 ? (
          <p className="text-sm text-slate-400">Todavia no tenes metas de ahorro.</p>
        ) : (
          metas.map((m) => {
            const porcentaje = m.monto_objetivo > 0 ? Math.min(100, (m.monto_actual / m.monto_objetivo) * 100) : 0;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-800">{m.icono} {m.nombre}</p>
                  <button onClick={() => eliminar(m.id)} className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-2">
                  {formatearMonto(m.monto_actual)} de {formatearMonto(m.monto_objetivo)}
                  {m.fecha_objetivo && ` · objetivo: ${m.fecha_objetivo}`}
                </p>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${porcentaje}%` }} />
                </div>
                {!m.cuenta_id && (
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    placeholder="Actualizar monto ahorrado"
                    defaultValue={m.monto_actual_manual}
                    onBlur={(e) => actualizarManual(m.id, e.target.value)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
