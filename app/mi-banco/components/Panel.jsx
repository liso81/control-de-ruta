"use client";

import { useState } from "react";
import TabDashboard from "./TabDashboard";
import TabCuentas from "./TabCuentas";
import TabMovimientos from "./TabMovimientos";
import TabCategorias from "./TabCategorias";
import TabPresupuestos from "./TabPresupuestos";
import TabMetas from "./TabMetas";

const PESTANAS = [
  { id: "dashboard", etiqueta: "Resumen", Componente: TabDashboard },
  { id: "cuentas", etiqueta: "Cuentas", Componente: TabCuentas },
  { id: "movimientos", etiqueta: "Movimientos", Componente: TabMovimientos },
  { id: "categorias", etiqueta: "Categorias", Componente: TabCategorias },
  { id: "presupuestos", etiqueta: "Presupuestos", Componente: TabPresupuestos },
  { id: "metas", etiqueta: "Metas de ahorro", Componente: TabMetas },
];

export default function Panel({ username, onLogout }) {
  const [pestanaActiva, setPestanaActiva] = useState("dashboard");
  const Activa = PESTANAS.find((p) => p.id === pestanaActiva)?.Componente ?? TabDashboard;

  async function salir() {
    await fetch("/api/mi-banco/logout", { method: "POST" });
    onLogout();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏦</span>
            <div>
              <h1 className="font-semibold text-slate-900 leading-none">Mi Banco</h1>
              <p className="text-xs text-slate-500">Hola, {username}</p>
            </div>
          </div>
          <button onClick={salir} className="text-sm text-slate-500 hover:text-slate-800">
            Salir
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPestanaActiva(p.id)}
              className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-full ${
                pestanaActiva === p.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Activa />
      </main>
    </div>
  );
}
