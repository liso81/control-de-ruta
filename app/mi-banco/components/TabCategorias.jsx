"use client";

import { useEffect, useState } from "react";

export default function TabCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("gasto");
  const [icono, setIcono] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/mi-banco/categorias");
    if (res.ok) setCategorias(await res.json());
    setCargando(false);
  }

  async function crear(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return;

    const res = await fetch("/api/mi-banco/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo, icono: icono || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear la categoria");
      return;
    }

    setNombre("");
    setIcono("");
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar esta categoria?")) return;
    await fetch(`/api/mi-banco/categorias/${id}`, { method: "DELETE" });
    cargar();
  }

  const ingresos = categorias.filter((c) => c.tipo === "ingreso");
  const gastos = categorias.filter((c) => c.tipo === "gasto");

  return (
    <div className="space-y-6">
      <form onSubmit={crear} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-3">
        <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Icono" value={icono} onChange={(e) => setIcono(e.target.value)} />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
        </select>
        <button className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700">Agregar</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Grupo titulo="Categorias de ingreso" items={ingresos} onEliminar={eliminar} cargando={cargando} />
        <Grupo titulo="Categorias de gasto" items={gastos} onEliminar={eliminar} cargando={cargando} />
      </div>
    </div>
  );
}

function Grupo({ titulo, items, onEliminar, cargando }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-medium text-slate-700 mb-3">{titulo}</h3>
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin categorias todavia.</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <p className="text-sm text-slate-800">{c.icono} {c.nombre}</p>
              <button onClick={() => onEliminar(c.id)} className="text-xs text-red-500 hover:underline">
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
