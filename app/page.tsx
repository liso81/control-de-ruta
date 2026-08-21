"use client";

import { useEffect, useState } from "react";
import type { Camion, Turno, Movimiento, TipoMovimiento } from "@/lib/tipos";

const CATEGORIAS_GASTO = ["Policía", "Comida", "Mecánica", "Peaje", "Otro"];
const UMBRAL_SOBRANTE = 0.01;

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

  async function cargarCamionYTurno(camionId: string) {
    setCargando(true);
    const resCamiones = await fetch("/api/camiones");
    const jsonCamiones = await resCamiones.json();
    const encontrado = (jsonCamiones.camiones ?? []).find((c: Camion) => c.id === camionId);
    if (!encontrado) {
      localStorage.removeItem("camion_id");
      setCargando(false);
      iniciar();
      return;
    }
    setCamion(encontrado);
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
    if (!turno || !camion) return;
    setError("");
    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...datos, turno_id: turno.id, camion_id: camion.id }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    await cargarMovimientos(turno.id);
    const resCamiones = await fetch("/api/camiones");
    const jsonCamiones = await resCamiones.json();
    const actualizado = (jsonCamiones.camiones ?? []).find((c: Camion) => c.id === camion.id);
    if (actualizado) setCamion(actualizado);
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

  // --- Pantalla: vincular dispositivo ---
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

  // --- Pantalla: pedir nombre del chofer ---
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

  // --- Pantalla principal ---
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
          onCerrarDia={(entregado, remanente) => cerrarDia(turno, entregado, remanente, setTurno)}
        />
      )}

      {tab === "compras" && (
        <TabCompras
          movimientos={compras}
          camion={camion}
          precioPromedioHoy={precioPromedioHoy}
          onRegistrar={registrarMovimiento}
        />
      )}

      {tab === "ventas" && (
        <TabVentas movimientos={ventas} camion={camion} onRegistrar={registrarMovimiento} />
      )}

      {tab === "gastos" && <TabGastos movimientos={gastos} onRegistrar={registrarMovimiento} />}
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

async function cerrarDia(turno: Turno, entregado: number, remanente: number, setTurno: (t: Turno) => void) {
  const res = await fetch("/api/turnos/cerrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turno_id: turno.id, efectivo_entregado: entregado, remanente }),
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
  onCerrarDia: (entregado: number, remanente: number) => void;
}) {
  const [fondoInput, setFondoInput] = useState("");
  const [entregadoInput, setEntregadoInput] = useState("");
  const entregado = parseFloat(entregadoInput) || 0;
  const remanente = efectivoDisponible - entregado;
  const cerrado = turno.estado === "cerrado";

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
            <p className="text-sm text-gray-600">Efectivo entregado al dueño</p>
            <input
              type="number"
              value={entregadoInput}
              onChange={(e) => setEntregadoInput(e.target.value)}
              placeholder="0.00"
              className="border rounded-lg p-2 w-full mt-1"
            />
            <p className="mt-2">
              Remanente (pasa a mañana): <strong>{remanente.toFixed(2)}</strong>
            </p>
            <button
              onClick={() => onCerrarDia(entregado, remanente)}
              className="border rounded-lg p-2 mt-2 w-full font-semibold"
            >
              Cerrar día
            </button>
          </div>
        </>
      )}

      {cerrado && (
        <p className="pt-3 text-green-700 font-semibold">
          Día cerrado. Efectivo entregado: {turno.efectivo_entregado?.toFixed(2)} · Remanente: {turno.remanente?.toFixed(2)}
        </p>
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
}: {
  movimientos: Movimiento[];
  camion: Camion;
  precioPromedioHoy: number | null;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<void>;
}) {
  const [valorAgua, setValorAgua] = useState("");
  const [precioGasoleo, setPrecioGasoleo] = useState("");

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

      <ListaMovimientos movimientos={movimientos} />
    </div>
  );
}

function TabVentas({
  movimientos,
  camion,
  onRegistrar,
}: {
  movimientos: Movimiento[];
  camion: Camion;
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<void>;
}) {
  const [litros, setLitros] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const [credito, setCredito] = useState("");
  const [clienteNota, setClienteNota] = useState("");

  const importeTotal = (parseFloat(efectivo) || 0) + (parseFloat(transferencia) || 0) + (parseFloat(credito) || 0);
  const litrosNum = parseFloat(litros) || 0;
  const quedarian = camion.litros_actual - litrosNum;
  const excedeStock = litrosNum > camion.litros_actual;

  function registrar() {
    onRegistrar({
      tipo: "venta",
      litros: litrosNum,
      precio_litro: litrosNum > 0 ? importeTotal / litrosNum : null,
      monto: importeTotal,
      efectivo: parseFloat(efectivo) || 0,
      transferencia: parseFloat(transferencia) || 0,
      credito: parseFloat(credito) || 0,
      cliente_nota: clienteNota || null,
    });
    setLitros("");
    setEfectivo("");
    setTransferencia("");
    setCredito("");
    setClienteNota("");
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

      <p className="text-sm text-gray-600">Cliente (opcional)</p>
      <input
        type="text"
        value={clienteNota}
        onChange={(e) => setClienteNota(e.target.value)}
        placeholder="Nombre o nota (dejar vacío si es venta suelta)"
        className="border rounded-lg p-2 w-full"
      />

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

      <button
        onClick={registrar}
        disabled={excedeStock}
        className="border rounded-lg p-2 w-full font-semibold disabled:opacity-40"
      >
        Registrar venta
      </button>

      <ListaMovimientos movimientos={movimientos} />
    </div>
  );
}

function TabGastos({
  movimientos,
  onRegistrar,
}: {
  movimientos: Movimiento[];
  onRegistrar: (datos: Partial<Movimiento> & { tipo: TipoMovimiento }) => Promise<void>;
}) {
  const [categoria, setCategoria] = useState(CATEGORIAS_GASTO[0]);
  const [monto, setMonto] = useState("");

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

      <p className="text-sm text-gray-600">Monto</p>
      <input
        type="number"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        placeholder="0.00"
        className="border rounded-lg p-2 w-full"
      />

      <button
        onClick={() => {
          onRegistrar({ tipo: "gasto", categoria, monto: parseFloat(monto) || 0 });
          setMonto("");
        }}
        className="border rounded-lg p-2 w-full font-semibold"
      >
        Registrar gasto
      </button>

      <ListaMovimientos movimientos={movimientos} />
    </div>
  );
}

function ListaMovimientos({ movimientos }: { movimientos: Movimiento[] }) {
  if (movimientos.length === 0) {
    return <p className="text-gray-500 pt-3">Sin registros hoy</p>;
  }
  return (
    <div className="pt-3 space-y-1">
      {movimientos.map((m) => (
        <div key={m.id} className="text-sm border-b pb-1 flex justify-between">
          <span>
            {m.categoria ?? m.tipo} {m.litros ? `· ${m.litros}L` : ""} {m.cliente_nota ? `· ${m.cliente_nota}` : ""}
          </span>
          <span>{(m.monto ?? 0).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
