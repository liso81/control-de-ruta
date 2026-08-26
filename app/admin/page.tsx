"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type {
  Camion,
  Turno,
  Movimiento,
  Producto,
  IntervaloMantenimiento,
  Mantenimiento,
  AlertaMantenimiento,
  DocumentoVehiculo,
  TipoDocumento,
  AlertaDocumento,
  AlertaMantenimientoReporte,
  CuentaPorCobrar,
  AlertaCuentaPorCobrar,
  DatosProvisionFondos,
  SaldoSubmayor,
  ResumenFinanzas,
  GraficosFinanzas,
  TipoFinanzasMovimiento,
} from "@/lib/tipos";
import { SUBMAYORES_PROVISION } from "@/lib/tipos";

export default function AdminPage() {
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    verificarSesion();
  }, []);

  async function verificarSesion() {
    const res = await fetch("/api/admin/me");
    setAutenticado(res.ok);
    setCargando(false);
  }

  if (cargando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  if (!autenticado) {
    return <PantallaLogin onLogin={() => setAutenticado(true)} />;
  }

  return <PanelAdmin />;
}

function PantallaLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function iniciarSesion() {
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al iniciar sesión");
        return;
      }
      onLogin();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-sm mx-auto flex flex-col justify-center gap-3">
      <h1 className="text-2xl font-bold mb-2">Panel del dueño</h1>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Usuario"
        className="border rounded-lg p-3"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        className="border rounded-lg p-3"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        onClick={iniciarSesion}
        disabled={enviando}
        className="bg-black text-white rounded-lg p-3 font-semibold disabled:opacity-40"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </main>
  );
}

function PanelAdmin() {
  const [tab, setTab] = useState<
    | "reportes"
    | "vehiculos"
    | "operaciones"
    | "mantenimientos"
    | "inventario"
    | "cxc"
    | "provision"
    | "finanzas"
  >("reportes");

  async function cerrarSesion() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "reportes", label: "Reportes" },
    { id: "vehiculos", label: "Vehículos" },
    { id: "operaciones", label: "Operac." },
    { id: "mantenimientos", label: "Mantenim." },
    { id: "inventario", label: "Invent." },
    { id: "cxc", label: "Cuentas x Cobrar" },
    { id: "provision", label: "Provisión de Fondos" },
    { id: "finanzas", label: "Finanzas" },
  ];

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Panel del dueño</h1>
        <button onClick={cerrarSesion} className="text-sm border rounded-lg px-3 py-1">
          Salir
        </button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border rounded-lg p-2 text-xs font-semibold whitespace-nowrap flex-shrink-0 ${tab === t.id ? "bg-black text-white" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "reportes" && <PanelReportes />}
      {tab === "vehiculos" && <PanelVehiculos />}
      {tab === "operaciones" && <PanelOperaciones />}
      {tab === "mantenimientos" && <PanelMantenimientos />}
      {tab === "inventario" && <PanelInventario />}
      {tab === "cxc" && <PanelCuentasPorCobrar />}
      {tab === "provision" && <PanelProvisionFondos />}
      {tab === "finanzas" && <PanelFinanzas />}
    </main>
  );
}

/* ================= VEHÍCULOS ================= */

function PanelVehiculos() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [camionDocumentos, setCamionDocumentos] = useState<Camion | null>(null);

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [capacidadNueva, setCapacidadNueva] = useState("");
  const [matriculaNueva, setMatriculaNueva] = useState("");
  const [marcaNueva, setMarcaNueva] = useState("");
  const [kmLitroNuevo, setKmLitroNuevo] = useState("");
  const [kmBaseNuevo, setKmBaseNuevo] = useState("");
  const [precioGasoleoNuevo, setPrecioGasoleoNuevo] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [capacidadEdit, setCapacidadEdit] = useState("");
  const [matriculaEdit, setMatriculaEdit] = useState("");
  const [marcaEdit, setMarcaEdit] = useState("");
  const [kmLitroEdit, setKmLitroEdit] = useState("");
  const [kmBaseEdit, setKmBaseEdit] = useState("");
  const [precioGasoleoEdit, setPrecioGasoleoEdit] = useState("");

  useEffect(() => {
    cargarCamiones();
  }, []);

  async function cargarCamiones() {
    setCargando(true);
    const res = await fetch("/api/admin/camiones");
    const json = await res.json();
    setCamiones(json.camiones ?? []);
    setCargando(false);
  }

  async function crearCamion() {
    setError("");
    if (!nombreNuevo.trim() || !capacidadNueva) {
      setError("Completá al menos nombre y capacidad");
      return;
    }
    const res = await fetch("/api/admin/camiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombreNuevo.trim(),
        capacidad_litros: parseFloat(capacidadNueva),
        matricula: matriculaNueva.trim() || null,
        marca: marcaNueva.trim() || null,
        km_por_litro: kmLitroNuevo ? parseFloat(kmLitroNuevo) : null,
        km_base: kmBaseNuevo ? parseFloat(kmBaseNuevo) : 0,
        precio_gasoleo_litro: precioGasoleoNuevo ? parseFloat(precioGasoleoNuevo) : null,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setNombreNuevo("");
    setCapacidadNueva("");
    setMatriculaNueva("");
    setMarcaNueva("");
    setKmLitroNuevo("");
    setKmBaseNuevo("");
    setPrecioGasoleoNuevo("");
    await cargarCamiones();
  }

  function empezarEdicion(c: Camion) {
    setEditandoId(c.id);
    setNombreEdit(c.nombre);
    setCapacidadEdit(String(c.capacidad_litros));
    setMatriculaEdit(c.matricula ?? "");
    setMarcaEdit(c.marca ?? "");
    setKmLitroEdit(c.km_por_litro !== null ? String(c.km_por_litro) : "");
    setKmBaseEdit(c.km_base !== null ? String(c.km_base) : "");
    setPrecioGasoleoEdit(c.precio_gasoleo_litro !== null ? String(c.precio_gasoleo_litro) : "");
  }

  async function guardarEdicion(id: string) {
    setError("");
    const res = await fetch(`/api/admin/camiones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombreEdit.trim(),
        capacidad_litros: parseFloat(capacidadEdit),
        matricula: matriculaEdit.trim() || null,
        marca: marcaEdit.trim() || null,
        km_por_litro: kmLitroEdit ? parseFloat(kmLitroEdit) : null,
        km_base: kmBaseEdit ? parseFloat(kmBaseEdit) : 0,
        precio_gasoleo_litro: precioGasoleoEdit ? parseFloat(precioGasoleoEdit) : null,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setEditandoId(null);
    await cargarCamiones();
  }

  if (camionDocumentos) {
    return <DetalleDocumentos camion={camionDocumentos} onVolver={() => setCamionDocumentos(null)} />;
  }

  return (
    <div>
      <h2 className="font-semibold mb-2">Vehículos</h2>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {cargando && <p className="text-gray-500">Cargando...</p>}

      <div className="space-y-2 mb-4">
        {camiones.map((c) => (
          <div key={c.id} className="border rounded-lg p-3">
            {editandoId === c.id ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Nombre</p>
                <input
                  type="text"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Capacidad (litros)</p>
                <input
                  type="number"
                  value={capacidadEdit}
                  onChange={(e) => setCapacidadEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Matrícula</p>
                <input
                  type="text"
                  value={matriculaEdit}
                  onChange={(e) => setMatriculaEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Marca</p>
                <input
                  type="text"
                  value={marcaEdit}
                  onChange={(e) => setMarcaEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Km por litro</p>
                <input
                  type="number"
                  value={kmLitroEdit}
                  onChange={(e) => setKmLitroEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Km base (odómetro al empezar a usar el sistema)</p>
                <input
                  type="number"
                  value={kmBaseEdit}
                  onChange={(e) => setKmBaseEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <p className="text-xs text-gray-500">Precio por litro de gasóleo</p>
                <input
                  type="number"
                  value={precioGasoleoEdit}
                  onChange={(e) => setPrecioGasoleoEdit(e.target.value)}
                  className="border rounded-lg p-2 w-full"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => guardarEdicion(c.id)}
                    className="border rounded-lg px-3 py-1 font-semibold flex-1"
                  >
                    Guardar
                  </button>
                  <button onClick={() => setEditandoId(null)} className="border rounded-lg px-3 py-1 flex-1">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{c.matricula || c.nombre}</p>
                  <p className="text-sm text-gray-500">
                    {c.nombre} · {c.litros_actual.toFixed(2)} L / {c.capacidad_litros.toFixed(2)} L
                  </p>
                  {(c.marca || c.km_por_litro) && (
                    <p className="text-xs text-gray-400">
                      {c.marca ?? ""} {c.km_por_litro ? `· ${c.km_por_litro} km/L` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => empezarEdicion(c)} className="text-xs border rounded px-2 py-1">
                    Editar
                  </button>
                  <button onClick={() => setCamionDocumentos(c)} className="text-xs border rounded px-2 py-1">
                    Documentos
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-gray-500">No hay camiones cargados todavía.</p>}
      </div>

      <div className="border-t pt-4">
        <h2 className="font-semibold mb-2">Agregar camión nuevo</h2>
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre (ej: Camión 2)"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="number"
          value={capacidadNueva}
          onChange={(e) => setCapacidadNueva(e.target.value)}
          placeholder="Capacidad en litros"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="text"
          value={matriculaNueva}
          onChange={(e) => setMatriculaNueva(e.target.value)}
          placeholder="Matrícula"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="text"
          value={marcaNueva}
          onChange={(e) => setMarcaNueva(e.target.value)}
          placeholder="Marca"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="number"
          value={kmLitroNuevo}
          onChange={(e) => setKmLitroNuevo(e.target.value)}
          placeholder="Km por litro"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="number"
          value={kmBaseNuevo}
          onChange={(e) => setKmBaseNuevo(e.target.value)}
          placeholder="Km actual del odómetro (opcional)"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="number"
          value={precioGasoleoNuevo}
          onChange={(e) => setPrecioGasoleoNuevo(e.target.value)}
          placeholder="Precio por litro de gasóleo"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <button onClick={crearCamion} className="border rounded-lg p-2 w-full font-semibold">
          Crear camión
        </button>
      </div>
    </div>
  );
}

/* ================= OPERACIONES DIARIAS ================= */

function PanelOperaciones() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [camionSeleccionado, setCamionSeleccionado] = useState<Camion | null>(null);

  useEffect(() => {
    cargarCamiones();
  }, []);

  async function cargarCamiones() {
    setCargando(true);
    const res = await fetch("/api/admin/camiones");
    const json = await res.json();
    setCamiones(json.camiones ?? []);
    setCargando(false);
  }

  if (camionSeleccionado) {
    return <DetalleCamion camion={camionSeleccionado} onVolver={() => setCamionSeleccionado(null)} />;
  }

  return (
    <div>
      <h2 className="font-semibold mb-2">Elegí un camión</h2>
      {cargando && <p className="text-gray-500">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full border rounded-lg p-3 text-left hover:bg-gray-50"
          >
            <p className="font-semibold">{c.matricula || c.nombre}</p>
            <p className="text-sm text-gray-500">
              {c.nombre} · {c.litros_actual.toFixed(2)} L / {c.capacidad_litros.toFixed(2)} L
            </p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-gray-500">No hay camiones cargados todavía.</p>}
      </div>
    </div>
  );
}

function DetalleCamion({ camion, onVolver }: { camion: Camion; onVolver: () => void }) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);

  useEffect(() => {
    cargarTurnos();
  }, []);

  async function cargarTurnos() {
    setCargando(true);
    const res = await fetch(`/api/admin/turnos?camion_id=${camion.id}`);
    const json = await res.json();
    setTurnos(json.turnos ?? []);
    setCargando(false);
  }

  if (turnoSeleccionado) {
    return <DetalleTurno turno={turnoSeleccionado} onVolver={() => setTurnoSeleccionado(null)} />;
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const turnoHoy = turnos.find((t) => t.fecha === hoy);
  const historial = turnos.filter((t) => t.fecha !== hoy);

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver a camiones
      </button>
      <h2 className="font-semibold mb-1">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-gray-500 mb-3">
        {camion.nombre} · {camion.litros_actual.toFixed(2)} L / {camion.capacidad_litros.toFixed(2)} L
      </p>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      {turnoHoy && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-1">Hoy — en vivo</h3>
          <button
            onClick={() => setTurnoSeleccionado(turnoHoy)}
            className="w-full border rounded-lg p-3 text-left hover:bg-gray-50"
          >
            <p className="font-semibold">{turnoHoy.chofer_nombre}</p>
            <p className="text-sm text-gray-500">
              {turnoHoy.estado === "abierto" ? "🟢 Turno abierto" : "✅ Cerrado"}
            </p>
          </button>
        </div>
      )}

      {!cargando && !turnoHoy && <p className="text-gray-500 mb-4">Sin turno abierto hoy.</p>}

      <h3 className="font-semibold text-sm mb-1">Historial</h3>
      <div className="space-y-2">
        {historial.map((t) => (
          <button
            key={t.id}
            onClick={() => setTurnoSeleccionado(t)}
            className="w-full border rounded-lg p-3 text-left hover:bg-gray-50"
          >
            <p className="font-semibold">{t.fecha}</p>
            <p className="text-sm text-gray-500">
              {t.chofer_nombre} · {t.estado === "cerrado" ? `Remanente: ${t.remanente?.toFixed(2)}` : "Abierto"}
            </p>
          </button>
        ))}
        {!cargando && historial.length === 0 && <p className="text-gray-500">Sin historial todavía.</p>}
      </div>
    </div>
  );
}

function DetalleTurno({ turno, onVolver }: { turno: Turno; onVolver: () => void }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDetalle();
  }, []);

  async function cargarDetalle() {
    setCargando(true);
    const res = await fetch(`/api/admin/turnos/${turno.id}`);
    const json = await res.json();
    setMovimientos(json.movimientos ?? []);
    setCargando(false);
  }

  const ventas = movimientos.filter((m) => m.tipo === "venta");
  const compras = movimientos.filter((m) => m.tipo === "compra_agua" || m.tipo === "compra_gasoleo");
  const gastos = movimientos.filter((m) => m.tipo === "gasto");
  const alertas = movimientos.filter((m) => m.tipo === "alerta_sobrante");

  const ventasEfectivo = ventas.reduce((acc, m) => acc + (m.efectivo ?? 0), 0);
  const ventasTotales = ventas.reduce((acc, m) => acc + (m.efectivo ?? 0) + (m.transferencia ?? 0) + (m.credito ?? 0), 0);
  const totalCompras = compras.reduce((acc, m) => acc + (m.monto ?? 0), 0);
  const totalGastos = gastos.reduce((acc, m) => acc + (m.monto ?? 0), 0);
  const efectivoDisponible = turno.saldo_inicial + turno.fondo_dueno + ventasEfectivo - totalCompras - totalGastos;

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver
      </button>
      <h2 className="font-semibold mb-1">
        {turno.fecha} · {turno.chofer_nombre}
      </h2>
      <p className="text-sm text-gray-500 mb-3">{turno.estado === "abierto" ? "🟢 Abierto" : "✅ Cerrado"}</p>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      <div className="space-y-1 mb-3">
        <Fila label="Saldo inicial" valor={turno.saldo_inicial} />
        <Fila label="Fondo añadido" valor={turno.fondo_dueno} />
        <Fila label="Ventas en efectivo" valor={ventasEfectivo} />
        <Fila label="Ventas totales" valor={ventasTotales} />
        <Fila label="Compras" valor={totalCompras} />
        <Fila label="Gastos" valor={totalGastos} />
        <Fila label="Efectivo disponible" valor={efectivoDisponible} negrita />
      </div>

      {turno.estado === "cerrado" && (
        <div className="border rounded-lg p-3 mb-3 bg-green-50">
          <p className="font-semibold">Liquidación</p>
          <p className="text-sm">Entregado: {turno.efectivo_entregado?.toFixed(2)}</p>
          <p className="text-sm">Remanente: {turno.remanente?.toFixed(2)}</p>
          {turno.desglose_efectivo && (
            <div className="text-xs text-gray-600 mt-1">
              {Object.entries(turno.desglose_efectivo)
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

      {alertas.length > 0 && (
        <div className="border border-amber-400 bg-amber-50 rounded-lg p-3 mb-3">
          <p className="font-semibold text-amber-800 text-sm">⚠️ Alertas de sobrante</p>
          {alertas.map((a) => (
            <p key={a.id} className="text-xs text-amber-800">
              {a.litros?.toFixed(2)} L · ≈ {a.monto?.toFixed(2)}
            </p>
          ))}
        </div>
      )}

      <h3 className="font-semibold text-sm mb-1">Movimientos</h3>
      <div className="space-y-1">
        {movimientos
          .filter((m) => m.tipo !== "alerta_sobrante")
          .map((m) => (
            <div key={m.id} className="text-sm border-b pb-1 flex justify-between">
              <span>
                {m.categoria ?? m.tipo} {m.litros ? `· ${m.litros}L` : ""} {m.cliente_nota ? `· ${m.cliente_nota}` : ""}
              </span>
              <span>{(m.monto ?? 0).toFixed(2)}</span>
            </div>
          ))}
        {!cargando && movimientos.length === 0 && <p className="text-gray-500">Sin movimientos.</p>}
      </div>
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

/* ================= INVENTARIO ================= */

function PanelInventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [unidadNueva, setUnidadNueva] = useState("");
  const [precioNuevo, setPrecioNuevo] = useState("");
  const [stockNuevo, setStockNuevo] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [unidadEdit, setUnidadEdit] = useState("");
  const [precioEdit, setPrecioEdit] = useState("");
  const [stockEdit, setStockEdit] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    setCargando(true);
    const res = await fetch("/api/admin/productos");
    const json = await res.json();
    setProductos(json.productos ?? []);
    setCargando(false);
  }

  async function crearProducto() {
    setError("");
    if (!nombreNuevo.trim() || !precioNuevo) {
      setError("Completá al menos nombre y precio");
      return;
    }
    const res = await fetch("/api/admin/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombreNuevo.trim(),
        unidad: unidadNueva.trim() || null,
        precio_unitario: parseFloat(precioNuevo),
        stock_actual: stockNuevo ? parseFloat(stockNuevo) : 0,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setNombreNuevo("");
    setUnidadNueva("");
    setPrecioNuevo("");
    setStockNuevo("");
    await cargarProductos();
  }

  function empezarEdicion(p: Producto) {
    setEditandoId(p.id);
    setNombreEdit(p.nombre);
    setUnidadEdit(p.unidad ?? "");
    setPrecioEdit(String(p.precio_unitario));
    setStockEdit(String(p.stock_actual));
  }

  async function guardarEdicion(id: string) {
    setError("");
    const res = await fetch(`/api/admin/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombreEdit.trim(),
        unidad: unidadEdit.trim() || null,
        precio_unitario: parseFloat(precioEdit),
        stock_actual: parseFloat(stockEdit),
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setEditandoId(null);
    await cargarProductos();
  }

  return (
    <div>
      <h2 className="font-semibold mb-2">Inventario (almacén general)</h2>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {cargando && <p className="text-gray-500">Cargando...</p>}

      <div className="space-y-2 mb-4">
        {productos.map((p) => (
          <div key={p.id} className="border rounded-lg p-3">
            {editandoId === p.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  placeholder="Nombre"
                  className="border rounded-lg p-2 w-full"
                />
                <input
                  type="text"
                  value={unidadEdit}
                  onChange={(e) => setUnidadEdit(e.target.value)}
                  placeholder="Unidad (litro, unidad, kg...)"
                  className="border rounded-lg p-2 w-full"
                />
                <input
                  type="number"
                  value={precioEdit}
                  onChange={(e) => setPrecioEdit(e.target.value)}
                  placeholder="Precio unitario"
                  className="border rounded-lg p-2 w-full"
                />
                <input
                  type="number"
                  value={stockEdit}
                  onChange={(e) => setStockEdit(e.target.value)}
                  placeholder="Stock disponible"
                  className="border rounded-lg p-2 w-full"
                />
                <div className="flex gap-2">
                  <button onClick={() => guardarEdicion(p.id)} className="border rounded-lg px-3 py-1 font-semibold flex-1">
                    Guardar
                  </button>
                  <button onClick={() => setEditandoId(null)} className="border rounded-lg px-3 py-1 flex-1">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="text-sm text-gray-500">
                    Precio: {p.precio_unitario.toFixed(2)} {p.unidad ? `/ ${p.unidad}` : ""} · Stock: {p.stock_actual}
                  </p>
                </div>
                <button onClick={() => empezarEdicion(p)} className="text-xs border rounded px-2 py-1">
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
        {!cargando && productos.length === 0 && <p className="text-gray-500">Sin productos cargados todavía.</p>}
      </div>

      <div className="border-t pt-4">
        <h2 className="font-semibold mb-2">Agregar producto</h2>
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre (ej: Aceite 15W40)"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="text"
          value={unidadNueva}
          onChange={(e) => setUnidadNueva(e.target.value)}
          placeholder="Unidad (litro, unidad, kg...)"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="number"
          value={precioNuevo}
          onChange={(e) => setPrecioNuevo(e.target.value)}
          placeholder="Precio unitario"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <input
          type="number"
          value={stockNuevo}
          onChange={(e) => setStockNuevo(e.target.value)}
          placeholder="Stock inicial"
          className="border rounded-lg p-2 w-full mb-2"
        />
        <button onClick={crearProducto} className="border rounded-lg p-2 w-full font-semibold">
          Agregar producto
        </button>
      </div>
    </div>
  );
}

/* ================= MANTENIMIENTOS ================= */

const TIPOS_MANTENIMIENTO = [
  "Cambio de aceite",
  "Frenos",
  "Neumáticos",
  "Batería",
  "Filtros",
  "Revisión general",
  "Correctivo / reparación",
  "Otro",
];

function PanelMantenimientos() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [camionSeleccionado, setCamionSeleccionado] = useState<Camion | null>(null);

  useEffect(() => {
    cargarCamiones();
  }, []);

  async function cargarCamiones() {
    setCargando(true);
    const res = await fetch("/api/admin/camiones");
    const json = await res.json();
    setCamiones(json.camiones ?? []);
    setCargando(false);
  }

  if (camionSeleccionado) {
    return <DetalleMantenimientoCamion camion={camionSeleccionado} onVolver={() => setCamionSeleccionado(null)} />;
  }

  return (
    <div>
      <h2 className="font-semibold mb-2">Elegí un camión</h2>
      {cargando && <p className="text-gray-500">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full border rounded-lg p-3 text-left hover:bg-gray-50"
          >
            <p className="font-semibold">{c.matricula || c.nombre}</p>
            <p className="text-sm text-gray-500">{c.nombre}</p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-gray-500">No hay camiones cargados todavía.</p>}
      </div>
    </div>
  );
}

function DetalleMantenimientoCamion({ camion, onVolver }: { camion: Camion; onVolver: () => void }) {
  const [kmActual, setKmActual] = useState<number | null>(null);
  const [faltaPrecio, setFaltaPrecio] = useState(false);
  const [alertas, setAlertas] = useState<AlertaMantenimiento[]>([]);
  const [intervalos, setIntervalos] = useState<IntervaloMantenimiento[]>([]);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarIntervalos, setMostrarIntervalos] = useState(false);
  const [mantenimientoDetalle, setMantenimientoDetalle] = useState<Mantenimiento | null>(null);

  // Formulario de registro
  const [tipo, setTipo] = useState(TIPOS_MANTENIMIENTO[0]);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState("");
  const [lineasProductos, setLineasProductos] = useState<{ producto_id: string; cantidad: string }[]>([]);
  const [costoTercero, setCostoTercero] = useState("");
  const [proveedorTercero, setProveedorTercero] = useState("");
  const [descripcionTercero, setDescripcionTercero] = useState("");
  const [notas, setNotas] = useState("");

  // Formulario de intervalos
  const [tipoIntervalo, setTipoIntervalo] = useState(TIPOS_MANTENIMIENTO[0]);
  const [valorIntervalo, setValorIntervalo] = useState("");

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    const resKm = await fetch(`/api/admin/camiones/${camion.id}/km`);
    const jsonKm = await resKm.json();
    setKmActual(jsonKm.km_actual ?? null);
    setFaltaPrecio(jsonKm.falta_precio_configurado ?? false);
    if (jsonKm.km_actual !== undefined) setKm(String(Math.round(jsonKm.km_actual)));

    const [resAlertas, resIntervalos, resMant, resProductos] = await Promise.all([
      fetch(`/api/admin/alertas?camion_id=${camion.id}&km_actual=${jsonKm.km_actual ?? 0}`),
      fetch(`/api/admin/intervalos?camion_id=${camion.id}`),
      fetch(`/api/admin/mantenimientos?camion_id=${camion.id}`),
      fetch(`/api/admin/productos`),
    ]);
    const jsonAlertas = await resAlertas.json();
    const jsonIntervalos = await resIntervalos.json();
    const jsonMant = await resMant.json();
    const jsonProductos = await resProductos.json();

    setAlertas(jsonAlertas.alertas ?? []);
    setIntervalos(jsonIntervalos.intervalos ?? []);
    setMantenimientos(jsonMant.mantenimientos ?? []);
    setProductosDisponibles(jsonProductos.productos ?? []);
    setCargando(false);
  }

  async function guardarIntervalo() {
    if (!valorIntervalo) return;
    await fetch("/api/admin/intervalos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camion_id: camion.id, tipo: tipoIntervalo, intervalo_km: parseFloat(valorIntervalo) }),
    });
    setValorIntervalo("");
    await cargarTodo();
  }

  function agregarLineaProducto() {
    setLineasProductos([...lineasProductos, { producto_id: "", cantidad: "" }]);
  }

  function quitarLineaProducto(index: number) {
    setLineasProductos(lineasProductos.filter((_, i) => i !== index));
  }

  function actualizarLinea(index: number, campo: "producto_id" | "cantidad", valor: string) {
    const copia = [...lineasProductos];
    copia[index] = { ...copia[index], [campo]: valor };
    setLineasProductos(copia);
  }

  async function registrarMantenimiento() {
    setError("");
    if (!tipo || !fecha) {
      setError("Completá al menos tipo y fecha");
      return;
    }

    const productosValidos = lineasProductos
      .filter((l) => l.producto_id && l.cantidad)
      .map((l) => ({ producto_id: l.producto_id, cantidad: parseFloat(l.cantidad) }));

    const res = await fetch("/api/admin/mantenimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camion_id: camion.id,
        tipo,
        fecha,
        km: km ? parseFloat(km) : null,
        productos: productosValidos,
        costo_servicio_tercero: costoTercero ? parseFloat(costoTercero) : 0,
        proveedor_tercero: proveedorTercero.trim() || null,
        descripcion_servicio_tercero: descripcionTercero.trim() || null,
        notas: notas.trim() || null,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setLineasProductos([]);
    setCostoTercero("");
    setProveedorTercero("");
    setDescripcionTercero("");
    setNotas("");
    await cargarTodo();
  }

  if (mantenimientoDetalle) {
    return <ExpedienteMantenimiento mantenimiento={mantenimientoDetalle} onVolver={() => setMantenimientoDetalle(null)} />;
  }

  const colores = { ok: "text-green-700", proximo: "text-amber-700", vencido: "text-red-700" };
  const iconos = { ok: "✅", proximo: "⚡", vencido: "⚠️" };

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver a camiones
      </button>
      <h2 className="font-semibold mb-1">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-gray-500 mb-3">
        {camion.nombre} · Km estimado:{" "}
        <strong>{kmActual !== null ? Math.round(kmActual).toLocaleString() : "—"} km</strong>
      </p>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      {faltaPrecio && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-400 rounded-lg p-2 mb-3">
          ⚠️ Falta configurar el "Precio por litro de gasóleo" en Vehículos para estimar el km.
        </p>
      )}

      {/* Alertas */}
      <div className="mb-4">
        <h3 className="font-semibold text-sm mb-1">Alertas de mantenimiento preventivo</h3>
        {alertas.length === 0 && (
          <p className="text-gray-500 text-sm">Sin intervalos configurados todavía.</p>
        )}
        <div className="space-y-1">
          {alertas.map((a) => (
            <div key={a.tipo} className="border rounded-lg p-2 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">{a.tipo}</p>
                <p className={`text-xs ${colores[a.estado]}`}>
                  {iconos[a.estado]}{" "}
                  {a.estado === "vencido"
                    ? `Vencido hace ${Math.abs(Math.round(a.km_faltantes)).toLocaleString()} km`
                    : `Faltan ${Math.round(a.km_faltantes).toLocaleString()} km`}
                </p>
              </div>
              <p className="text-xs text-gray-400">cada {a.intervalo_km.toLocaleString()} km</p>
            </div>
          ))}
        </div>
      </div>

      {/* Intervalos configurables */}
      <div className="mb-4">
        <button onClick={() => setMostrarIntervalos(!mostrarIntervalos)} className="text-sm border rounded-lg px-3 py-1">
          {mostrarIntervalos ? "Ocultar" : "Configurar"} intervalos
        </button>
        {mostrarIntervalos && (
          <div className="border rounded-lg p-3 mt-2 space-y-2">
            <p className="text-xs text-gray-500">Tipo</p>
            <select
              value={tipoIntervalo}
              onChange={(e) => setTipoIntervalo(e.target.value)}
              className="border rounded-lg p-2 w-full"
            >
              {TIPOS_MANTENIMIENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Cada cuántos km</p>
            <input
              type="number"
              value={valorIntervalo}
              onChange={(e) => setValorIntervalo(e.target.value)}
              placeholder="Ej: 5000"
              className="border rounded-lg p-2 w-full"
            />
            <button onClick={guardarIntervalo} className="border rounded-lg p-2 w-full font-semibold">
              Guardar intervalo
            </button>
            {intervalos.length > 0 && (
              <div className="pt-2 text-xs text-gray-500">
                {intervalos.map((i) => (
                  <p key={i.id}>
                    {i.tipo}: cada {i.intervalo_km.toLocaleString()} km
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registrar mantenimiento */}
      <div className="border rounded-lg p-3 mb-4 space-y-2">
        <p className="font-semibold text-sm">Registrar mantenimiento</p>

        <p className="text-xs text-gray-500">Tipo</p>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="border rounded-lg p-2 w-full">
          {TIPOS_MANTENIMIENTO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <p className="text-xs text-gray-500">Fecha</p>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border rounded-lg p-2 w-full"
        />

        <p className="text-xs text-gray-500">Km (se sugiere el estimado, editable)</p>
        <input type="number" value={km} onChange={(e) => setKm(e.target.value)} className="border rounded-lg p-2 w-full" />

        <p className="text-xs text-gray-500 pt-2">Productos usados (del inventario)</p>
        {lineasProductos.map((linea, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={linea.producto_id}
              onChange={(e) => actualizarLinea(i, "producto_id", e.target.value)}
              className="border rounded-lg p-2 flex-1"
            >
              <option value="">Elegir producto</option>
              {productosDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (stock: {p.stock_actual})
                </option>
              ))}
            </select>
            <input
              type="number"
              value={linea.cantidad}
              onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)}
              placeholder="Cant."
              className="border rounded-lg p-2 w-20"
            />
            <button onClick={() => quitarLineaProducto(i)} className="border rounded-lg px-2 text-sm">
              ✕
            </button>
          </div>
        ))}
        <button onClick={agregarLineaProducto} className="text-sm border rounded-lg px-3 py-1">
          + Agregar producto
        </button>

        <p className="text-xs text-gray-500 pt-2">Servicio de tercero (opcional)</p>
        <input
          type="text"
          value={proveedorTercero}
          onChange={(e) => setProveedorTercero(e.target.value)}
          placeholder="Taller / mecánico"
          className="border rounded-lg p-2 w-full"
        />
        <input
          type="number"
          value={costoTercero}
          onChange={(e) => setCostoTercero(e.target.value)}
          placeholder="Costo del servicio"
          className="border rounded-lg p-2 w-full"
        />
        <input
          type="text"
          value={descripcionTercero}
          onChange={(e) => setDescripcionTercero(e.target.value)}
          placeholder="Descripción del servicio recibido"
          className="border rounded-lg p-2 w-full"
        />

        <p className="text-xs text-gray-500 pt-2">Notas</p>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="border rounded-lg p-2 w-full"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button onClick={registrarMantenimiento} className="border rounded-lg p-2 w-full font-semibold">
          Guardar mantenimiento
        </button>
      </div>

      {/* Historial / expediente técnico */}
      <h3 className="font-semibold text-sm mb-1">Expediente técnico (historial)</h3>
      <div className="space-y-2">
        {mantenimientos.map((m) => (
          <button
            key={m.id}
            onClick={() => setMantenimientoDetalle(m)}
            className="w-full border rounded-lg p-3 text-sm text-left hover:bg-gray-50"
          >
            <div className="flex justify-between">
              <p className="font-semibold">{m.tipo}</p>
              <p className="text-gray-500">{m.fecha}</p>
            </div>
            <p className="text-gray-500">
              {m.km ? `${Math.round(m.km).toLocaleString()} km · ` : ""}
              Costo total: {(m.costo_total ?? 0).toFixed(2)}
            </p>
          </button>
        ))}
        {!cargando && mantenimientos.length === 0 && <p className="text-gray-500">Sin mantenimientos registrados.</p>}
      </div>
    </div>
  );
}

function ExpedienteMantenimiento({ mantenimiento, onVolver }: { mantenimiento: Mantenimiento; onVolver: () => void }) {
  const [detalle, setDetalle] = useState<Mantenimiento | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDetalle();
  }, []);

  async function cargarDetalle() {
    setCargando(true);
    const res = await fetch(`/api/admin/mantenimientos/${mantenimiento.id}`);
    const json = await res.json();
    setDetalle(json.mantenimiento ?? null);
    setCargando(false);
  }

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver al historial
      </button>
      <h2 className="font-semibold mb-1">{mantenimiento.tipo}</h2>
      <p className="text-sm text-gray-500 mb-3">
        {mantenimiento.fecha} {mantenimiento.km ? `· ${Math.round(mantenimiento.km).toLocaleString()} km` : ""}
      </p>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      {detalle && (
        <>
          {detalle.productos && detalle.productos.length > 0 && (
            <div className="mb-3">
              <p className="font-semibold text-sm mb-1">Productos usados</p>
              {detalle.productos.map((p) => (
                <div key={p.id} className="text-sm border-b pb-1 flex justify-between">
                  <span>
                    {p.producto_nombre} × {p.cantidad}
                  </span>
                  <span>{p.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {(detalle.costo_servicio_tercero ?? 0) > 0 && (
            <div className="mb-3">
              <p className="font-semibold text-sm mb-1">Servicio de tercero</p>
              <p className="text-sm">Proveedor: {detalle.proveedor_tercero ?? "—"}</p>
              <p className="text-sm">Costo: {detalle.costo_servicio_tercero?.toFixed(2)}</p>
              {detalle.descripcion_servicio_tercero && (
                <p className="text-sm text-gray-500">{detalle.descripcion_servicio_tercero}</p>
              )}
            </div>
          )}

          {detalle.notas && (
            <div className="mb-3">
              <p className="font-semibold text-sm mb-1">Notas</p>
              <p className="text-sm text-gray-500">{detalle.notas}</p>
            </div>
          )}

          <div className="border-t pt-2">
            <p className="font-bold">Costo total: {(detalle.costo_total ?? 0).toFixed(2)}</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= DOCUMENTOS DEL VEHÍCULO ================= */

const TIPOS_DOCUMENTO: { id: TipoDocumento; label: string }[] = [
  { id: "seguro", label: "Seguro" },
  { id: "inspeccion_tecnica", label: "Inspección técnica" },
  { id: "carta_alquiler", label: "Carta de alquiler" },
];

function DetalleDocumentos({ camion, onVolver }: { camion: Camion; onVolver: () => void }) {
  const [documentos, setDocumentos] = useState<DocumentoVehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [tipoNuevo, setTipoNuevo] = useState<TipoDocumento>("seguro");
  const [fechaEmisionNueva, setFechaEmisionNueva] = useState("");
  const [fechaCaducidadNueva, setFechaCaducidadNueva] = useState("");

  useEffect(() => {
    cargarDocumentos();
  }, []);

  async function cargarDocumentos() {
    setCargando(true);
    const res = await fetch(`/api/admin/documentos?camion_id=${camion.id}`);
    const json = await res.json();
    setDocumentos(json.documentos ?? []);
    setCargando(false);
  }

  async function registrarDocumento() {
    setError("");
    if (!fechaCaducidadNueva) {
      setError("Falta la fecha de caducidad");
      return;
    }
    const res = await fetch("/api/admin/documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camion_id: camion.id,
        tipo: tipoNuevo,
        fecha_emision: fechaEmisionNueva || null,
        fecha_caducidad: fechaCaducidadNueva,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setFechaEmisionNueva("");
    setFechaCaducidadNueva("");
    await cargarDocumentos();
  }

  function calcularEstado(fechaCaducidad: string) {
    const hoy = new Date();
    const caducidad = new Date(fechaCaducidad);
    const diasRestantes = Math.round((caducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 0) return { estado: "vencido", diasRestantes };
    if (diasRestantes <= 30) return { estado: "proximo", diasRestantes };
    return { estado: "ok", diasRestantes };
  }

  const colores: Record<string, string> = { ok: "text-green-700", proximo: "text-amber-700", vencido: "text-red-700" };
  const iconos: Record<string, string> = { ok: "✅", proximo: "⚡", vencido: "⚠️" };

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver a vehículos
      </button>
      <h2 className="font-semibold mb-1">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-gray-500 mb-3">{camion.nombre}</p>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      <div className="space-y-2 mb-4">
        {TIPOS_DOCUMENTO.map((td) => {
          const vigente = documentos.find((d) => d.tipo === td.id);
          const estado = vigente ? calcularEstado(vigente.fecha_caducidad) : null;
          return (
            <div key={td.id} className="border rounded-lg p-3">
              <p className="font-semibold text-sm">{td.label}</p>
              {vigente ? (
                <p className={`text-sm ${estado ? colores[estado.estado] : ""}`}>
                  {estado && iconos[estado.estado]} Vence: {vigente.fecha_caducidad}{" "}
                  {estado &&
                    (estado.estado === "vencido"
                      ? `(vencido hace ${Math.abs(estado.diasRestantes)} días)`
                      : `(en ${estado.diasRestantes} días)`)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Sin registrar</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <h2 className="font-semibold mb-2">Registrar / renovar documento</h2>
        <p className="text-xs text-gray-500">Tipo</p>
        <select
          value={tipoNuevo}
          onChange={(e) => setTipoNuevo(e.target.value as TipoDocumento)}
          className="border rounded-lg p-2 w-full mb-2"
        >
          {TIPOS_DOCUMENTO.map((td) => (
            <option key={td.id} value={td.id}>
              {td.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">Fecha de emisión</p>
        <input
          type="date"
          value={fechaEmisionNueva}
          onChange={(e) => setFechaEmisionNueva(e.target.value)}
          className="border rounded-lg p-2 w-full mb-2"
        />
        <p className="text-xs text-gray-500">Fecha de caducidad</p>
        <input
          type="date"
          value={fechaCaducidadNueva}
          onChange={(e) => setFechaCaducidadNueva(e.target.value)}
          className="border rounded-lg p-2 w-full mb-2"
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <button onClick={registrarDocumento} className="border rounded-lg p-2 w-full font-semibold">
          Guardar
        </button>
      </div>
    </div>
  );
}

/* ================= REPORTES ================= */

const LABELS_DOCUMENTO: Record<TipoDocumento, string> = {
  seguro: "Seguro",
  inspeccion_tecnica: "Inspección técnica",
  carta_alquiler: "Carta de alquiler",
};

function PanelReportes() {
  const [alertasMantenimiento, setAlertasMantenimiento] = useState<AlertaMantenimientoReporte[]>([]);
  const [alertasDocumentos, setAlertasDocumentos] = useState<AlertaDocumento[]>([]);
  const [alertasCxC, setAlertasCxC] = useState<AlertaCuentaPorCobrar[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarReportes();
  }, []);

  async function cargarReportes() {
    setCargando(true);
    const res = await fetch("/api/admin/reportes");
    const json = await res.json();
    setAlertasMantenimiento(json.alertasMantenimiento ?? []);
    setAlertasDocumentos(json.alertasDocumentos ?? []);
    setAlertasCxC(json.alertasCuentasPorCobrar ?? []);
    setCargando(false);
  }

  const colores: Record<string, string> = { proximo: "text-amber-700 bg-amber-50 border-amber-400", vencido: "text-red-700 bg-red-50 border-red-400" };
  const iconos: Record<string, string> = { proximo: "⚡", vencido: "⚠️" };

  const sinAlertas = alertasMantenimiento.length === 0 && alertasDocumentos.length === 0 && alertasCxC.length === 0;

  return (
    <div>
      <h2 className="font-semibold mb-2">Reportes y alertas</h2>
      {cargando && <p className="text-gray-500">Cargando...</p>}

      {!cargando && sinAlertas && (
        <p className="text-green-700 bg-green-50 border border-green-400 rounded-lg p-3">
          ✅ Todo al día. No hay alertas de mantenimiento ni documentos por vencer.
        </p>
      )}

      {alertasCxC.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2">Cuentas por cobrar envejecidas</h3>
          <div className="space-y-2">
            {alertasCxC.map((a) => (
              <div key={a.id} className={`border rounded-lg p-3 ${colores[a.estado]}`}>
                <p className="font-semibold text-sm">
                  {iconos[a.estado]} {a.cliente_nombre} {a.cliente_telefono ? `· ${a.cliente_telefono}` : ""}
                </p>
                <p className="text-sm">
                  Monto: {a.monto.toFixed(2)} · {a.dias_antiguedad} días desde la venta
                  {a.camion_matricula ? ` · ${a.camion_matricula}` : a.camion_nombre ? ` · ${a.camion_nombre}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasDocumentos.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2">Documentos del vehículo</h3>
          <div className="space-y-2">
            {alertasDocumentos.map((a, i) => (
              <div key={i} className={`border rounded-lg p-3 ${colores[a.estado]}`}>
                <p className="font-semibold text-sm">
                  {iconos[a.estado]} {a.camion_matricula || a.camion_nombre} — {LABELS_DOCUMENTO[a.tipo]}
                </p>
                <p className="text-sm">
                  {a.estado === "vencido"
                    ? `Vencido hace ${Math.abs(a.dias_restantes)} días`
                    : `Vence en ${a.dias_restantes} días`}{" "}
                  ({a.fecha_caducidad})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasMantenimiento.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2">Mantenimiento preventivo</h3>
          <div className="space-y-2">
            {alertasMantenimiento.map((a, i) => (
              <div key={i} className={`border rounded-lg p-3 ${colores[a.estado]}`}>
                <p className="font-semibold text-sm">
                  {iconos[a.estado]} {a.camion_matricula || a.camion_nombre} — {a.tipo}
                </p>
                <p className="text-sm">
                  {a.estado === "vencido"
                    ? `Vencido hace ${Math.abs(Math.round(a.km_faltantes)).toLocaleString()} km`
                    : `Faltan ${Math.round(a.km_faltantes).toLocaleString()} km`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= CUENTAS POR COBRAR ================= */

function PanelCuentasPorCobrar() {
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarCobradas, setMostrarCobradas] = useState(false);

  useEffect(() => {
    cargarCuentas();
  }, [mostrarCobradas]);

  async function cargarCuentas() {
    setCargando(true);
    const estado = mostrarCobradas ? "todas" : "pendiente";
    const res = await fetch(`/api/admin/cuentas-por-cobrar?estado=${estado}`);
    const json = await res.json();
    setCuentas(json.cuentas ?? []);
    setCargando(false);
  }

  async function marcarCobrado(id: string) {
    await fetch(`/api/admin/cuentas-por-cobrar/${id}/cobrar`, { method: "POST" });
    await cargarCuentas();
  }

  function diasAntiguedad(fechaVenta: string) {
    const hoy = new Date();
    const venta = new Date(fechaVenta);
    return Math.round((hoy.getTime() - venta.getTime()) / (1000 * 60 * 60 * 24));
  }

  function colorPorAntiguedad(dias: number) {
    if (dias >= 30) return "border-red-400 bg-red-50";
    if (dias >= 15) return "border-amber-400 bg-amber-50";
    return "";
  }

  const totalPendiente = cuentas
    .filter((c) => c.estado === "pendiente")
    .reduce((acc, c) => acc + c.monto, 0);

  return (
    <div>
      <h2 className="font-semibold mb-1">Cuentas por cobrar</h2>
      <p className="text-sm text-gray-500 mb-3">
        Total pendiente: <strong>{totalPendiente.toFixed(2)}</strong>
      </p>

      <button
        onClick={() => setMostrarCobradas(!mostrarCobradas)}
        className="text-sm border rounded-lg px-3 py-1 mb-3"
      >
        {mostrarCobradas ? "Ver solo pendientes" : "Ver también cobradas"}
      </button>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      <div className="space-y-2">
        {cuentas.map((c) => {
          const dias = diasAntiguedad(c.fecha_venta);
          return (
            <div
              key={c.id}
              className={`border rounded-lg p-3 ${c.estado === "pendiente" ? colorPorAntiguedad(dias) : "opacity-60"}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{c.cliente_nombre}</p>
                  {c.cliente_telefono && <p className="text-xs text-gray-500">{c.cliente_telefono}</p>}
                  <p className="text-xs text-gray-500">
                    {c.camion?.matricula || c.camion?.nombre || ""} · Venta: {c.fecha_venta}
                  </p>
                  {c.estado === "pendiente" && (
                    <p className="text-xs text-gray-500">{dias} días de antigüedad</p>
                  )}
                  {c.estado === "cobrado" && (
                    <p className="text-xs text-green-700">✅ Cobrado el {c.fecha_cobro}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">{c.monto.toFixed(2)}</p>
                  {c.estado === "pendiente" && (
                    <button
                      onClick={() => marcarCobrado(c.id)}
                      className="text-xs border rounded px-2 py-1 mt-1"
                    >
                      Marcar cobrado
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!cargando && cuentas.length === 0 && <p className="text-gray-500">Sin cuentas por cobrar.</p>}
      </div>
    </div>
  );
}

/* ================= PROVISIÓN DE FONDOS ================= */

function numero(v: string | undefined): number {
  const n = parseFloat(v ?? "");
  return isNaN(n) ? 0 : n;
}

function divisionSegura(numerador: number, ...divisores: number[]): number {
  for (const d of divisores) {
    if (!d) return 0;
  }
  let resultado = numerador;
  for (const d of divisores) {
    resultado = resultado / d;
  }
  return resultado;
}

function PanelProvisionFondos() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [camionSeleccionado, setCamionSeleccionado] = useState<Camion | null>(null);

  useEffect(() => {
    cargarCamiones();
  }, []);

  async function cargarCamiones() {
    setCargando(true);
    const res = await fetch("/api/admin/camiones");
    const json = await res.json();
    setCamiones(json.camiones ?? []);
    setCargando(false);
  }

  if (camionSeleccionado) {
    return <FormularioProvision camion={camionSeleccionado} onVolver={() => setCamionSeleccionado(null)} />;
  }

  return (
    <div>
      <h2 className="font-semibold mb-2">Elegí un camión</h2>
      {cargando && <p className="text-gray-500">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full border rounded-lg p-3 text-left hover:bg-gray-50"
          >
            <p className="font-semibold">{c.matricula || c.nombre}</p>
            <p className="text-sm text-gray-500">{c.nombre}</p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-gray-500">No hay camiones cargados todavía.</p>}
      </div>
    </div>
  );
}

function Campo({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2">
      <p className="text-xs text-gray-500">{label}</p>
      <input
        type="number"
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg p-2 w-full"
      />
    </div>
  );
}

function FormularioProvision({ camion, onVolver }: { camion: Camion; onVolver: () => void }) {
  const [datos, setDatos] = useState<DatosProvisionFondos>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [saldos, setSaldos] = useState<SaldoSubmayor[]>([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [acreditando, setAcreditando] = useState(false);

  useEffect(() => {
    cargarDatos();
    cargarMayor();
  }, []);

  async function cargarMayor() {
    const res = await fetch(`/api/admin/provision/mayor?camion_id=${camion.id}`);
    const json = await res.json();
    setSaldos(json.saldos ?? []);
    setSaldoTotal(json.saldoTotal ?? 0);
  }

  async function acreditarHoy() {
    setAcreditando(true);
    await fetch("/api/admin/provision/acreditar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camion_id: camion.id }),
    });
    await cargarMayor();
    setAcreditando(false);
  }

  async function cargarDatos() {
    setCargando(true);
    const res = await fetch(`/api/admin/provision?camion_id=${camion.id}`);
    const json = await res.json();
    const datosCargados = json.datos ?? {};
    setDatos(datosCargados);
    // Si no hay datos guardados todavía, arrancamos directo en modo edición.
    setModoEdicion(Object.keys(datosCargados).length === 0);
    setCargando(false);
  }

  function set(campo: keyof DatosProvisionFondos, valor: string) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  }

  async function guardar() {
    setGuardando(true);
    await fetch("/api/admin/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camion_id: camion.id, datos }),
    });
    setGuardando(false);
    setGuardado(true);
    setModoEdicion(false);
  }

  // --- Variables base ---
  const a = numero(datos.diasTrabajoMes);
  const b = numero(datos.posiblesViajes);
  const c = numero(datos.promedioKm);

  const d = numero(datos.valorVehiculo);
  const e = numero(datos.vidaUtilVehiculo);
  const f = numero(datos.valorNeumaticos);
  const g = numero(datos.vidaUtilNeumaticos);
  const h = numero(datos.valorBaterias);
  const i = numero(datos.vidaUtilBaterias);
  const j = numero(datos.valorInspeccion);
  const k = numero(datos.vidaUtilInspeccion);
  const l = numero(datos.valorSeguro);
  const m = numero(datos.vidaUtilSeguro);
  const n = numero(datos.valorCartaAlquiler);
  const o = numero(datos.vidaUtilCartaAlquiler);

  const p = numero(datos.valorAceite);
  const q = numero(datos.capacidadEnvase);
  const r = numero(datos.capacidadMotor);
  const s = numero(datos.kmCambioAceite);
  const t = numero(datos.valorFiltro);
  const u = numero(datos.valorOtroMaterial);

  const chapisteria = numero(datos.valorChapisteria);
  const pintura = numero(datos.valorPintura);
  const arreglosMotor = numero(datos.valorArreglosMotor);
  const otrasRoturas = numero(datos.valorOtrasRoturas);

  // --- Cálculos ---
  const kmRecorridosMes = a * b * c;

  const depVehiculo = divisionSegura(d, e, 12, a);
  const depNeumaticos = divisionSegura(f, g, a);
  const depBaterias = divisionSegura(h, i, a);
  const depInspeccion = divisionSegura(j, k, a);
  const depSeguro = divisionSegura(l, m, a);
  const depCartaAlquiler = divisionSegura(n, o, a);
  const subtotalFijo = depVehiculo + depNeumaticos + depBaterias + depInspeccion + depSeguro + depCartaAlquiler;

  const costoAceitePorCambio = q ? (p / q) * r : 0;
  const aceite = s ? divisionSegura(costoAceitePorCambio, s) * b * c : 0;
  const filtros = s ? divisionSegura(t, s) * b * c : 0;
  const otrosMateriales = s ? divisionSegura(u, s) * b * c : 0;

  const chapisteriaDiaria = divisionSegura(chapisteria, 12, a);
  const pinturaDiaria = divisionSegura(pintura, 12, a);
  const arreglosMotorDiaria = divisionSegura(arreglosMotor, 12, a);
  const otrasRoturasDiaria = divisionSegura(otrasRoturas, 12, a);

  const subtotalVariable =
    aceite + filtros + otrosMateriales + chapisteriaDiaria + pinturaDiaria + arreglosMotorDiaria + otrasRoturasDiaria;

  const provisionDiaria = subtotalFijo + subtotalVariable;

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver a camiones
      </button>
      <h2 className="font-semibold mb-1">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-gray-500 mb-3">{camion.nombre}</p>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      {!cargando && !modoEdicion && (
        <div>
          <div className="border rounded-lg p-3 mb-3">
            <p className="text-sm">
              Km recorridos al mes: <strong>{kmRecorridosMes.toLocaleString()}</strong>
            </p>
            <p className="text-sm">Subtotal fijo diario: {subtotalFijo.toFixed(2)}</p>
            <p className="text-sm">Subtotal variable diario: {subtotalVariable.toFixed(2)}</p>
          </div>
          <div className="border-2 border-black rounded-lg p-3 mb-4">
            <p className="font-bold">Provisión diaria total: {provisionDiaria.toFixed(2)}</p>
          </div>

          <div className="border rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-sm">Mayor de provisión (saldo acreedor)</p>
              <button
                onClick={acreditarHoy}
                disabled={acreditando}
                className="text-xs border rounded px-2 py-1"
              >
                {acreditando ? "Acreditando..." : "Acreditar hoy"}
              </button>
            </div>
            <div className="space-y-1">
              {saldos.map((s) => (
                <div key={s.submayor} className="flex justify-between text-sm">
                  <span className="capitalize">{s.submayor.replace(/_/g, " ")}</span>
                  <span>{s.saldo.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-sm border-t mt-2 pt-2">
              <span>Saldo total acreedor</span>
              <span>{saldoTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Este saldo se debita desde la pestaña Finanzas cuando efectivamente se gasta en cada rubro.
            </p>
          </div>

          <button onClick={() => setModoEdicion(true)} className="border rounded-lg p-2 w-full font-semibold">
            Editar
          </button>
        </div>
      )}

      {!cargando && modoEdicion && (
        <>
      {/* Km recorridos */}
      <div className="border rounded-lg p-3 mb-3">
        <p className="font-semibold text-sm mb-2">Km recorridos</p>
        <Campo label="Días de trabajo al mes (a)" valor={datos.diasTrabajoMes} onChange={(v) => set("diasTrabajoMes", v)} />
        <Campo label="Posibles viajes por día (b)" valor={datos.posiblesViajes} onChange={(v) => set("posiblesViajes", v)} />
        <Campo label="Promedio km recorridos por viaje (c)" valor={datos.promedioKm} onChange={(v) => set("promedioKm", v)} />
        <p className="text-sm pt-1">
          Km recorridos al mes: <strong>{kmRecorridosMes.toLocaleString()}</strong>
        </p>
      </div>

      {/* Costos fijos */}
      <div className="border rounded-lg p-3 mb-3">
        <p className="font-semibold text-sm mb-2">Otros costos fijos (depreciación diaria)</p>

        <p className="text-xs font-semibold text-gray-600 mt-2">Vehículo</p>
        <Campo label="Valor de compra (d)" valor={datos.valorVehiculo} onChange={(v) => set("valorVehiculo", v)} />
        <Campo label="Vida útil en años (e)" valor={datos.vidaUtilVehiculo} onChange={(v) => set("vidaUtilVehiculo", v)} />
        <p className="text-xs text-gray-500">Depreciación diaria: {depVehiculo.toFixed(2)}</p>

        <p className="text-xs font-semibold text-gray-600 mt-3">Neumáticos</p>
        <Campo label="Valor de compra (f)" valor={datos.valorNeumaticos} onChange={(v) => set("valorNeumaticos", v)} />
        <Campo label="Vida útil (g)" valor={datos.vidaUtilNeumaticos} onChange={(v) => set("vidaUtilNeumaticos", v)} />
        <p className="text-xs text-gray-500">Depreciación diaria: {depNeumaticos.toFixed(2)}</p>

        <p className="text-xs font-semibold text-gray-600 mt-3">Baterías</p>
        <Campo label="Valor de compra (h)" valor={datos.valorBaterias} onChange={(v) => set("valorBaterias", v)} />
        <Campo label="Vida útil (i)" valor={datos.vidaUtilBaterias} onChange={(v) => set("vidaUtilBaterias", v)} />
        <p className="text-xs text-gray-500">Depreciación diaria: {depBaterias.toFixed(2)}</p>

        <p className="text-xs font-semibold text-gray-600 mt-3">Inspección técnica</p>
        <Campo label="Valor de compra (j)" valor={datos.valorInspeccion} onChange={(v) => set("valorInspeccion", v)} />
        <Campo label="Vida útil (k)" valor={datos.vidaUtilInspeccion} onChange={(v) => set("vidaUtilInspeccion", v)} />
        <p className="text-xs text-gray-500">Depreciación diaria: {depInspeccion.toFixed(2)}</p>

        <p className="text-xs font-semibold text-gray-600 mt-3">Seguro</p>
        <Campo label="Valor de compra (l)" valor={datos.valorSeguro} onChange={(v) => set("valorSeguro", v)} />
        <Campo label="Vida útil (m)" valor={datos.vidaUtilSeguro} onChange={(v) => set("vidaUtilSeguro", v)} />
        <p className="text-xs text-gray-500">Depreciación diaria: {depSeguro.toFixed(2)}</p>

        <p className="text-xs font-semibold text-gray-600 mt-3">Carta de alquiler</p>
        <Campo
          label="Valor de compra (n)"
          valor={datos.valorCartaAlquiler}
          onChange={(v) => set("valorCartaAlquiler", v)}
        />
        <Campo
          label="Vida útil (o)"
          valor={datos.vidaUtilCartaAlquiler}
          onChange={(v) => set("vidaUtilCartaAlquiler", v)}
        />
        <p className="text-xs text-gray-500">Depreciación diaria: {depCartaAlquiler.toFixed(2)}</p>

        <p className="font-bold text-sm pt-3 border-t mt-2">Subtotal fijo diario: {subtotalFijo.toFixed(2)}</p>
      </div>

      {/* Costos variables planificables */}
      <div className="border rounded-lg p-3 mb-3">
        <p className="font-semibold text-sm mb-2">Costos variables planificables</p>

        <p className="text-xs font-semibold text-gray-600">Cambio de aceite</p>
        <Campo label="Valor de compra del aceite (p)" valor={datos.valorAceite} onChange={(v) => set("valorAceite", v)} />
        <Campo label="Capacidad del envase (q)" valor={datos.capacidadEnvase} onChange={(v) => set("capacidadEnvase", v)} />
        <Campo label="Capacidad del motor (r)" valor={datos.capacidadMotor} onChange={(v) => set("capacidadMotor", v)} />
        <Campo
          label="Km planificados para el cambio (s)"
          valor={datos.kmCambioAceite}
          onChange={(v) => set("kmCambioAceite", v)}
        />
        <p className="text-xs text-gray-500">Óleo diario: {aceite.toFixed(2)}</p>

        <Campo label="Valor de compra del filtro (t)" valor={datos.valorFiltro} onChange={(v) => set("valorFiltro", v)} />
        <p className="text-xs text-gray-500">Filtros diario: {filtros.toFixed(2)}</p>

        <Campo
          label="Valor de compra otros materiales (u)"
          valor={datos.valorOtroMaterial}
          onChange={(v) => set("valorOtroMaterial", v)}
        />
        <p className="text-xs text-gray-500">Otros diario: {otrosMateriales.toFixed(2)}</p>

        <p className="text-xs font-semibold text-gray-600 mt-3">Otras roturas estimadas (valor anual)</p>
        <Campo label="Chapistería" valor={datos.valorChapisteria} onChange={(v) => set("valorChapisteria", v)} />
        <p className="text-xs text-gray-500">Diario: {chapisteriaDiaria.toFixed(2)}</p>
        <Campo label="Pintura" valor={datos.valorPintura} onChange={(v) => set("valorPintura", v)} />
        <p className="text-xs text-gray-500">Diario: {pinturaDiaria.toFixed(2)}</p>
        <Campo label="Arreglos de motor" valor={datos.valorArreglosMotor} onChange={(v) => set("valorArreglosMotor", v)} />
        <p className="text-xs text-gray-500">Diario: {arreglosMotorDiaria.toFixed(2)}</p>
        <Campo label="Otras roturas" valor={datos.valorOtrasRoturas} onChange={(v) => set("valorOtrasRoturas", v)} />
        <p className="text-xs text-gray-500">Diario: {otrasRoturasDiaria.toFixed(2)}</p>

        <p className="font-bold text-sm pt-3 border-t mt-2">Subtotal variable diario: {subtotalVariable.toFixed(2)}</p>
      </div>

      <div className="border-2 border-black rounded-lg p-3 mb-4">
        <p className="font-bold">Provisión diaria total: {provisionDiaria.toFixed(2)}</p>
      </div>

      <button onClick={guardar} disabled={guardando} className="border rounded-lg p-2 w-full font-semibold">
        {guardando ? "Guardando..." : guardado ? "✓ Guardado" : "Guardar datos"}
      </button>
      <button
        onClick={() => setModoEdicion(false)}
        className="border rounded-lg p-2 w-full font-semibold mt-2"
      >
        Cancelar
      </button>
      </>
      )}
    </div>
  );
}

/* ================= FINANZAS ================= */

const COLORES_TORTA = ["#000000", "#666666", "#999999", "#cccccc"];

const LABELS_TIPO_FINANZAS: Record<TipoFinanzasMovimiento, string> = {
  capital_inyectado: "Capital inyectado",
  gasto_insumo: "Compra de insumos",
  gasto_servicio_tercero: "Servicio de tercero",
  gasto_otro: "Otro gasto",
  fondo_extraido: "Fondo extraído",
};

function FilaFlujo({ label, valor, negrita, negativo }: { label: string; valor: number; negrita?: boolean; negativo?: boolean }) {
  return (
    <div className={`flex justify-between border-b pb-1 ${negrita ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className={negativo ? "text-red-600" : ""}>
        {negativo ? "-" : ""}
        {Math.abs(valor).toFixed(2)}
      </span>
    </div>
  );
}

function PanelFinanzas() {
  const [resumen, setResumen] = useState<ResumenFinanzas | null>(null);
  const [graficos, setGraficos] = useState<GraficosFinanzas | null>(null);
  const [modo, setModo] = useState<"diario" | "acumulado">("acumulado");
  const [cargando, setCargando] = useState(true);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Formulario de registro
  const [tipo, setTipo] = useState<TipoFinanzasMovimiento>("capital_inyectado");
  const [camionId, setCamionId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [monto, setMonto] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submayor, setSubmayor] = useState("");
  const [tipoMantenimiento, setTipoMantenimiento] = useState(TIPOS_MANTENIMIENTO[0]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    const [resResumen, resGraficos, resCamiones, resProductos] = await Promise.all([
      fetch("/api/admin/finanzas/resumen"),
      fetch("/api/admin/finanzas/graficos"),
      fetch("/api/admin/camiones"),
      fetch("/api/admin/productos"),
    ]);
    setResumen(await resResumen.json());
    setGraficos(await resGraficos.json());
    const jsonCamiones = await resCamiones.json();
    setCamiones(jsonCamiones.camiones ?? []);
    const jsonProductos = await resProductos.json();
    setProductos(jsonProductos.productos ?? []);
    setCargando(false);
  }

  async function registrar() {
    setError("");
    if (!monto) {
      setError("Falta el monto");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/admin/finanzas/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        camion_id: camionId || null,
        producto_id: productoId || null,
        cantidad: cantidad ? parseFloat(cantidad) : null,
        monto: parseFloat(monto),
        proveedor: proveedor.trim() || null,
        descripcion: descripcion.trim() || null,
        submayor: submayor || null,
        tipo_mantenimiento: tipo === "gasto_servicio_tercero" ? tipoMantenimiento : null,
      }),
    });
    const json = await res.json();
    setGuardando(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    setCamionId("");
    setProductoId("");
    setCantidad("");
    setMonto("");
    setProveedor("");
    setDescripcion("");
    setSubmayor("");
    await cargarTodo();
  }

  if (cargando || !resumen || !graficos) {
    return <p className="text-gray-500">Cargando...</p>;
  }

  const paso = resumen[modo];

  const datosFlujo = [
    { name: "Capital", value: paso.capitalInyectado },
    { name: "Ingresos", value: paso.ingresosTotal },
    { name: "Gastos", value: -paso.gastosTotal },
    { name: "Ut. bruta", value: paso.utilidadBruta },
    { name: "Provisión", value: -paso.provision },
    { name: "Ut. real", value: paso.utilidadReal },
    { name: "Efec. operar", value: paso.efectivoAOperar },
    { name: "Fondo extr.", value: -paso.fondoExtraido },
    { name: "Efec. real", value: paso.efectivoRealAOperar },
  ];

  const datosTorta = [
    { name: "Insumos", value: graficos.composicionGastos.insumos },
    { name: "Serv. terceros", value: graficos.composicionGastos.serviciosTerceros },
    { name: "Otros", value: graficos.composicionGastos.otros },
    { name: "Gastos chofer", value: graficos.composicionGastos.gastosChofer },
  ].filter((d) => d.value > 0);

  const margen = paso.ingresosTotal > 0 ? (paso.utilidadReal / paso.ingresosTotal) * 100 : 0;

  return (
    <div>
      <h2 className="font-semibold mb-2">Finanzas</h2>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setModo("diario")}
          className={`border rounded-lg px-3 py-1 text-sm font-semibold ${modo === "diario" ? "bg-black text-white" : ""}`}
        >
          Hoy
        </button>
        <button
          onClick={() => setModo("acumulado")}
          className={`border rounded-lg px-3 py-1 text-sm font-semibold ${modo === "acumulado" ? "bg-black text-white" : ""}`}
        >
          Acumulado
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className={`border rounded-lg p-3 ${paso.utilidadReal >= 0 ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"}`}>
          <p className="text-xs text-gray-500">Utilidad real</p>
          <p className={`font-bold text-lg ${paso.utilidadReal >= 0 ? "text-green-700" : "text-red-700"}`}>
            {paso.utilidadReal.toFixed(2)}
          </p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500">Margen</p>
          <p className="font-bold text-lg">{margen.toFixed(1)}%</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500">Efectivo real a operar</p>
          <p className="font-bold text-lg">{paso.efectivoRealAOperar.toFixed(2)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="font-bold text-lg">{paso.ingresosTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Flujo completo de 9 pasos */}
      <div className="border rounded-lg p-3 mb-4 space-y-1">
        <p className="font-semibold text-sm mb-2">Flujo de caja ({modo})</p>
        <FilaFlujo label="1. Capital inyectado" valor={paso.capitalInyectado} />
        <FilaFlujo label="2. Ingresos (efec.+transf.)" valor={paso.ingresosEfectivoTransferencia} />
        <FilaFlujo label="   Ingresos (cxc cobradas)" valor={paso.ingresosCuentasCobradas} />
        <FilaFlujo label="3. Gastos" valor={paso.gastosTotal} negativo />
        <FilaFlujo label="4. Utilidad bruta" valor={paso.utilidadBruta} negrita />
        <FilaFlujo label="5. Provisión" valor={paso.provision} negativo />
        <FilaFlujo label="6. Utilidad real" valor={paso.utilidadReal} negrita />
        <FilaFlujo label="7. Efectivo a operar" valor={paso.efectivoAOperar} negrita />
        <FilaFlujo label="8. Fondo extraído" valor={paso.fondoExtraido} negativo />
        <FilaFlujo label="9. Efectivo real a operar" valor={paso.efectivoRealAOperar} negrita />
      </div>

      {/* Gráfico de flujo */}
      <div className="border rounded-lg p-3 mb-4">
        <p className="font-semibold text-sm mb-2">Gráfico del flujo de caja</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={datosFlujo}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value">
              {datosFlujo.map((d, i) => (
                <Cell key={i} fill={d.value >= 0 ? "#16a34a" : "#dc2626"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparativo por camión */}
      {graficos.comparativoPorCamion.length > 0 && (
        <div className="border rounded-lg p-3 mb-4">
          <p className="font-semibold text-sm mb-2">Comparativo por camión</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={graficos.comparativoPorCamion.map((c) => ({ name: c.camion_matricula || c.camion_nombre, Ingresos: c.ingresos, Gastos: c.gastos, Utilidad: c.utilidad }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Ingresos" fill="#16a34a" />
              <Bar dataKey="Gastos" fill="#dc2626" />
              <Bar dataKey="Utilidad" fill="#000000" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ranking de rentabilidad */}
      {graficos.comparativoPorCamion.length > 0 && (
        <div className="border rounded-lg p-3 mb-4">
          <p className="font-semibold text-sm mb-2">Ranking de rentabilidad (por litro vendido)</p>
          <div className="space-y-1">
            {graficos.comparativoPorCamion.map((c, i) => (
              <div key={c.camion_id} className="flex justify-between text-sm">
                <span>
                  {i + 1}. {c.camion_matricula || c.camion_nombre}
                </span>
                <span className={c.utilidadPorLitro >= 0 ? "text-green-700" : "text-red-700"}>
                  {c.utilidadPorLitro >= 0 ? "Gana" : "Pierde"} {Math.abs(c.utilidadPorLitro).toFixed(2)} / L
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendencia acumulada */}
      <div className="border rounded-lg p-3 mb-4">
        <p className="font-semibold text-sm mb-2">Tendencia (últimos 30 días)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={graficos.tendencia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fontSize: 8 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="utilidadAcumulada" stroke="#000000" strokeWidth={2} dot={false} name="Utilidad acumulada" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Composición de gastos */}
      {datosTorta.length > 0 && (
        <div className="border rounded-lg p-3 mb-4">
          <p className="font-semibold text-sm mb-2">Composición de gastos (histórico)</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={datosTorta} dataKey="value" nameKey="name" outerRadius={70} label={{ fontSize: 10 }}>
                {datosTorta.map((_, i) => (
                  <Cell key={i} fill={COLORES_TORTA[i % COLORES_TORTA.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Registrar movimiento */}
      <div className="border rounded-lg p-3 mb-4 space-y-2">
        <p className="font-semibold text-sm">Registrar movimiento</p>

        <p className="text-xs text-gray-500">Tipo</p>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoFinanzasMovimiento)}
          className="border rounded-lg p-2 w-full"
        >
          {Object.entries(LABELS_TIPO_FINANZAS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>

        {(tipo === "gasto_servicio_tercero" || tipo === "gasto_otro" || tipo === "capital_inyectado") && (
          <>
            <p className="text-xs text-gray-500">Camión (opcional si es general)</p>
            <select value={camionId} onChange={(e) => setCamionId(e.target.value)} className="border rounded-lg p-2 w-full">
              <option value="">General (no es de un camión específico)</option>
              {camiones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.matricula || c.nombre}
                </option>
              ))}
            </select>
          </>
        )}

        {tipo === "gasto_insumo" && (
          <>
            <p className="text-xs text-gray-500">Producto</p>
            <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="border rounded-lg p-2 w-full">
              <option value="">Elegir producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Cantidad comprada</p>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="border rounded-lg p-2 w-full"
            />
          </>
        )}

        {tipo === "gasto_servicio_tercero" && (
          <>
            <p className="text-xs text-gray-500">Tipo de mantenimiento</p>
            <select
              value={tipoMantenimiento}
              onChange={(e) => setTipoMantenimiento(e.target.value)}
              className="border rounded-lg p-2 w-full"
            >
              {TIPOS_MANTENIMIENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Proveedor / taller</p>
            <input
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="border rounded-lg p-2 w-full"
            />
          </>
        )}

        {(tipo === "gasto_servicio_tercero" || tipo === "gasto_otro") && (
          <>
            <p className="text-xs text-gray-500">Debitar de la Provisión (opcional)</p>
            <select value={submayor} onChange={(e) => setSubmayor(e.target.value)} className="border rounded-lg p-2 w-full">
              <option value="">No debitar de la provisión</option>
              {SUBMAYORES_PROVISION.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </>
        )}

        <p className="text-xs text-gray-500">Monto</p>
        <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="border rounded-lg p-2 w-full" />

        <p className="text-xs text-gray-500">Descripción / observaciones</p>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border rounded-lg p-2 w-full"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button onClick={registrar} disabled={guardando} className="border rounded-lg p-2 w-full font-semibold">
          {guardando ? "Guardando..." : "Registrar"}
        </button>
      </div>
    </div>
  );
}
