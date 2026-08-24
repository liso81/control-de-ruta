"use client";

import { useEffect, useState } from "react";
import type { Camion, Turno, Movimiento, Mantenimiento } from "@/lib/tipos";

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
  const [tab, setTab] = useState<"vehiculos" | "operaciones" | "mantenimientos">("vehiculos");

  async function cerrarSesion() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Panel del dueño</h1>
        <button onClick={cerrarSesion} className="text-sm border rounded-lg px-3 py-1">
          Salir
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setTab("vehiculos")}
          className={`border rounded-lg p-2 text-xs font-semibold ${tab === "vehiculos" ? "bg-black text-white" : ""}`}
        >
          Vehículos
        </button>
        <button
          onClick={() => setTab("operaciones")}
          className={`border rounded-lg p-2 text-xs font-semibold ${tab === "operaciones" ? "bg-black text-white" : ""}`}
        >
          Operaciones
        </button>
        <button
          onClick={() => setTab("mantenimientos")}
          className={`border rounded-lg p-2 text-xs font-semibold ${tab === "mantenimientos" ? "bg-black text-white" : ""}`}
        >
          Mantenimientos
        </button>
      </div>

      {tab === "vehiculos" && <PanelVehiculos />}
      {tab === "operaciones" && <PanelOperaciones />}
      {tab === "mantenimientos" && <PanelMantenimientos />}
    </main>
  );
}

function PanelVehiculos() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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
                <button onClick={() => empezarEdicion(c)} className="text-xs border rounded px-2 py-1">
                  Editar
                </button>
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
    return (
      <DetalleCamion camion={camionSeleccionado} onVolver={() => setCamionSeleccionado(null)} />
    );
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
    return <DetalleMantenimiento camion={camionSeleccionado} onVolver={() => setCamionSeleccionado(null)} />;
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

function DetalleMantenimiento({ camion, onVolver }: { camion: Camion; onVolver: () => void }) {
  const [kmActual, setKmActual] = useState<number | null>(null);
  const [faltaPrecio, setFaltaPrecio] = useState(false);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [tipo, setTipo] = useState(TIPOS_MANTENIMIENTO[0]);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState("");
  const [costo, setCosto] = useState("");
  const [taller, setTaller] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    const [resKm, resMant] = await Promise.all([
      fetch(`/api/admin/camiones/${camion.id}/km`),
      fetch(`/api/admin/mantenimientos?camion_id=${camion.id}`),
    ]);
    const jsonKm = await resKm.json();
    const jsonMant = await resMant.json();
    setKmActual(jsonKm.km_actual ?? null);
    setFaltaPrecio(jsonKm.falta_precio_configurado ?? false);
    setMantenimientos(jsonMant.mantenimientos ?? []);
    if (jsonKm.km_actual !== undefined) setKm(String(Math.round(jsonKm.km_actual)));
    setCargando(false);
  }

  async function registrarMantenimiento() {
    setError("");
    if (!tipo || !fecha) {
      setError("Completá al menos tipo y fecha");
      return;
    }
    const res = await fetch("/api/admin/mantenimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camion_id: camion.id,
        tipo,
        fecha,
        km: km ? parseFloat(km) : null,
        costo: costo ? parseFloat(costo) : null,
        taller: taller.trim() || null,
        notas: notas.trim() || null,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setCosto("");
    setTaller("");
    setNotas("");
    await cargarTodo();
  }

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver a camiones
      </button>
      <h2 className="font-semibold mb-1">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-gray-500 mb-3">
        {camion.nombre} · Km estimado actual:{" "}
        <strong>{kmActual !== null ? Math.round(kmActual).toLocaleString() : "—"} km</strong>
      </p>

      {cargando && <p className="text-gray-500">Cargando...</p>}

      {faltaPrecio && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-400 rounded-lg p-2 mb-3">
          ⚠️ Falta configurar el "Precio por litro de gasóleo" en Vehículos para poder estimar el km recorrido.
        </p>
      )}

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
        <input
          type="number"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          className="border rounded-lg p-2 w-full"
        />

        <p className="text-xs text-gray-500">Costo</p>
        <input
          type="number"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          placeholder="0.00"
          className="border rounded-lg p-2 w-full"
        />

        <p className="text-xs text-gray-500">Taller / mecánico</p>
        <input
          type="text"
          value={taller}
          onChange={(e) => setTaller(e.target.value)}
          className="border rounded-lg p-2 w-full"
        />

        <p className="text-xs text-gray-500">Notas</p>
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

      <h3 className="font-semibold text-sm mb-1">Historial</h3>
      <div className="space-y-2">
        {mantenimientos.map((m) => (
          <div key={m.id} className="border rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <p className="font-semibold">{m.tipo}</p>
              <p className="text-gray-500">{m.fecha}</p>
            </div>
            <p className="text-gray-500">
              {m.km ? `${Math.round(m.km).toLocaleString()} km · ` : ""}
              {m.costo ? `Costo: ${m.costo.toFixed(2)}` : ""}
            </p>
            {m.taller && <p className="text-gray-500">Taller: {m.taller}</p>}
            {m.notas && <p className="text-gray-500">{m.notas}</p>}
          </div>
        ))}
        {!cargando && mantenimientos.length === 0 && <p className="text-gray-500">Sin mantenimientos registrados.</p>}
      </div>
    </div>
  );
}
