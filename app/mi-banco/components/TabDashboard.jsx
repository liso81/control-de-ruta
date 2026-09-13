"use client";

import { useEffect, useState } from "react";
import { formatearMonto } from "@/lib/formato";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORES = ["#4f46e5", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#ec4899"];

export default function TabDashboard() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/mi-banco/dashboard");
    if (res.ok) setDatos(await res.json());
    setCargando(false);
  }

  if (cargando) return <p className="text-slate-500 text-sm">Cargando...</p>;
  if (!datos) return <p className="text-slate-500 text-sm">No se pudo cargar el resumen.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Balance total en cuentas</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">{formatearMonto(datos.balanceTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Cuentas y sobres activos</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">{datos.cuentas.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Gastos por categoria (este mes)</h3>
          {datos.gastoPorCategoria.length === 0 ? (
            <p className="text-sm text-slate-400">Todavia no cargaste gastos este mes.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={datos.gastoPorCategoria}
                  dataKey="total"
                  nameKey="nombre"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {datos.gastoPorCategoria.map((entry, i) => (
                    <Cell key={entry.categoria_id} fill={entry.color || COLORES[i % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatearMonto(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Ingresos vs gastos (ultimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={datos.evolucionMensual}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="clave" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatearMonto(v)} />
              <Legend />
              <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Tus cuentas y sobres</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {datos.cuentas.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {c.icono} {c.nombre}
                  {c.tipo === "sobre" && <span className="ml-1 text-xs text-indigo-500">(sobre)</span>}
                </p>
                <p className="text-lg font-semibold text-slate-900">{formatearMonto(c.saldo)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
