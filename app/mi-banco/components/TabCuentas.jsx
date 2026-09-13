"use client";

import { useEffect, useState } from "react";
import { formatearMonto } from "@/lib/formato";

export default function TabCuentas() {
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("cuenta");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [transferOrigen, setTransferOrigen] = useState("");
  const [transferDestino, setTransferDestino] = useState("");
  const [transferMonto, setTransferMonto] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/mi-banco/cuentas");
    if (res.ok) setCuentas(await res.json());
    setCargando(false);
  }

  async function crearCuenta(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return;

    const res = await fetch("/api/mi-banco/cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo, saldo_inicial: Number(saldoInicial) || 0 }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear la cuenta");
      return;
    }

    setNombre("");
    setSaldoInicial("");
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    await fetch(`/api/mi-banco/cuentas/${id}`, { method: "DELETE" });
    cargar();
  }

  async function transferir(e) {
    e.preventDefault();
    setError("");

    if (!transferOrigen || !transferDestino || !transferMonto) return;

    const res = await fetch("/api/mi-banco/transferencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuenta_origen_id: transferOrigen,
        cuenta_destino_id: transferDestino,
        monto: Number(transferMonto),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo transferir");
      return;
    }

    setTransferOrigen("");
    setTransferDestino("");
    setTransferMonto("");
    cargar();
  }

  const cuentasReales = cuentas.filter((c) => c.tipo === "cuenta");
  const sobres = cuentas.filter((c) => c.tipo === "sobre");

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Grupo titulo="Cuentas (dinero real)" items={cuentasReales} onEliminar={eliminar} cargando={cargando} />
        <Grupo titulo="Sobres virtuales" items={sobres} onEliminar={eliminar} cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={crearCuenta} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Nueva cuenta o sobre</h3>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nombre (ej. Banco, Efectivo, Vacaciones)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="cuenta">Cuenta (dinero real: banco, efectivo)</option>
            <option value="sobre">Sobre virtual (presupuesto interno)</option>
          </select>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Saldo inicial (opcional)"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
          />
          <button className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2 hover:bg-indigo-700">
            Crear
          </button>
        </form>

        <form onSubmit={transferir} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Transferir entre cuentas / sobres</h3>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={transferOrigen} onChange={(e) => setTransferOrigen(e.target.value)}>
            <option value="">Desde...</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
            ))}
          </select>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={transferDestino} onChange={(e) => setTransferDestino(e.target.value)}>
            <option value="">Hacia...</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Monto"
            value={transferMonto}
            onChange={(e) => setTransferMonto(e.target.value)}
          />
          <button className="w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800">
            Transferir
          </button>
        </form>
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
        <p className="text-sm text-slate-400">Sin registros todavia.</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <div>
                <p className="text-sm text-slate-800">{c.icono} {c.nombre}</p>
                <p className="text-sm font-semibold text-slate-900">{formatearMonto(c.saldo)}</p>
              </div>
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
