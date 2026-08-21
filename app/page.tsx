"use client";

import { useEffect, useState } from "react";
import type { Camion, Turno, Movimiento, TipoMovimiento } from "@/lib/tipos";

const CATEGORIAS_GASTO = [
  "Policía",
  "Ponchera",
  "Salario de motorista",
  "Salario de ayudante",
  "Alimentación",
  "Gastos de reparaciones menores",
  "Otros",
];
const UMBRAL_SOBRANTE = 0.01;
const DENOMINACIONES = [5000, 2000, 1000, 500, 200];

export default function Home() {
  const [cargando, setCargando] = useState(true);
  const [camion, setCamion] = useState<Camion | null>(null);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [pideNombre, setPideNombre] = useState(false);
  const [nombreInput, setNombreInput] = useState("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [tab, setTab] = useState<"resumen" | "compras" | "ventas" | "gastos">("resumen");
  const [error, setError] = useState("");

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    const camionGuardado = localStorage.getItem("camion_id");
    if (!camionGuardado) {
      const res = await fetch("/api/camiones");
      const json = await res.json();
      setCamiones(json.camiones ?? []);
      setCargando(false);
      return;
    }
    await cargarCamionYTurno(camionGuardado);
  }

  async function recargarCamion(camionId: string) {
    const res = await fetch("/api/camiones");
    const json = await res.json();
    const actualizado = (json.camiones ?? []).find((c: Camion) => c.id === camionId);
    if (actualizado) setCamion(actualizado);
    return actualizado as Camion | undefined;
  }

  async function cargarCamionYTurno(camionId: string) {
    setCargando(true);
    const encontrado = await recargarCamion(camionId);
    if (!encontrado) {
      localStorage.removeItem("camion_id");
      setCargando(false);
      iniciar();
      return;
    }
    await abrirORetomarTurno(camionId);
    setCargando(false);
  }

  async function abrirORetomarTurno(camionId: string, choferNombre?: string) {
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camion_id: camionId, chofer_nombre: choferNombre }),
    });
    const json = await res.json();

    if (json.requiereNombre) {
      setPideNombre(true);
      return;
    }

    if (json.turno) {
      setTurno(json.turno);
      setPideNombre(false);
      await cargarMovimientos(json.turno.id);
    }
  }

  async function cargarMovimientos(turnoId: string) {
    const res = await fetch(`/api/movimientos?turno_id=${turnoId}`);
    const json = await res.json();
    setMovimientos(json.movimientos ?? []);
  }

  function vincularCamion(c: Camion) {
    localStorage.setItem("camion_id", c.id);
    setCamion(c);
    abrirORetomarTurno(c.id);
  }

  function confirmarNombre() {
    if (!nombreInput.trim() || !camion) return;
    abrirORetomarTurno(camion.id, nombreInput.trim());
  }

  async function registrarMovimiento(datos: Partial<Movimiento> & { tipo: TipoMovimiento }) {
    if (!turno || !camion) return false;
    setError("");
    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...datos, turno_id: turno.id, camion_id: camion.id }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      if (json.error.includes("efectivo disponible")) {
        window.alert("⚠️ " + json.error);
      }
      return false;
    }
    await Promise.all([cargarMovimientos(turno.id), recargarCamion(camion.id)]);
    return true;
  }

  async function editarMovimiento(id: string, datos: Partial<Movimiento>) {
    if (!turno || !camion) return false;
    setError("");
    const res = await fetch(`/api/movimientos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...datos, camion_id: camion.id }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      if (json.error.includes("efectivo disponible")) {
        window.alert("⚠️ " + json.error);
      }
      return false;
    }
    await Promise.all([cargarMovimientos(turno.id), recargarCamion(camion.id)]);
    return true;
  }

  // --- Cálculos del resumen ---
  const ventas = movimientos.filter((m) => m.tipo === "venta");
  const compras = movimientos.filter((m) => m.tipo === "compra_agua" || m.tipo === "compra_gasoleo");
  const gastos = movimientos.filter((m) => m.tipo === "gasto");
  const alertas = movimientos.filter((m) => m.tipo === "alerta_sobrante");

  const ventasEfectivo = ventas.reduce((acc, m) => acc + (m.efectivo ?? 0), 0);
  const ventasTotales = ventas.reduce((acc, m) => acc + (m.efectivo ?? 0) + (m.transferencia ?? 0) + (m.credito ?? 0), 0);
  const totalCompras = compras.reduce((acc, m) => acc + (m.monto ?? 0), 0);
  const totalGastos = gastos.reduce((acc, m) => acc + (m.monto ?? 0), 0);
  const totalLitrosVendidosHoy = ventas.reduce((acc, m) => acc + (m.litros ?? 0), 0);
  const precioPromedioHoy = totalLitrosVendidosHoy > 0 ? ventasTotales / totalLitrosVendidosHoy : null;

  const saldoInicial = turno?.saldo_inicial ?? 0;
  const fondoDueno = turno?.fondo_dueno ?? 0;
  const efectivoDisponible = saldoInicial + fondoDueno + ventasEfectivo - totalCompras - totalGastos;

  if (cargando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  if (!camion) {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Vincular este dispositivo</h1>
        <p className="text-sm text-gray-600 mb-4">Elegí a qué camión pertenece este teléfono. Esta elección queda guardada.</p>
        <div className="space-y-2">
          {camiones.map((c) => (
            <button
              key={c.id}
              onClick={() => vincularCamion(c)}
              className="w-full border rounded-lg p-4 text-left hover:bg-gray-50"
            >
              <div className="font-semibold">{c.nombre}</div>
              <div className="text-sm text-gray-500">
                {c.litros_actual.toFixed(2)} L / {c.capacidad_litros.toFixed(2)} L
              </div>
            </button>
          ))}
          {camiones.length === 0 && <p className="text-gray-500">No hay camiones cargados todavía.</p>}
        </div>
      </main>
    );
  }

  if (pideNombre) {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto flex flex-col justify-center gap-4">
        <h1 className="text-2xl font-bold">{camion.nombre}</h1>
        <p className="text-sm text-gray-600">¿Quién maneja hoy?</p>
        <input
          type="text"
          value={nombreInput}
          onChange={(e) => setNombreInput(e.target.value)}
          placeholder="Nombre del chofer"
          className="border rounded-lg p-3"
        />
        <button onClick={confirmarNombre} className="bg-black text-white rounded-lg p-3 font-semibold">
          Empezar turno
        </button>
      </main>
    );
  }

  if (!turno) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando turno...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto">
      <h1 className="text-3xl font-black mb-1">CONTROL DE RUTA</h1>
      <p className="text-gray-600 mb-2">
        {turno.chofer_nombre} · {camion.nombre}
      </p>
      <p className="mb-4">
        Agua en existencia: <strong>{camion.litros_actual.toFixed(2)} L</strong> / {camion.capacidad_litros.toFixed(2)} L
      </p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["resumen", "compras", "ventas", "gastos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border rounded-lg p-2 text-sm capitalize ${tab === t ? "bg-black text-white" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {tab === "resumen" && (
        <TabResumen
          turno={turno}
          saldoInicial={saldoInicial}
          fondoDueno={fondoDueno}
          ventasEfectivo={ventasEfectivo}
          ventasTotales={ventasTotales}
          totalCompras={totalCompras}
          totalGastos={totalGastos}
          efectivoDisponible={efectivoDisponible}
          alertas={alertas}
          onGuardarFondo={(monto) => registrarFondo(turno, monto, setTurno)}
          onCerrarDia={(entregado, remanente, desglose) => cerrarDia(turno, entregado, remanente, desglose, setTurno)}
        />
      )}

      {tab === "compras" && (
        <TabCompras
          movimientos={compras}
          camion={camion}
          precioPromedioHoy={precioPromedioHoy}
          onRegistrar={registrarMovimiento}
          onEditar={editarMovimiento}
        />
      )}

      {tab === "ventas" && (
        <TabVentas movimientos={ventas} camion={camion} onRegistrar={registrarMovimiento} onEditar={editarMovimiento} />
      )}

      {tab === "gastos" && (
        <TabGastos movimientos={gastos} onRegistrar={registrarMovimiento} onEditar={editarMovimiento} />
      )}
    </main>
  );
}

async function registrarFondo(turno: Turno, monto: number, setTurno: (t: Turno) => void) {
  const res = await fetch("/api/turnos/fondo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turno_id: turno.id, fondo_dueno: monto }),
  });
  const json = await res.json();
  if (json.turno) setTurno(json.turno);
}

async function cerrarDia(
  turno: Turno,
  entregado: number,
  remanente: number,
  desglose: Record<number, number>,
  setTurno: (t: Turno) => void
) {
  const res = await fetch("/api/turnos/cerrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turno_id: turno.id, efectivo_entregado: entregado, remanente, desglose_efectivo: desglose }),
  });
  const json = await res.json();
  if (json.turno) setTurno(json.turno);
}

function TabResumen({
  turno,
  saldoInicial,
  fondoDueno,
  ventasEfectivo,
  ventasTotales,
  totalCompras,
  totalGastos,
  efectivoDisponible,
  alertas,
  onGuardarFondo,
  onCerrarDia,
}: {
  turno: Turno;
  saldoInicial: number;
  fondoDueno: number;
  ventasEfectivo: number;
  ventasTotales: number;
  totalCompras: number;
  totalGastos: number;
  efectivoDisponible: number;
  alertas: Movimiento[];
  onGuardarFondo: (monto: number) => void;
  onCerrarDia: (entregado: number, remanente: number, desglose: Record<number, number>) => void;
}) {
  const [fondoInput, setFondoInput] = useState("");
  const [billetes, setBilletes] = useState<Record<number, string>>(
    Object.fromEntries(DENOMINACIONES.map((d) => [d, ""]))
  );
  const cerrado = turno.estado === "cerrado";

  const entregado = DENOMINACIONES.reduce((acc, d) => acc + d * (parseInt(billetes[d]) || 0), 0);
  const remanente = efectivoDisponible - entregado;

  function actualizarBillete(denom: number, valor: string) {
    setBilletes((prev) => ({ ...prev, [denom]: valor }));
  }

  return (
    <div className="space-y-2">
      <p>Día — {turno.fecha}</p>
      <Fila label="Saldo inicial" valor={saldoInicial} />
      <Fila label="Fondo añadido" valor={fondoDueno} />
      <Fila label="Ventas en efectivo" valor={ventasEfectivo} />
      <Fila label="Ventas totales (todas)" valor={ventasTotales} />
      <Fila label="Compras" valor={totalCompras} />
      <Fila label="Otros gastos" valor={totalGastos} />
      <Fila label="Efectivo disponible" valor={efectivoDisponible} negrita />

      {alertas.length > 0 && (
        <div className="border border-amber-400 bg-amber-50 rounded-lg p-3 mt-2">
          <p className="font-semibold text-amber-800">⚠️ Alertas de litros sobrantes hoy</p>
          {alertas.map((a) => (
            <p key={a.id} className="text-sm text-amber-800">
              {a.litros?.toFixed(2)} L sin vender
              {a.monto ? ` · ≈ ${a.monto.toFixed(2)} dejados de ganar` : ""}
            </p>
          ))}
        </div>
      )}

      {!cerrado && (
        <>
          <div className="pt-3">
            <p className="font-semibold">Fondo que te dio el dueño hoy</p>
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                value={fondoInput}
                onChange={(e) => setFondoInput(e.target.value)}
                placeholder="0.00"
                className="border rounded-lg p-2 flex-1"
              />
              <button
                onClick={() => {
                  onGuardarFondo(parseFloat(fondoInput) || 0);
                  setFondoInput("");
                }}
                className="border rounded-lg px-3 font-semibold"
              >
                Guardar fondo
              </button>
            </div>
          </div>

          <div className="pt-3">
            <p className="font-semibold">Cerrar día / Liquidar</p>
            <p className="text-sm text-gray-600 mb-1">Desglose de efectivo entregado</p>
            <div className="space-y-1">
              {DENOMINACIONES.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-16 text-sm">{d}</span>
                  <input
                    type="number"
                    value={billetes[d]}
                    onChange={(e) => actualizarBillete(d, e.target.value)}
                    placeholder="0"
                    className="border rounded-lg p-2 flex-1"
                  />
                  <span className="w-24 text-sm text-right text-gray-600">
                    = {(d * (parseInt(billetes[d]) || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2">
              Total entregado: <strong>{entregado.toFixed(2)}</strong>
            </p>
            <p>
              Remanente (pasa a mañana): <strong>{remanente.toFixed(2)}</strong>
            </p>
            <button
              onClick={() => {
                const desglose = Object.fromEntries(DENOMINACIONES.map((d) => [d, parseInt(billetes[d]) || 0]));
                onCerrarDia(entregado, remanente, desglose);
              }}
              className="border rounded-lg p-2 mt-2 w-full font-semibold"
            >
              Cerrar día
            </button>
          </div>
        </>
      )}

      {cerrado && (
        <div className="pt-3">
          <p className="text-green-700 font-semibold">
            Día cerrado. Efectivo entregado: {turno.efectivo_entregado?.toFixed(2)} · Remanente: {turno.remanente?.toFixed(2)}
          </p>
          {turno.desglose_efectivo && (
            <div className="text-sm text-gray-600 mt-1">
              {Object.entries(turno.desglose_efectivo as Record<string, number>)
                .filter(([, cant]) => cant > 0)
                .map(([denom, cant]) => (
                  <p key={denom}>
                    {cant} × {denom} = {(Number(denom) * cant).toFixed(2)}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Fila({ label, valor, negrita }: { label: string; valor: number; negrita?: boolean }) {
  return (
    <div className={`flex justify-between border-b pb-1 ${negrita ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{valor.toFixed(2)}</span>
    </div>
  );
}

function TabCompras({
  movimientos,
  camion,
  precioPromedioHoy,
  onRegistrar,
  onEditar,
}: {
  movimientos: Movimiento[];
  camion: Camion;
  precioPromedioHoy: number | null;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
}) {
  const [valorAgua, setValorAgua] = useState("");
  const [precioGasoleo, setPrecioGasoleo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [montoEdit, setMontoEdit] = useState("");

  async function registrarCompraAgua() {
    const litrosRestantes = camion.litros_actual;

    if (litrosRestantes > UMBRAL_SOBRANTE) {
      let mensaje = `Todavía quedan ${litrosRestantes.toFixed(2)} L sin vender en la cisterna.`;
      let dineroPerdido: number | null = null;

      if (precioPromedioHoy) {
        dineroPerdido = litrosRestantes * precioPromedioHoy;
        mensaje += ` Eso representa aproximadamente ${dineroPerdido.toFixed(2)} dejados de ganar.`;
      }

      mensaje += " ¿Confirmás la recarga de todos modos?";

      const confirma = window.confirm(mensaje);
      if (!confirma) return;

      await onRegistrar({
        tipo: "alerta_sobrante",
        litros: litrosRestantes,
        monto: dineroPerdido,
        categoria: "Litros sobrantes al recargar",
      });
    }

    await onRegistrar({ tipo: "compra_agua", monto: parseFloat(valorAgua) || 0 });
    setValorAgua("");
  }

  function empezarEdicion(m: Movimiento) {
    setEditandoId(m.id);
    setMontoEdit(String(m.monto ?? ""));
  }

  async function guardarEdicion(m: Movimiento) {
    const ok = await onEditar(m.id, { monto: parseFloat(montoEdit) || 0 });
    if (ok) setEditandoId(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold">💧 Agua</p>
        <p className="text-sm text-gray-600">Valor de la compra</p>
        <input
          type="number"
          value={valorAgua}
          onChange={(e) => setValorAgua(e.target.value)}
          placeholder="0.00"
          className="border rounded-lg p-2 w-full mt-1"
        />
        <button onClick={registrarCompraAgua} className="border rounded-lg p-2 mt-2 w-full font-semibold">
          Registrar compra de agua
        </button>
      </div>

      <div>
        <p className="font-semibold">⛽ Gasóleo (diésel)</p>
        <p className="text-sm text-gray-600">Precio total</p>
        <input
          type="number"
          value={precioGasoleo}
          onChange={(e) => setPrecioGasoleo(e.target.value)}
          placeholder="0.00"
          className="border rounded-lg p-2 w-full mt-1"
        />
        <button
          onClick={() => {
            onRegistrar({ tipo: "compra_gasoleo", monto: parseFloat(precioGasoleo) || 0 });
            setPrecioGasoleo("");
          }}
          className="border rounded-lg p-2 mt-2 w-full font-semibold"
        >
          Registrar compra de gasóleo
        </button>
      </div>

      <div className="pt-3 space-y-1">
        {movimientos.length === 0 && <p className="text-gray-500">Sin registros hoy</p>}
        {movimientos.map((m) => (
          <div key={m.id} className="text-sm border-b pb-2">
            {editandoId === m.id ? (
              <div className="space-y-1 py-1">
                <input
                  type="number"
                  value={montoEdit}
                  onChange={(e) => setMontoEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <div className="flex gap-2">
                  <button onClick={() => guardarEdicion(m)} className="border rounded-lg px-3 py-1 font-semibold flex-1">
                    Guardar
                  </button>
                  <button onClick={() => setEditandoId(null)} className="border rounded-lg px-3 py-1 flex-1">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span>{m.tipo === "compra_agua" ? "Agua" : "Gasóleo"}</span>
                <span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs border rounded px-2 py-0.5">
                    Editar
                  </button>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabVentas({
  movimientos,
  camion,
  onRegistrar,
  onEditar,
}: {
  movimientos: Movimiento[];
  camion: Camion;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
}) {
  const [litros, setLitros] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const [credito, setCredito] = useState("");
  const [clienteNota, setClienteNota] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [errorLocal, setErrorLocal] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{
    litros: string;
    efectivo: string;
    transferencia: string;
    credito: string;
    clienteNota: string;
    clienteTelefono: string;
  } | null>(null);

  const importeTotal = (parseFloat(efectivo) || 0) + (parseFloat(transferencia) || 0) + (parseFloat(credito) || 0);
  const litrosNum = parseFloat(litros) || 0;
  const quedarian = camion.litros_actual - litrosNum;
  const excedeStock = litrosNum > camion.litros_actual;
  const tieneCredito = (parseFloat(credito) || 0) > 0;
  const faltanDatosCliente = tieneCredito && (!clienteNota.trim() || !clienteTelefono.trim());

  async function registrar() {
    setErrorLocal("");
    if (faltanDatosCliente) {
      setErrorLocal("Para ventas a crédito hace falta el nombre y el teléfono del cliente.");
      return;
    }
    const ok = await onRegistrar({
      tipo: "venta",
      litros: litrosNum,
      precio_litro: litrosNum > 0 ? importeTotal / litrosNum : null,
      monto: importeTotal,
      efectivo: parseFloat(efectivo) || 0,
      transferencia: parseFloat(transferencia) || 0,
      credito: parseFloat(credito) || 0,
      cliente_nota: clienteNota || null,
      cliente_telefono: clienteTelefono || null,
    });
    if (ok) {
      setLitros("");
      setEfectivo("");
      setTransferencia("");
      setCredito("");
      setClienteNota("");
      setClienteTelefono("");
    }
  }

  function empezarEdicion(m: Movimiento) {
    setEditandoId(m.id);
    setEdit({
      litros: String(m.litros ?? ""),
      efectivo: String(m.efectivo ?? ""),
      transferencia: String(m.transferencia ?? ""),
      credito: String(m.credito ?? ""),
      clienteNota: m.cliente_nota ?? "",
      clienteTelefono: m.cliente_telefono ?? "",
    });
  }

  async function guardarEdicion(m: Movimiento) {
    if (!edit) return;
    const litrosE = parseFloat(edit.litros) || 0;
    const importeE = (parseFloat(edit.efectivo) || 0) + (parseFloat(edit.transferencia) || 0) + (parseFloat(edit.credito) || 0);
    const ok = await onEditar(m.id, {
      litros: litrosE,
      precio_litro: litrosE > 0 ? importeE / litrosE : null,
      monto: importeE,
      efectivo: parseFloat(edit.efectivo) || 0,
      transferencia: parseFloat(edit.transferencia) || 0,
      credito: parseFloat(edit.credito) || 0,
      cliente_nota: edit.clienteNota || null,
      cliente_telefono: edit.clienteTelefono || null,
    });
    if (ok) setEditandoId(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Litros vendidos</p>
      <input
        type="number"
        value={litros}
        onChange={(e) => setLitros(e.target.value)}
        placeholder="0"
        className="border rounded-lg p-2 w-full"
      />
      {litrosNum > 0 && (
        <p className={`text-sm ${excedeStock ? "text-red-600" : "text-gray-600"}`}>
          Quedarían en el camión: <strong>{quedarian.toFixed(2)} L</strong>
          {excedeStock ? " — supera lo que hay en existencia" : ""}
        </p>
      )}

      <p className="text-sm text-gray-600">
        Cliente {tieneCredito ? "(obligatorio para venta a crédito)" : "(opcional)"}
      </p>
      <input
        type="text"
        value={clienteNota}
        onChange={(e) => setClienteNota(e.target.value)}
        placeholder="Nombre del cliente"
        className="border rounded-lg p-2 w-full"
      />

      {tieneCredito && (
        <>
          <p className="text-sm text-gray-600">Teléfono del cliente (obligatorio para crédito)</p>
          <input
            type="tel"
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
            placeholder="Ej: 923 456 789"
            className="border rounded-lg p-2 w-full"
          />
        </>
      )}

      <p className="font-semibold pt-2">Pago (se puede dividir)</p>
      <p className="text-sm text-gray-600">Efectivo</p>
      <input
        type="number"
        value={efectivo}
        onChange={(e) => setEfectivo(e.target.value)}
        placeholder="0.00"
        className="border rounded-lg p-2 w-full"
      />
      <p className="text-sm text-gray-600">Transferencia</p>
      <input
        type="number"
        value={transferencia}
        onChange={(e) => setTransferencia(e.target.value)}
        placeholder="0.00"
        className="border rounded-lg p-2 w-full"
      />
      <p className="text-sm text-gray-600">Crédito</p>
      <input
        type="number"
        value={credito}
        onChange={(e) => setCredito(e.target.value)}
        placeholder="0.00"
        className="border rounded-lg p-2 w-full"
      />

      <p className="pt-1">
        Importe total: <strong>{importeTotal.toFixed(2)}</strong>
      </p>

      {errorLocal && <p className="text-red-600 text-sm">{errorLocal}</p>}

      <button
        onClick={registrar}
        disabled={excedeStock || faltanDatosCliente}
        className="border rounded-lg p-2 w-full font-semibold disabled:opacity-40"
      >
        Registrar venta
      </button>

      <div className="pt-3 space-y-1">
        {movimientos.length === 0 && <p className="text-gray-500">Sin registros hoy</p>}
        {movimientos.map((m) => (
          <div key={m.id} className="text-sm border-b pb-2">
            {editandoId === m.id && edit ? (
              <div className="space-y-1 py-1">
                <p className="text-xs text-gray-500">Litros</p>
                <input
                  type="number"
                  value={edit.litros}
                  onChange={(e) => setEdit({ ...edit, litros: e.target.value })}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Cliente</p>
                <input
                  type="text"
                  value={edit.clienteNota}
                  onChange={(e) => setEdit({ ...edit, clienteNota: e.target.value })}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Teléfono</p>
                <input
                  type="text"
                  value={edit.clienteTelefono}
                  onChange={(e) => setEdit({ ...edit, clienteTelefono: e.target.value })}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Efectivo</p>
                <input
                  type="number"
                  value={edit.efectivo}
                  onChange={(e) => setEdit({ ...edit, efectivo: e.target.value })}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Transferencia</p>
                <input
                  type="number"
                  value={edit.transferencia}
                  onChange={(e) => setEdit({ ...edit, transferencia: e.target.value })}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Crédito</p>
                <input
                  type="number"
                  value={edit.credito}
                  onChange={(e) => setEdit({ ...edit, credito: e.target.value })}
                  className="border rounded-lg p-2 w-full"
                />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => guardarEdicion(m)} className="border rounded-lg px-3 py-1 font-semibold flex-1">
                    Guardar
                  </button>
                  <button onClick={() => setEditandoId(null)} className="border rounded-lg px-3 py-1 flex-1">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span>
                  venta · {m.litros}L {m.cliente_nota ? `· ${m.cliente_nota}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs border rounded px-2 py-0.5">
                    Editar
                  </button>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabGastos({
  movimientos,
  onRegistrar,
  onEditar,
}: {
  movimientos: Movimiento[];
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<boolean>;
  onEditar: (id: string, datos: Partial<Movimiento>) => Promise<boolean>;
}) {
  const [categoria, setCategoria] = useState(CATEGORIAS_GASTO[0]);
  const [observacion, setObservacion] = useState("");
  const [monto, setMonto] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [categoriaEdit, setCategoriaEdit] = useState("");
  const [montoEdit, setMontoEdit] = useState("");

  const esOtros = categoria === "Otros";

  async function registrar() {
    const categoriaFinal = esOtros && observacion.trim() ? `Otros: ${observacion.trim()}` : categoria;
    const ok = await onRegistrar({ tipo: "gasto", categoria: categoriaFinal, monto: parseFloat(monto) || 0 });
    if (ok) {
      setMonto("");
      setObservacion("");
    }
  }

  function empezarEdicion(m: Movimiento) {
    setEditandoId(m.id);
    setCategoriaEdit(m.categoria ?? "");
    setMontoEdit(String(m.monto ?? ""));
  }

  async function guardarEdicion(m: Movimiento) {
    const ok = await onEditar(m.id, { categoria: categoriaEdit, monto: parseFloat(montoEdit) || 0 });
    if (ok) setEditandoId(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Categoría</p>
      <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="border rounded-lg p-2 w-full">
        {CATEGORIAS_GASTO.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {esOtros && (
        <>
          <p className="text-sm text-gray-600">Observaciones</p>
          <input
            type="text"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Describí el gasto"
            className="border rounded-lg p-2 w-full"
          />
        </>
      )}

      <p className="text-sm text-gray-600">Monto</p>
      <input
        type="number"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        placeholder="0.00"
        className="border rounded-lg p-2 w-full"
      />

      <button onClick={registrar} className="border rounded-lg p-2 w-full font-semibold">
        Registrar gasto
      </button>

      <div className="pt-3 space-y-1">
        {movimientos.length === 0 && <p className="text-gray-500">Sin registros hoy</p>}
        {movimientos.map((m) => (
          <div key={m.id} className="text-sm border-b pb-2">
            {editandoId === m.id ? (
              <div className="space-y-1 py-1">
                <input
                  type="text"
                  value={categoriaEdit}
                  onChange={(e) => setCategoriaEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <input
                  type="number"
                  value={montoEdit}
                  onChange={(e) => setMontoEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <div className="flex gap-2">
                  <button onClick={() => guardarEdicion(m)} className="border rounded-lg px-3 py-1 font-semibold flex-1">
                    Guardar
                  </button>
                  <button onClick={() => setEditandoId(null)} className="border rounded-lg px-3 py-1 flex-1">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span>{m.categoria}</span>
                <span className="flex items-center gap-2">
                  {(m.monto ?? 0).toFixed(2)}
                  <button onClick={() => empezarEdicion(m)} className="text-xs border rounded px-2 py-0.5">
                    Editar
                  </button>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
