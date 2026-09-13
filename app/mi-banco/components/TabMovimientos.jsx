"use client";

import { useEffect, useState } from "react";
import { formatearMonto } from "@/lib/formato";

export default function TabMovimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [tipo, setTipo] = useState("gasto");
  const [cuentaId, setCuentaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [comercio, setComercio] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const [resMov, resCuentas, resCat] = await Promise.all([
      fetch("/api/mi-banco/movimientos"),
      fetch("/api/mi-banco/cuentas"),
      fetch("/api/mi-banco/categorias"),
    ]);
    if (resMov.ok) setMovimientos(await resMov.json());
    if (resCuentas.ok) setCuentas(await resCuentas.json());
    if (resCat.ok) setCategorias(await resCat.json());
    setCargando(false);
  }

  async function agregar(e) {
    e.preventDefault();
    setError("");

    if (!cuentaId || !monto) {
      setError("Elegi una cuenta y un monto");
      return;
    }

    const res = await fetch("/api/mi-banco/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuenta_id: cuentaId,
        categoria_id: categoriaId || null,
        tipo,
        monto: Number(monto),
        descripcion,
        comercio,
        fecha,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo cargar el movimiento");
      return;
    }

    setMonto("");
    setDescripcion("");
    setComercio("");
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    await fetch(`/api/mi-banco/movimientos/${id}`, { method: "DELETE" });
    cargar();
  }

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  return (
    <div className="space-y-6">
      <form onSubmit={agregar} className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={tipo} onChange={(e) => { setTipo(e.target.value); setCategoriaId(""); }}>
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
        </select>

        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
          <option value="">Cuenta / sobre...</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
          ))}
        </select>

        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Categoria (opcional)</option>
          {categoriasFiltradas.map((c) => (
            <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
          ))}
        </select>

        <input type="number" step="0.01" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Comercio (opcional)" value={comercio} onChange={(e) => setComercio(e.target.value)} />
        <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={fecha} onChange={(e) => setFecha(e.target.value)} />

        <button className="rounded-lg bg-indigo-600 text-white text-sm font-medium py-2 hover:bg-indigo-700 lg:col-span-1 sm:col-span-2">
          Agregar movimiento
        </button>

        {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {cargando ? (
          <p className="p-5 text-sm text-slate-400">Cargando...</p>
        ) : movimientos.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Todavia no hay movimientos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Cuenta</th>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Descripcion</th>
                <th className="px-4 py-2 font-medium text-right">Monto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-600">{m.fecha}</td>
                  <td className="px-4 py-2 text-slate-600">{m.cuenta?.icono} {m.cuenta?.nombre}</td>
                  <td className="px-4 py-2 text-slate-600">{m.categoria ? `${m.categoria.icono} ${m.categoria.nombre}` : "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{m.descripcion || "—"}{m.origen === "telegram" ? " 📲" : ""}</td>
                  <td className={`px-4 py-2 text-right font-medium ${Number(m.monto) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatearMonto(m.monto)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => eliminar(m.id)} className="text-xs text-red-500 hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
