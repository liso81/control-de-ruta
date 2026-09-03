"use client";

import { useEffect, useState, useRef } from "react";
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
  MotivoParalizacion,
  Paralizacion,
  AlertaParalizacion,
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
        <p className="text-[var(--color-ink-soft)]">Cargando...</p>
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
    <main className="min-h-screen flex flex-col justify-center px-6 py-10" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-sm w-full mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center mb-5">
          <span className="text-white text-xl font-display font-bold">CR</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-1 text-[var(--color-ink)]">Panel del dueño</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">Control de Ruta — gestión de flota</p>

        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              onKeyDown={(e) => e.key === "Enter" && iniciarSesion()}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <button
            onClick={iniciarSesion}
            disabled={enviando}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition disabled:opacity-40"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </main>
  );
}

type TabId = "reportes" | "vehiculos" | "operaciones" | "mantenimientos" | "inventario" | "cxc" | "provision" | "finanzas" | "choferes";

const ICONOS_TAB: Record<TabId, string> = {
  reportes: "🔔",
  vehiculos: "🚚",
  operaciones: "📋",
  finanzas: "💰",
  mantenimientos: "🔧",
  inventario: "📦",
  cxc: "🧾",
  provision: "🏦",
  choferes: "🧑‍✈️",
};

function PanelAdmin() {
  const [tab, setTab] = useState<TabId>("reportes");
  const [menuAbierto, setMenuAbierto] = useState(false);

  async function cerrarSesion() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const tabsPrincipales: { id: TabId; label: string }[] = [
    { id: "reportes", label: "Reportes" },
    { id: "operaciones", label: "Operac." },
    { id: "finanzas", label: "Finanzas" },
    { id: "vehiculos", label: "Vehículos" },
  ];

  const tabsMas: { id: TabId; label: string }[] = [
    { id: "mantenimientos", label: "Mantenimientos" },
    { id: "inventario", label: "Inventario" },
    { id: "cxc", label: "Cuentas x Cobrar" },
    { id: "provision", label: "Provisión de Fondos" },
    { id: "choferes", label: "Choferes" },
  ];

  const todasLasTabs = [...tabsPrincipales, ...tabsMas];
  const tabActual = todasLasTabs.find((t) => t.id === tab);
  const estaEnMas = tabsMas.some((t) => t.id === tab);

  function elegirTab(id: TabId) {
    setTab(id);
    setMenuAbierto(false);
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
      <div className="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <p className="text-xs text-[var(--color-ink-soft)]">Panel del dueño</p>
            <h1 className="font-display text-lg font-bold text-[var(--color-ink)]">{tabActual?.label}</h1>
          </div>
          <button
            onClick={cerrarSesion}
            className="text-xs font-medium rounded-xl border border-[var(--color-border)] px-3 py-1.5 active:scale-95 transition bg-white"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        {tab === "reportes" && <PanelReportes />}
        {tab === "vehiculos" && <PanelVehiculos />}
        {tab === "operaciones" && <PanelOperaciones />}
        {tab === "mantenimientos" && <PanelMantenimientos />}
        {tab === "inventario" && <PanelInventario />}
        {tab === "cxc" && <PanelCuentasPorCobrar />}
        {tab === "provision" && <PanelProvisionFondos />}
        {tab === "finanzas" && <PanelFinanzas />}
        {tab === "choferes" && <PanelChoferes />}
      </div>

      {/* Barra de navegación inferior, fija, pensada para el pulgar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] z-20">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {tabsPrincipales.map((t) => (
            <button
              key={t.id}
              onClick={() => elegirTab(t.id)}
              className="flex flex-col items-center justify-center gap-0.5 py-2.5 active:opacity-60 transition"
            >
              <span className={`text-lg ${tab === t.id ? "" : "opacity-50"}`}>{ICONOS_TAB[t.id]}</span>
              <span
                className={`text-[10px] font-medium ${tab === t.id ? "text-[var(--color-accent)]" : "text-[var(--color-ink-soft)]"}`}
              >
                {t.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setMenuAbierto(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 active:opacity-60 transition"
          >
            <span className={`text-lg ${estaEnMas ? "" : "opacity-50"}`}>⋯</span>
            <span className={`text-[10px] font-medium ${estaEnMas ? "text-[var(--color-accent)]" : "text-[var(--color-ink-soft)]"}`}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Hoja emergente con el resto de las secciones */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 flex items-end" onClick={() => setMenuAbierto(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white w-full rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-4" />
            <p className="font-display font-semibold text-sm mb-3 text-[var(--color-ink)]">Más secciones</p>
            <div className="grid grid-cols-2 gap-2">
              {tabsMas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => elegirTab(t.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-left active:scale-[0.98] transition ${
                    tab === t.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-white"
                  }`}
                >
                  <span className="text-lg">{ICONOS_TAB[t.id]}</span>
                  <span className="text-sm font-medium text-[var(--color-ink)]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ================= VEHÍCULOS ================= */

function PanelVehiculos() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [camionDocumentos, setCamionDocumentos] = useState<Camion | null>(null);
  const [camionParalizaciones, setCamionParalizaciones] = useState<Camion | null>(null);
  const [camionGPS, setCamionGPS] = useState<Camion | null>(null);

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

  if (camionParalizaciones) {
    return <DetalleParalizaciones camion={camionParalizaciones} onVolver={() => setCamionParalizaciones(null)} />;
  }

  if (camionGPS) {
    return <DetalleGPS camion={camionGPS} onVolver={() => setCamionGPS(null)} />;
  }

  return (
    <div>
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Vehículos</h2>

      {error && <p className="text-[var(--color-danger)] text-sm mb-2">{error}</p>}
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      <div className="space-y-2 mb-4">
        {camiones.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
            {editandoId === c.id ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Nombre</p>
                <input
                  type="text"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Capacidad (litros)</p>
                <input
                  type="number"
                  value={capacidadEdit}
                  onChange={(e) => setCapacidadEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Matrícula</p>
                <input
                  type="text"
                  value={matriculaEdit}
                  onChange={(e) => setMatriculaEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Marca</p>
                <input
                  type="text"
                  value={marcaEdit}
                  onChange={(e) => setMarcaEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Km por litro</p>
                <input
                  type="number"
                  value={kmLitroEdit}
                  onChange={(e) => setKmLitroEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Km base (odómetro al empezar a usar el sistema)</p>
                <input
                  type="number"
                  value={kmBaseEdit}
                  onChange={(e) => setKmBaseEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Precio por litro de gasóleo</p>
                <input
                  type="number"
                  value={precioGasoleoEdit}
                  onChange={(e) => setPrecioGasoleoEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => guardarEdicion(c.id)}
                    className="rounded-xl bg-[var(--color-accent)] text-white px-3 py-2 font-semibold flex-1 active:scale-[0.98] transition"
                  >
                    Guardar
                  </button>
                  <button onClick={() => setEditandoId(null)} className="rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] px-3 py-2 font-semibold flex-1 active:scale-[0.98] transition">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-display font-semibold text-[var(--color-ink)]">{c.matricula || c.nombre}</p>
                  <p className="text-sm text-[var(--color-ink-soft)]">
                    {c.nombre} · {c.litros_actual.toFixed(2)} L / {c.capacidad_litros.toFixed(2)} L
                  </p>
                  {(c.marca || c.km_por_litro) && (
                    <p className="text-xs text-[var(--color-ink-soft)] opacity-70">
                      {c.marca ?? ""} {c.km_por_litro ? `· ${c.km_por_litro} km/L` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => empezarEdicion(c)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 active:scale-95 transition">
                    Editar
                  </button>
                  <button onClick={() => setCamionDocumentos(c)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 active:scale-95 transition">
                    Documentos
                  </button>
                  <button onClick={() => setCamionParalizaciones(c)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 active:scale-95 transition">
                    Paralizaciones
                  </button>
                  <button onClick={() => setCamionGPS(c)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 active:scale-95 transition">
                    GPS
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-[var(--color-ink-soft)]">No hay camiones cargados todavía.</p>}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Agregar camión nuevo</h2>
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre (ej: Camión 2)"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="number"
          value={capacidadNueva}
          onChange={(e) => setCapacidadNueva(e.target.value)}
          placeholder="Capacidad en litros"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="text"
          value={matriculaNueva}
          onChange={(e) => setMatriculaNueva(e.target.value)}
          placeholder="Matrícula"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="text"
          value={marcaNueva}
          onChange={(e) => setMarcaNueva(e.target.value)}
          placeholder="Marca"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="number"
          value={kmLitroNuevo}
          onChange={(e) => setKmLitroNuevo(e.target.value)}
          placeholder="Km por litro"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="number"
          value={kmBaseNuevo}
          onChange={(e) => setKmBaseNuevo(e.target.value)}
          placeholder="Km actual del odómetro (opcional)"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="number"
          value={precioGasoleoNuevo}
          onChange={(e) => setPrecioGasoleoNuevo(e.target.value)}
          placeholder="Precio por litro de gasóleo"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <button onClick={crearCamion} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
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
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Elegí un camión</h2>
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-left active:scale-[0.98] transition"
          >
            <p className="font-display font-semibold text-[var(--color-ink)]">{c.matricula || c.nombre}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">
              {c.nombre} · {c.litros_actual.toFixed(2)} L / {c.capacidad_litros.toFixed(2)} L
            </p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-[var(--color-ink-soft)]">No hay camiones cargados todavía.</p>}
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
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">
        {camion.nombre} · {camion.litros_actual.toFixed(2)} L / {camion.capacidad_litros.toFixed(2)} L
      </p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {turnoHoy && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Hoy — en vivo</h3>
          <button
            onClick={() => setTurnoSeleccionado(turnoHoy)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-left active:scale-[0.98] transition"
          >
            <p className="font-display font-semibold text-[var(--color-ink)]">{turnoHoy.chofer_nombre}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">
              {turnoHoy.estado === "abierto" ? "🟢 Turno abierto" : "✅ Cerrado"}
            </p>
          </button>
        </div>
      )}

      {!cargando && !turnoHoy && <p className="text-[var(--color-ink-soft)] mb-4">Sin turno abierto hoy.</p>}

      <h3 className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Historial</h3>
      <div className="space-y-2">
        {historial.map((t) => (
          <button
            key={t.id}
            onClick={() => setTurnoSeleccionado(t)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-left active:scale-[0.98] transition"
          >
            <p className="font-display font-semibold text-[var(--color-ink)]">{t.fecha}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">
              {t.chofer_nombre} · {t.estado === "cerrado" ? `Remanente: ${t.remanente?.toFixed(2)}` : "Abierto"}
            </p>
          </button>
        ))}
        {!cargando && historial.length === 0 && <p className="text-[var(--color-ink-soft)]">Sin historial todavía.</p>}
      </div>
    </div>
  );
}

function agruparPorConcepto(items: { concepto: string; monto: number }[]) {
  const mapa = new Map<string, { concepto: string; total: number; cantidad: number }>();
  for (const item of items) {
    const existente = mapa.get(item.concepto);
    if (existente) {
      existente.total += item.monto;
      existente.cantidad += 1;
    } else {
      mapa.set(item.concepto, { concepto: item.concepto, total: item.monto, cantidad: 1 });
    }
  }
  return Array.from(mapa.values());
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
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">
        {turno.fecha} · {turno.chofer_nombre}
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">{turno.estado === "abierto" ? "🟢 Abierto" : "✅ Cerrado"}</p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

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
        <div className="rounded-2xl border border-[var(--color-ok)] shadow-sm p-4 mb-3 bg-[var(--color-ok-soft)]">
          <p className="font-display font-semibold text-[var(--color-ink)]">Liquidación</p>
          <p className="text-sm">Entregado: {turno.efectivo_entregado?.toFixed(2)}</p>
          <p className="text-sm">Remanente: {turno.remanente?.toFixed(2)}</p>
          {turno.desglose_efectivo && (
            <div className="text-xs text-[var(--color-ink-soft)] mt-1">
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
        <div className="border border-[var(--color-warn)] bg-[var(--color-warn-soft)] rounded-lg p-3 mb-3">
          <p className="font-semibold text-[var(--color-warn)] text-sm">⚠️ Alertas de sobrante</p>
          {alertas.map((a) => (
            <p key={a.id} className="text-xs text-[var(--color-warn)]">
              {a.litros?.toFixed(2)} L · ≈ {a.monto?.toFixed(2)}
            </p>
          ))}
        </div>
      )}

      <h3 className="font-display font-semibold text-sm mb-1 text-[var(--color-ok)]">💰 Entradas de efectivo</h3>
      <div className="space-y-1 mb-4">
        {ventas.map((m) => (
          <div key={m.id} className="text-sm border-b pb-1 flex justify-between">
            <span>
              venta {m.litros ? `· ${m.litros}L` : ""} {m.cliente_nota ? `· ${m.cliente_nota}` : ""}
            </span>
            <span className="text-[var(--color-ok)]">+{(m.monto ?? 0).toFixed(2)}</span>
          </div>
        ))}
        {ventas.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">Sin ventas.</p>}
      </div>

      <h3 className="font-display font-semibold text-sm mb-1 text-[var(--color-danger)]">💸 Salidas de efectivo</h3>
      <div className="space-y-1">
        {agruparPorConcepto(
          [...compras, ...gastos].map((m) => ({ concepto: m.categoria ?? m.tipo, monto: m.monto ?? 0 }))
        ).map((g) => (
          <div key={g.concepto} className="text-sm border-b pb-1 flex justify-between">
            <span>
              {g.concepto}
              {g.cantidad > 1 ? ` (×${g.cantidad})` : ""}
            </span>
            <span className="text-[var(--color-danger)]">-{g.total.toFixed(2)}</span>
          </div>
        ))}
        {compras.length === 0 && gastos.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">Sin compras ni gastos.</p>
        )}
      </div>

      {!cargando && movimientos.length === 0 && <p className="text-[var(--color-ink-soft)] mt-2">Sin movimientos.</p>}
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
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Inventario (almacén general)</h2>
      {error && <p className="text-[var(--color-danger)] text-sm mb-2">{error}</p>}
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      <div className="space-y-2 mb-4">
        {productos.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
            {editandoId === p.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  placeholder="Nombre"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <input
                  type="text"
                  value={unidadEdit}
                  onChange={(e) => setUnidadEdit(e.target.value)}
                  placeholder="Unidad (litro, unidad, kg...)"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <input
                  type="number"
                  value={precioEdit}
                  onChange={(e) => setPrecioEdit(e.target.value)}
                  placeholder="Precio unitario"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <input
                  type="number"
                  value={stockEdit}
                  onChange={(e) => setStockEdit(e.target.value)}
                  placeholder="Stock disponible"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button onClick={() => guardarEdicion(p.id)} className="rounded-xl bg-[var(--color-accent)] text-white px-3 py-2 font-semibold flex-1 active:scale-[0.98] transition">
                    Guardar
                  </button>
                  <button onClick={() => setEditandoId(null)} className="rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] px-3 py-2 font-semibold flex-1 active:scale-[0.98] transition">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-display font-semibold text-[var(--color-ink)]">{p.nombre}</p>
                  <p className="text-sm text-[var(--color-ink-soft)]">
                    Precio: {p.precio_unitario.toFixed(2)} {p.unidad ? `/ ${p.unidad}` : ""} · Stock: {p.stock_actual}
                  </p>
                </div>
                <button onClick={() => empezarEdicion(p)} className="text-xs font-medium rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 active:scale-95 transition">
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
        {!cargando && productos.length === 0 && <p className="text-[var(--color-ink-soft)]">Sin productos cargados todavía.</p>}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Agregar producto</h2>
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre (ej: Aceite 15W40)"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="text"
          value={unidadNueva}
          onChange={(e) => setUnidadNueva(e.target.value)}
          placeholder="Unidad (litro, unidad, kg...)"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="number"
          value={precioNuevo}
          onChange={(e) => setPrecioNuevo(e.target.value)}
          placeholder="Precio unitario"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <input
          type="number"
          value={stockNuevo}
          onChange={(e) => setStockNuevo(e.target.value)}
          placeholder="Stock inicial"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <button onClick={crearProducto} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
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
      <CartaMantenimientoPrevia />

      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Elegí un camión</h2>
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-left active:scale-[0.98] transition"
          >
            <p className="font-display font-semibold text-[var(--color-ink)]">{c.matricula || c.nombre}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">{c.nombre}</p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-[var(--color-ink-soft)]">No hay camiones cargados todavía.</p>}
      </div>
    </div>
  );
}

function CartaMantenimientoPrevia() {
  const [mostrar, setMostrar] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [tipo, setTipo] = useState(TIPOS_MANTENIMIENTO[0]);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (mostrar) cargarTodo();
  }, [mostrar]);

  async function cargarTodo() {
    setCargando(true);
    const [resBom, resProductos] = await Promise.all([
      fetch("/api/admin/mantenimiento-bom"),
      fetch("/api/admin/productos"),
    ]);
    const jsonBom = await resBom.json();
    const jsonProductos = await resProductos.json();
    setItems(jsonBom.items ?? []);
    setProductos(jsonProductos.productos ?? []);
    setCargando(false);
  }

  async function agregar() {
    setError("");
    if (!productoId || !cantidad) {
      setError("Elegí un producto y una cantidad");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/admin/mantenimiento-bom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, producto_id: productoId, cantidad_necesaria: parseFloat(cantidad) }),
    });
    const json = await res.json();
    setGuardando(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    setProductoId("");
    setCantidad("");
    await cargarTodo();
  }

  async function eliminar(id: number) {
    await fetch(`/api/admin/mantenimiento-bom/${id}`, { method: "DELETE" });
    await cargarTodo();
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setMostrar(!mostrar)}
        className="text-sm font-medium rounded-xl border border-[var(--color-border)] px-3 py-1.5 active:scale-95 transition bg-white mb-2"
      >
        {mostrar ? "Ocultar" : "Configurar"} carta de mantenimiento previa
      </button>

      {mostrar && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm p-4 space-y-2">
          <p className="text-xs text-[var(--color-ink-soft)] mb-1">
            Lista de insumos que normalmente necesita cada tipo de mantenimiento. Cuando un mantenimiento esté próximo o vencido, se compara contra tu Inventario y te avisa si falta algo.
          </p>

          {cargando && <p className="text-[var(--color-ink-soft)] text-sm">Cargando...</p>}

          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo de mantenimiento</p>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          >
            {TIPOS_MANTENIMIENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Producto (del Inventario)</p>
          <select
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          >
            <option value="">Elegí un producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Cantidad que necesita</p>
          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej: 4"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          />

          {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}

          <button
            onClick={agregar}
            disabled={guardando}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Agregar a la carta"}
          </button>

          {items.length > 0 && (
            <div className="pt-2 space-y-1">
              {items.map((it) => (
                <div key={it.id} className="text-sm border-b pb-1 flex justify-between items-center">
                  <span>
                    <strong>{it.tipo}</strong> · {it.cantidad_necesaria} {it.producto?.unidad || ""} de {it.producto?.nombre}
                  </span>
                  <button
                    onClick={() => eliminar(it.id)}
                    className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
  const [lineasProductos, setLineasProductos] = useState<{ producto_id: string; cantidad: string; descripcion: string; observacion: string }[]>([]);
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
    setLineasProductos([...lineasProductos, { producto_id: "", cantidad: "", descripcion: "", observacion: "" }]);
  }

  function quitarLineaProducto(index: number) {
    setLineasProductos(lineasProductos.filter((_, i) => i !== index));
  }

  function actualizarLinea(index: number, campo: "producto_id" | "cantidad" | "descripcion" | "observacion", valor: string) {
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
      .map((l) => ({
        producto_id: l.producto_id,
        cantidad: parseFloat(l.cantidad),
        descripcion: l.descripcion.trim() || null,
        observacion: l.observacion.trim() || null,
      }));

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

  const colores = { ok: "text-[var(--color-ok)]", proximo: "text-[var(--color-warn)]", vencido: "text-[var(--color-danger)]" };
  const iconos = { ok: "✅", proximo: "⚡", vencido: "⚠️" };

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver a camiones
      </button>
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">
        {camion.nombre} · Km estimado:{" "}
        <strong>{kmActual !== null ? Math.round(kmActual).toLocaleString() : "—"} km</strong>
      </p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {faltaPrecio && (
        <p className="text-[var(--color-warn)] text-sm bg-[var(--color-warn-soft)] border border-[var(--color-warn)] rounded-lg p-2 mb-3">
          ⚠️ Falta configurar el "Precio por litro de gasóleo" en Vehículos para estimar el km.
        </p>
      )}

      {/* Alertas */}
      <div className="mb-4">
        <h3 className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Alertas de mantenimiento preventivo</h3>
        {alertas.length === 0 && (
          <p className="text-[var(--color-ink-soft)] text-sm">Sin intervalos configurados todavía.</p>
        )}
        <div className="space-y-1">
          {alertas.map((a) => (
            <div key={a.tipo} className="rounded-xl border border-[var(--color-border)] bg-white p-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">{a.tipo}</p>
                <p className={`text-xs ${colores[a.estado]}`}>
                  {iconos[a.estado]}{" "}
                  {a.estado === "vencido"
                    ? `Vencido hace ${Math.abs(Math.round(a.km_faltantes)).toLocaleString()} km`
                    : `Faltan ${Math.round(a.km_faltantes).toLocaleString()} km`}
                </p>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)] opacity-70">cada {a.intervalo_km.toLocaleString()} km</p>
            </div>
          ))}
        </div>
      </div>

      {/* Intervalos configurables */}
      <div className="mb-4">
        <button onClick={() => setMostrarIntervalos(!mostrarIntervalos)} className="text-sm font-medium rounded-xl border border-[var(--color-border)] px-3 py-1.5 active:scale-95 transition">
          {mostrarIntervalos ? "Ocultar" : "Configurar"} intervalos
        </button>
        {mostrarIntervalos && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm p-4 mt-2 space-y-2">
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo</p>
            <select
              value={tipoIntervalo}
              onChange={(e) => setTipoIntervalo(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            >
              {TIPOS_MANTENIMIENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Cada cuántos km</p>
            <input
              type="number"
              value={valorIntervalo}
              onChange={(e) => setValorIntervalo(e.target.value)}
              placeholder="Ej: 5000"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
            <button onClick={guardarIntervalo} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
              Guardar intervalo
            </button>
            {intervalos.length > 0 && (
              <div className="pt-2 text-xs text-[var(--color-ink-soft)]">
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
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4 space-y-2">
        <p className="font-display font-semibold text-sm text-[var(--color-ink)]">Registrar mantenimiento</p>

        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo</p>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent">
          {TIPOS_MANTENIMIENTO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Fecha</p>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />

        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Km (se sugiere el estimado, editable)</p>
        <input type="number" value={km} onChange={(e) => setKm(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent" />

        <p className="text-xs font-medium text-[var(--color-ink-soft)] pt-2 block">Productos usados (del inventario)</p>
        {lineasProductos.map((linea, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] p-2 space-y-1">
            <div className="flex gap-2">
              <select
                value={linea.producto_id}
                onChange={(e) => actualizarLinea(i, "producto_id", e.target.value)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 flex-1"
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
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 w-20"
              />
              <button onClick={() => quitarLineaProducto(i)} className="rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm active:scale-95 transition">
                ✕
              </button>
            </div>
            <input
              type="text"
              value={linea.descripcion}
              onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)}
              placeholder="Descripción del producto"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={linea.observacion}
              onChange={(e) => actualizarLinea(i, "observacion", e.target.value)}
              placeholder="Observación (opcional)"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button onClick={agregarLineaProducto} className="text-sm font-medium rounded-xl border border-[var(--color-border)] px-3 py-1.5 active:scale-95 transition">
          + Agregar producto
        </button>

        <p className="text-xs font-medium text-[var(--color-ink-soft)] pt-2 block">Servicio de tercero (opcional)</p>
        <input
          type="text"
          value={proveedorTercero}
          onChange={(e) => setProveedorTercero(e.target.value)}
          placeholder="Taller / mecánico"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />
        <input
          type="number"
          value={costoTercero}
          onChange={(e) => setCostoTercero(e.target.value)}
          placeholder="Costo del servicio"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />
        <input
          type="text"
          value={descripcionTercero}
          onChange={(e) => setDescripcionTercero(e.target.value)}
          placeholder="Descripción del servicio recibido"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />

        <p className="text-xs font-medium text-[var(--color-ink-soft)] pt-2 block">Notas</p>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />

        {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}

        <button onClick={registrarMantenimiento} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
          Guardar mantenimiento
        </button>
      </div>

      {/* Historial / expediente técnico */}
      <h3 className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Expediente técnico (historial)</h3>
      <div className="space-y-2">
        {mantenimientos.map((m) => (
          <button
            key={m.id}
            onClick={() => setMantenimientoDetalle(m)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-sm text-left active:scale-[0.98] transition"
          >
            <div className="flex justify-between">
              <p className="font-display font-semibold text-[var(--color-ink)]">{m.tipo}</p>
              <p className="text-[var(--color-ink-soft)]">{m.fecha}</p>
            </div>
            <p className="text-[var(--color-ink-soft)]">
              {m.km ? `${Math.round(m.km).toLocaleString()} km · ` : ""}
              Costo total: {(m.costo_total ?? 0).toFixed(2)}
            </p>
          </button>
        ))}
        {!cargando && mantenimientos.length === 0 && <p className="text-[var(--color-ink-soft)]">Sin mantenimientos registrados.</p>}
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
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">{mantenimiento.tipo}</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">
        {mantenimiento.fecha} {mantenimiento.km ? `· ${Math.round(mantenimiento.km).toLocaleString()} km` : ""}
      </p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {detalle && (
        <>
          {detalle.productos && detalle.productos.length > 0 && (
            <div className="mb-3">
              <p className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Productos usados</p>
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
              <p className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Servicio de tercero</p>
              <p className="text-sm">Proveedor: {detalle.proveedor_tercero ?? "—"}</p>
              <p className="text-sm">Costo: {detalle.costo_servicio_tercero?.toFixed(2)}</p>
              {detalle.descripcion_servicio_tercero && (
                <p className="text-sm text-[var(--color-ink-soft)]">{detalle.descripcion_servicio_tercero}</p>
              )}
            </div>
          )}

          {detalle.notas && (
            <div className="mb-3">
              <p className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Notas</p>
              <p className="text-sm text-[var(--color-ink-soft)]">{detalle.notas}</p>
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

  const colores: Record<string, string> = { ok: "text-[var(--color-ok)]", proximo: "text-[var(--color-warn)]", vencido: "text-[var(--color-danger)]" };
  const iconos: Record<string, string> = { ok: "✅", proximo: "⚡", vencido: "⚠️" };

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3">
        ← Volver a vehículos
      </button>
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">{camion.nombre}</p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      <div className="space-y-2 mb-4">
        {TIPOS_DOCUMENTO.map((td) => {
          const vigente = documentos.find((d) => d.tipo === td.id);
          const estado = vigente ? calcularEstado(vigente.fecha_caducidad) : null;
          return (
            <div key={td.id} className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
              <p className="font-display font-semibold text-sm text-[var(--color-ink)]">{td.label}</p>
              {vigente ? (
                <p className={`text-sm ${estado ? colores[estado.estado] : ""}`}>
                  {estado && iconos[estado.estado]} Vence: {vigente.fecha_caducidad}{" "}
                  {estado &&
                    (estado.estado === "vencido"
                      ? `(vencido hace ${Math.abs(estado.diasRestantes)} días)`
                      : `(en ${estado.diasRestantes} días)`)}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-ink-soft)]">Sin registrar</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Registrar / renovar documento</h2>
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo</p>
        <select
          value={tipoNuevo}
          onChange={(e) => setTipoNuevo(e.target.value as TipoDocumento)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        >
          {TIPOS_DOCUMENTO.map((td) => (
            <option key={td.id} value={td.id}>
              {td.label}
            </option>
          ))}
        </select>
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Fecha de emisión</p>
        <input
          type="date"
          value={fechaEmisionNueva}
          onChange={(e) => setFechaEmisionNueva(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Fecha de caducidad</p>
        <input
          type="date"
          value={fechaCaducidadNueva}
          onChange={(e) => setFechaCaducidadNueva(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent mb-2"
        />
        {error && <p className="text-[var(--color-danger)] text-sm mb-2">{error}</p>}
        <button onClick={registrarDocumento} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
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

function PanelChoferes() {
  const [link, setLink] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [aprobando, setAprobando] = useState<number | null>(null);
  const [camionElegido, setCamionElegido] = useState<Record<number, string>>({});

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    const [resLink, resSolicitudes, resCamiones] = await Promise.all([
      fetch("/api/admin/choferes/generar-link"),
      fetch("/api/admin/choferes/solicitudes"),
      fetch("/api/admin/camiones"),
    ]);
    const jsonLink = await resLink.json();
    const jsonSolicitudes = await resSolicitudes.json();
    const jsonCamiones = await resCamiones.json();
    setLink(jsonLink.token ? `${window.location.origin}/unirse/${jsonLink.token}` : null);
    setSolicitudes(jsonSolicitudes.solicitudes ?? []);
    setCamiones(jsonCamiones.camiones ?? []);
    setCargando(false);
  }

  async function generarLink() {
    setGenerando(true);
    const res = await fetch("/api/admin/choferes/generar-link", { method: "POST" });
    const json = await res.json();
    setGenerando(false);
    if (json.token) setLink(`${window.location.origin}/unirse/${json.token}`);
  }

  function copiarLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function aprobar(solicitudId: number) {
    const camionId = camionElegido[solicitudId];
    if (!camionId) return;
    setAprobando(solicitudId);
    const res = await fetch("/api/admin/choferes/aprobar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solicitud_id: solicitudId, camion_id: camionId }),
    });
    const json = await res.json();
    setAprobando(null);
    if (json.error) {
      window.alert(json.error);
      return;
    }
    await cargarTodo();
  }

  async function revocar(solicitudId: number) {
    if (!window.confirm("¿Revocar el acceso de este teléfono?")) return;
    await fetch("/api/admin/choferes/revocar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solicitud_id: solicitudId }),
    });
    await cargarTodo();
  }

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const aprobados = solicitudes.filter((s) => s.estado === "aprobado");

  return (
    <div>
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Choferes</h2>

      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Link para nuevos choferes</p>
        {link ? (
          <>
            <p className="text-xs text-[var(--color-ink-soft)] break-all mb-2">{link}</p>
            <div className="flex gap-2">
              <button
                onClick={copiarLink}
                className="flex-1 rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2 text-sm active:scale-[0.98] transition"
              >
                {copiado ? "¡Copiado!" : "Copiar link"}
              </button>
              <button
                onClick={generarLink}
                disabled={generando}
                className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm active:scale-95 transition disabled:opacity-50"
              >
                {generando ? "..." : "Regenerar"}
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={generarLink}
            disabled={generando}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition disabled:opacity-50"
          >
            {generando ? "Generando..." : "Generar link"}
          </button>
        )}
        <p className="text-xs text-[var(--color-ink-soft)] mt-2">
          Mandaselo por WhatsApp a un chofer nuevo. Al abrirlo va a pedir acceso, y vos elegís acá a qué camión lo asignás.
        </p>
      </div>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {!cargando && pendientes.length > 0 && (
        <div className="mb-4">
          <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Solicitudes pendientes</p>
          <div className="space-y-2">
            {pendientes.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
                <p className="text-sm text-[var(--color-ink-soft)] mb-2">
                  Solicitud nueva · {new Date(s.created_at).toLocaleString("es")}
                </p>
                <select
                  value={camionElegido[s.id] ?? ""}
                  onChange={(e) => setCamionElegido({ ...camionElegido, [s.id]: e.target.value })}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm mb-2"
                >
                  <option value="">Elegí un camión</option>
                  {camiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.matricula || c.nombre}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => aprobar(s.id)}
                  disabled={!camionElegido[s.id] || aprobando === s.id}
                  className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2 text-sm active:scale-[0.98] transition disabled:opacity-50"
                >
                  {aprobando === s.id ? "Aprobando..." : "Aprobar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!cargando && (
        <div>
          <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Choferes con acceso</p>
          {aprobados.length === 0 && <p className="text-[var(--color-ink-soft)] text-sm">Ninguno todavía.</p>}
          <div className="space-y-2">
            {aprobados.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-3 flex justify-between items-center"
              >
                <span className="text-sm">{s.camion?.matricula || s.camion?.nombre || "Camión"}</span>
                <button
                  onClick={() => revocar(s.id)}
                  className="text-xs font-medium rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] bg-white px-2 py-1 active:scale-95 transition"
                >
                  Revocar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PanelReportes() {
  const [alertasMantenimiento, setAlertasMantenimiento] = useState<AlertaMantenimientoReporte[]>([]);
  const [alertasDocumentos, setAlertasDocumentos] = useState<AlertaDocumento[]>([]);
  const [alertasCxC, setAlertasCxC] = useState<AlertaCuentaPorCobrar[]>([]);
  const [alertasParalizaciones, setAlertasParalizaciones] = useState<AlertaParalizacion[]>([]);
  const [alertasProvisionFondos, setAlertasProvisionFondos] = useState<{ camion_id: string; camion_nombre: string; camion_matricula: string }[]>([]);
  const [alertasProvisionSinAcreditar, setAlertasProvisionSinAcreditar] = useState<{ camion_id: string; camion_nombre: string; camion_matricula: string }[]>([]);
  const [alertasInsumosFaltantes, setAlertasInsumosFaltantes] = useState<{ camion_id: string; camion_nombre: string; camion_matricula: string; tipo: string; producto_nombre: string; unidad: string | null; cantidad_necesaria: number; stock_actual: number; faltante: number }[]>([]);
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
    setAlertasParalizaciones(json.alertasParalizaciones ?? []);
    setAlertasProvisionFondos(json.alertasProvisionFondos ?? []);
    setAlertasProvisionSinAcreditar(json.alertasProvisionSinAcreditar ?? []);
    setAlertasInsumosFaltantes(json.alertasInsumosFaltantes ?? []);
    setCargando(false);
  }

  const colores: Record<string, string> = { proximo: "text-[var(--color-warn)] bg-[var(--color-warn-soft)] border-[var(--color-warn)]", vencido: "text-[var(--color-danger)] bg-[var(--color-danger-soft)] border-[var(--color-danger)]" };
  const iconos: Record<string, string> = { proximo: "⚡", vencido: "⚠️" };

  const sinAlertas =
    alertasMantenimiento.length === 0 &&
    alertasDocumentos.length === 0 &&
    alertasCxC.length === 0 &&
    alertasParalizaciones.length === 0 &&
    alertasProvisionFondos.length === 0 &&
    alertasProvisionSinAcreditar.length === 0 &&
    alertasInsumosFaltantes.length === 0;

  return (
    <div>
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Reportes y alertas</h2>
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {!cargando && sinAlertas && (
        <p className="text-[var(--color-ok)] bg-[var(--color-ok-soft)] border border-[var(--color-ok)] rounded-lg p-3">
          ✅ Todo al día. No hay alertas de mantenimiento ni documentos por vencer.
        </p>
      )}

      {alertasProvisionFondos.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Fondo de cobertura sin crear</h3>
          <div className="space-y-2">
            {alertasProvisionFondos.map((a) => (
              <div key={a.camion_id} className="rounded-2xl shadow-sm p-4 border text-[var(--color-warn)] bg-[var(--color-warn-soft)] border-[var(--color-warn)]">
                <p className="font-semibold text-sm">
                  ⚡ {a.camion_matricula || a.camion_nombre} — Falta crear el fondo de cobertura
                </p>
                <p className="text-sm">
                  Andá a Más → Provisión de Fondos y completá los datos de este camión. Esta alerta desaparece sola apenas lo crees.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasProvisionSinAcreditar.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Fondo de cobertura sin acreditar hoy</h3>
          <div className="space-y-2">
            {alertasProvisionSinAcreditar.map((a) => (
              <div key={a.camion_id} className="rounded-2xl shadow-sm p-4 border text-[var(--color-warn)] bg-[var(--color-warn-soft)] border-[var(--color-warn)]">
                <p className="font-semibold text-sm">
                  ⚡ {a.camion_matricula || a.camion_nombre} — Todavía no acreditaste la provisión de hoy
                </p>
                <p className="text-sm">
                  Andá a Más → Provisión de Fondos → este camión → "Acreditar hoy". Esta alerta desaparece sola apenas lo hagas.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasInsumosFaltantes.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Insumos que vas a necesitar</h3>
          <div className="space-y-2">
            {alertasInsumosFaltantes.map((a, i) => (
              <div key={i} className="rounded-2xl shadow-sm p-4 border text-[var(--color-warn)] bg-[var(--color-warn-soft)] border-[var(--color-warn)]">
                <p className="font-semibold text-sm">
                  ⚡ {a.camion_matricula || a.camion_nombre} — {a.tipo}
                </p>
                <p className="text-sm">
                  Necesitás {a.cantidad_necesaria} {a.unidad || ""} de {a.producto_nombre}, tenés {a.stock_actual} en inventario (faltan {a.faltante}).
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasParalizaciones.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Paralizaciones activas</h3>
          <div className="space-y-2">
            {alertasParalizaciones.map((a) => (
              <div key={a.id} className="rounded-2xl shadow-sm p-4 border text-[var(--color-danger)] bg-[var(--color-danger-soft)] border-[var(--color-danger)]">
                <p className="font-semibold text-sm">
                  ⚠️ {a.camion_matricula || a.camion_nombre} — {a.motivo}
                </p>
                <p className="text-sm">
                  {a.diasParado} día{a.diasParado === 1 ? "" : "s"} parado desde {a.fecha_inicio}
                </p>
                <p className="text-sm font-semibold">
                  Representa ≈ {a.costoEstimado.toFixed(2)} en utilidad no generada
                  {a.utilidadDiariaPromedio > 0 ? ` (${a.utilidadDiariaPromedio.toFixed(2)}/día promedio)` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasCxC.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Cuentas por cobrar envejecidas</h3>
          <div className="space-y-2">
            {alertasCxC.map((a) => (
              <div key={a.id} className={`rounded-2xl shadow-sm p-4 border ${colores[a.estado]}`}>
                <p className="font-display font-semibold text-sm text-[var(--color-ink)]">
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
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Documentos del vehículo</h3>
          <div className="space-y-2">
            {alertasDocumentos.map((a, i) => (
              <div key={i} className={`rounded-2xl shadow-sm p-4 border ${colores[a.estado]}`}>
                <p className="font-display font-semibold text-sm text-[var(--color-ink)]">
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
          <h3 className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Mantenimiento preventivo</h3>
          <div className="space-y-2">
            {alertasMantenimiento.map((a, i) => (
              <div key={i} className={`rounded-2xl shadow-sm p-4 border ${colores[a.estado]}`}>
                <p className="font-display font-semibold text-sm text-[var(--color-ink)]">
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
    if (dias >= 30) return "border-[var(--color-danger)] bg-[var(--color-danger-soft)]";
    if (dias >= 15) return "border-[var(--color-warn)] bg-[var(--color-warn-soft)]";
    return "";
  }

  const totalPendiente = cuentas
    .filter((c) => c.estado === "pendiente")
    .reduce((acc, c) => acc + c.monto, 0);

  return (
    <div>
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">Cuentas por cobrar</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">
        Total pendiente: <strong>{totalPendiente.toFixed(2)}</strong>
      </p>

      <button
        onClick={() => setMostrarCobradas(!mostrarCobradas)}
        className="text-sm font-medium rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 mb-3 active:scale-95 transition"
      >
        {mostrarCobradas ? "Ver solo pendientes" : "Ver también cobradas"}
      </button>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      <div className="space-y-2">
        {cuentas.map((c) => {
          const dias = diasAntiguedad(c.fecha_venta);
          return (
            <div
              key={c.id}
              className={`rounded-2xl shadow-sm p-4 border ${c.estado === "pendiente" ? colorPorAntiguedad(dias) : "opacity-60 border-[var(--color-border)]"}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-display font-semibold text-sm text-[var(--color-ink)]">{c.cliente_nombre}</p>
                  {c.cliente_telefono && <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">{c.cliente_telefono}</p>}
                  <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">
                    {c.camion?.matricula || c.camion?.nombre || ""} · Venta: {c.fecha_venta}
                  </p>
                  {c.estado === "pendiente" && (
                    <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">{dias} días de antigüedad</p>
                  )}
                  {c.estado === "cobrado" && (
                    <p className="text-xs text-[var(--color-ok)]">✅ Cobrado el {c.fecha_cobro}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">{c.monto.toFixed(2)}</p>
                  {c.estado === "pendiente" && (
                    <button
                      onClick={() => marcarCobrado(c.id)}
                      className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 mt-1 active:scale-95 transition"
                    >
                      Marcar cobrado
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!cargando && cuentas.length === 0 && <p className="text-[var(--color-ink-soft)]">Sin cuentas por cobrar.</p>}
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
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Elegí un camión</h2>
      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}
      <div className="space-y-2">
        {camiones.map((c) => (
          <button
            key={c.id}
            onClick={() => setCamionSeleccionado(c)}
            className="w-full bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-left active:scale-[0.98] transition"
          >
            <p className="font-display font-semibold text-[var(--color-ink)]">{c.matricula || c.nombre}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">{c.nombre}</p>
          </button>
        ))}
        {!cargando && camiones.length === 0 && <p className="text-[var(--color-ink-soft)]">No hay camiones cargados todavía.</p>}
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
      <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">{label}</p>
      <input
        type="number"
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
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
  const [errorAcreditar, setErrorAcreditar] = useState("");

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
    setErrorAcreditar("");
    const res = await fetch("/api/admin/provision/acreditar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camion_id: camion.id }),
    });
    const json = await res.json();
    if (json.error) {
      setErrorAcreditar(json.error);
    }
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
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">{camion.nombre}</p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {!cargando && !modoEdicion && (
        <div>
          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-3">
            <p className="text-sm">
              Km recorridos al mes: <strong>{kmRecorridosMes.toLocaleString()}</strong>
            </p>
            <p className="text-sm">Subtotal fijo diario: {subtotalFijo.toFixed(2)}</p>
            <p className="text-sm">Subtotal variable diario: {subtotalVariable.toFixed(2)}</p>
          </div>
          <div className="border-2 border-[var(--color-accent)] rounded-lg p-3 mb-4">
            <p className="font-bold">Provisión diaria total: {provisionDiaria.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-3">
            <div className="flex justify-between items-center mb-2">
              <p className="font-display font-semibold text-sm text-[var(--color-ink)]">Mayor de provisión (saldo acreedor)</p>
              <button
                onClick={acreditarHoy}
                disabled={acreditando}
                className="text-xs font-medium rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 active:scale-95 transition"
              >
                {acreditando ? "Acreditando..." : "Acreditar hoy"}
              </button>
            </div>
            {errorAcreditar && <p className="text-sm text-[var(--color-danger)] mb-2">{errorAcreditar}</p>}
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
            <p className="text-xs text-[var(--color-ink-soft)] mt-2">
              Este saldo se debita desde la pestaña Finanzas cuando efectivamente se gasta en cada rubro.
            </p>
          </div>

          <button onClick={() => setModoEdicion(true)} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
            Editar
          </button>
        </div>
      )}

      {!cargando && modoEdicion && (
        <>
      {/* Km recorridos */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-3">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Km recorridos</p>
        <Campo label="Días de trabajo al mes (a)" valor={datos.diasTrabajoMes} onChange={(v) => set("diasTrabajoMes", v)} />
        <Campo label="Posibles viajes por día (b)" valor={datos.posiblesViajes} onChange={(v) => set("posiblesViajes", v)} />
        <Campo label="Promedio km recorridos por viaje (c)" valor={datos.promedioKm} onChange={(v) => set("promedioKm", v)} />
        <p className="text-sm pt-1">
          Km recorridos al mes: <strong>{kmRecorridosMes.toLocaleString()}</strong>
        </p>
      </div>

      {/* Costos fijos */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-3">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Otros costos fijos (depreciación diaria)</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] mt-2 uppercase tracking-wide">Vehículo</p>
        <Campo label="Valor de compra (d)" valor={datos.valorVehiculo} onChange={(v) => set("valorVehiculo", v)} />
        <Campo label="Vida útil en años (e)" valor={datos.vidaUtilVehiculo} onChange={(v) => set("vidaUtilVehiculo", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Depreciación diaria: {depVehiculo.toFixed(2)}</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] mt-3 uppercase tracking-wide">Neumáticos</p>
        <Campo label="Valor de compra (f)" valor={datos.valorNeumaticos} onChange={(v) => set("valorNeumaticos", v)} />
        <Campo label="Vida útil (g)" valor={datos.vidaUtilNeumaticos} onChange={(v) => set("vidaUtilNeumaticos", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Depreciación diaria: {depNeumaticos.toFixed(2)}</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] mt-3 uppercase tracking-wide">Baterías</p>
        <Campo label="Valor de compra (h)" valor={datos.valorBaterias} onChange={(v) => set("valorBaterias", v)} />
        <Campo label="Vida útil (i)" valor={datos.vidaUtilBaterias} onChange={(v) => set("vidaUtilBaterias", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Depreciación diaria: {depBaterias.toFixed(2)}</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] mt-3 uppercase tracking-wide">Inspección técnica</p>
        <Campo label="Valor de compra (j)" valor={datos.valorInspeccion} onChange={(v) => set("valorInspeccion", v)} />
        <Campo label="Vida útil (k)" valor={datos.vidaUtilInspeccion} onChange={(v) => set("vidaUtilInspeccion", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Depreciación diaria: {depInspeccion.toFixed(2)}</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] mt-3 uppercase tracking-wide">Seguro</p>
        <Campo label="Valor de compra (l)" valor={datos.valorSeguro} onChange={(v) => set("valorSeguro", v)} />
        <Campo label="Vida útil (m)" valor={datos.vidaUtilSeguro} onChange={(v) => set("vidaUtilSeguro", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Depreciación diaria: {depSeguro.toFixed(2)}</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] mt-3 uppercase tracking-wide">Carta de alquiler</p>
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
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Depreciación diaria: {depCartaAlquiler.toFixed(2)}</p>

        <p className="font-bold text-sm pt-3 border-t mt-2">Subtotal fijo diario: {subtotalFijo.toFixed(2)}</p>
      </div>

      {/* Costos variables planificables */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-3">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Costos variables planificables</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] uppercase tracking-wide">Cambio de aceite</p>
        <Campo label="Valor de compra del aceite (p)" valor={datos.valorAceite} onChange={(v) => set("valorAceite", v)} />
        <Campo label="Capacidad del envase (q)" valor={datos.capacidadEnvase} onChange={(v) => set("capacidadEnvase", v)} />
        <Campo label="Capacidad del motor (r)" valor={datos.capacidadMotor} onChange={(v) => set("capacidadMotor", v)} />
        <Campo
          label="Km planificados para el cambio (s)"
          valor={datos.kmCambioAceite}
          onChange={(v) => set("kmCambioAceite", v)}
        />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Óleo diario: {aceite.toFixed(2)}</p>

        <Campo label="Valor de compra del filtro (t)" valor={datos.valorFiltro} onChange={(v) => set("valorFiltro", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Filtros diario: {filtros.toFixed(2)}</p>

        <Campo
          label="Valor de compra otros materiales (u)"
          valor={datos.valorOtroMaterial}
          onChange={(v) => set("valorOtroMaterial", v)}
        />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Otros diario: {otrosMateriales.toFixed(2)}</p>

        <p className="text-xs font-semibold text-[var(--color-accent-dark)] mt-3 uppercase tracking-wide">Otras roturas estimadas (valor anual)</p>
        <Campo label="Chapistería" valor={datos.valorChapisteria} onChange={(v) => set("valorChapisteria", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Diario: {chapisteriaDiaria.toFixed(2)}</p>
        <Campo label="Pintura" valor={datos.valorPintura} onChange={(v) => set("valorPintura", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Diario: {pinturaDiaria.toFixed(2)}</p>
        <Campo label="Arreglos de motor" valor={datos.valorArreglosMotor} onChange={(v) => set("valorArreglosMotor", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Diario: {arreglosMotorDiaria.toFixed(2)}</p>
        <Campo label="Otras roturas" valor={datos.valorOtrasRoturas} onChange={(v) => set("valorOtrasRoturas", v)} />
        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Diario: {otrasRoturasDiaria.toFixed(2)}</p>

        <p className="font-bold text-sm pt-3 border-t mt-2">Subtotal variable diario: {subtotalVariable.toFixed(2)}</p>
      </div>

      <div className="border-2 border-[var(--color-accent)] rounded-lg p-3 mb-4">
        <p className="font-bold">Provisión diaria total: {provisionDiaria.toFixed(2)}</p>
      </div>

      <button onClick={guardar} disabled={guardando} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
        {guardando ? "Guardando..." : guardado ? "✓ Guardado" : "Guardar datos"}
      </button>
      <button
        onClick={() => setModoEdicion(false)}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold py-2.5 mt-2 active:scale-[0.98] transition"
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
      <span className={negativo ? "text-[var(--color-danger)]" : ""}>
        {negativo ? "-" : ""}
        {Math.abs(valor).toFixed(2)}
      </span>
    </div>
  );
}

const GLOSARIO_FINANZAS: { paso: string; explicacion: string }[] = [
  { paso: "1. Capital inyectado", explicacion: "Plata que vos (el dueño) pusiste de tu bolsillo para que el negocio funcione. No es una venta, es un aporte tuyo." },
  { paso: "2. Ingresos", explicacion: "Todo lo que entró por vender agua: en efectivo, por transferencia, y lo que quedó fiado (por cobrar)." },
  { paso: "3. Gastos", explicacion: "Todo lo que salió: comprar insumos, pagar servicios de terceros, otros gastos, y lo que gastaron los choferes en la ruta (combustible, imprevistos, etc.)." },
  { paso: "4. Utilidad bruta", explicacion: "Lo que ganó el negocio antes de guardar plata para el futuro: Ingresos menos Gastos." },
  { paso: "5. Provisión", explicacion: "Plata que se aparta hoy para el día que haya que cambiar neumáticos, hacer un service, renovar el seguro, etc. Es un ahorro obligatorio, no un gasto de hoy." },
  { paso: "6. Utilidad real", explicacion: "Lo que realmente ganaste, después de guardar esa plata para el mantenimiento futuro del camión." },
  { paso: "7. Efectivo a operar", explicacion: "Cuánta plata tenés disponible para seguir trabajando: lo que vos pusiste, más lo que ganaste." },
  { paso: "8. Fondo extraído", explicacion: "Plata que sacaste del negocio para vos, para uso personal (no es un gasto del negocio en sí)." },
  { paso: "9. Efectivo real a operar", explicacion: "Lo que finalmente queda disponible en el negocio, después de que sacaste tu parte." },
  { paso: "Margen", explicacion: "Es tu Utilidad real dividida entre los Ingresos totales, en porcentaje. Si el margen es 50%, quiere decir que de cada 100 que entra al negocio, te quedan 50 limpios — el resto se fue en gastos y en la plata guardada para mantenimiento futuro." },
];

function PanelFinanzas() {
  const [mostrarGlosario, setMostrarGlosario] = useState(false);
  const [resumen, setResumen] = useState<ResumenFinanzas | null>(null);
  const [graficos, setGraficos] = useState<GraficosFinanzas | null>(null);
  const [modo, setModo] = useState<"diario" | "acumulado">("acumulado");
  const [cargando, setCargando] = useState(true);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [otrosGastos, setOtrosGastos] = useState<any[]>([]);
  const [todosMovimientos, setTodosMovimientos] = useState<any[]>([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Formulario de registro
  const [tipo, setTipo] = useState<TipoFinanzasMovimiento>("capital_inyectado");
  const [camionId, setCamionId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [productoNuevoNombre, setProductoNuevoNombre] = useState("");
  const [productoNuevoUnidad, setProductoNuevoUnidad] = useState("");
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
    const resMovimientos = await fetch("/api/admin/finanzas/movimientos?limite=200");
    const jsonMovimientos = await resMovimientos.json();
    setOtrosGastos((jsonMovimientos.movimientos ?? []).filter((m: any) => m.tipo === "gasto_otro"));
    setTodosMovimientos(jsonMovimientos.movimientos ?? []);
    setProductos(jsonProductos.productos ?? []);
    setCargando(false);
  }

  async function registrar() {
    setError("");
    if (!monto) {
      setError("Falta el monto");
      return;
    }
    if (tipo === "gasto_insumo" && !productoId && !productoNuevoNombre.trim()) {
      setError("Elegí un producto o escribí el nombre de uno nuevo");
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
        producto_nombre_nuevo: !productoId ? productoNuevoNombre.trim() || null : null,
        unidad_nueva: productoNuevoUnidad.trim() || null,
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
    setProductoNuevoNombre("");
    setProductoNuevoUnidad("");
    setCantidad("");
    setMonto("");
    setProveedor("");
    setDescripcion("");
    setSubmayor("");
    await cargarTodo();
  }

  if (cargando || !resumen || !graficos) {
    return <p className="text-[var(--color-ink-soft)]">Cargando...</p>;
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
      <h2 className="font-display font-semibold mb-2 text-[var(--color-ink)]">Finanzas</h2>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setModo("diario")}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${modo === "diario" ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-white border-[var(--color-border)] text-[var(--color-ink)]"}`}
        >
          Hoy
        </button>
        <button
          onClick={() => setModo("acumulado")}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${modo === "acumulado" ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-white border-[var(--color-border)] text-[var(--color-ink)]"}`}
        >
          Acumulado
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className={`rounded-2xl shadow-sm p-4 border ${paso.utilidadReal >= 0 ? "bg-[var(--color-ok-soft)] border-[var(--color-ok)]" : "bg-[var(--color-danger-soft)] border-[var(--color-danger)]"}`}>
          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Utilidad real</p>
          <p className={`font-bold text-lg ${paso.utilidadReal >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-danger)]"}`}>
            {paso.utilidadReal.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Margen</p>
          <p className="font-bold text-lg">{margen.toFixed(1)}%</p>
          <p className="text-[10px] text-[var(--color-ink-soft)] mt-1">
            De cada 100 que entra, cuánto te queda limpio después de pagar gastos y guardar plata para
            mantenimiento futuro
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Efectivo real a operar</p>
          <p className="font-bold text-lg">{paso.efectivoRealAOperar.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
          <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Ingresos</p>
          <p className="font-bold text-lg">{paso.ingresosTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Flujo completo de 9 pasos */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4 space-y-1">
        <div className="flex justify-between items-center mb-2">
          <p className="font-display font-semibold text-sm text-[var(--color-ink)]">Flujo de caja ({modo})</p>
          <button
            onClick={() => setMostrarGlosario(!mostrarGlosario)}
            className="text-xs font-medium rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 active:scale-95 transition"
          >
            {mostrarGlosario ? "Ocultar" : "❓ ¿Qué significa cada cosa?"}
          </button>
        </div>

        {mostrarGlosario && (
          <div className="bg-[var(--color-accent-soft)] rounded-xl p-3 mb-3 space-y-2">
            {GLOSARIO_FINANZAS.map((g) => (
              <div key={g.paso}>
                <p className="text-xs font-semibold text-[var(--color-accent-dark)]">{g.paso}</p>
                <p className="text-xs text-[var(--color-ink)]">{g.explicacion}</p>
              </div>
            ))}
          </div>
        )}

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
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Gráfico del flujo de caja</p>
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
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
          <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Comparativo por camión</p>
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
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
          <p className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Ranking de rentabilidad (por litro vendido)</p>
          <p className="text-xs text-[var(--color-ink-soft)] mb-2">
            Compara cuánto te queda de ganancia por cada litro vendido en cada camión. Un camión puede vender
            mucho y aun así ganar poco por litro si gasta de más — este número te muestra eso.
          </p>
          <div className="space-y-1">
            {graficos.comparativoPorCamion.map((c, i) => (
              <div key={c.camion_id} className="flex justify-between text-sm">
                <span>
                  {i + 1}. {c.camion_matricula || c.camion_nombre}
                </span>
                <span className={c.utilidadPorLitro >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-danger)]"}>
                  {c.utilidadPorLitro >= 0 ? "Gana" : "Pierde"} {Math.abs(c.utilidadPorLitro).toFixed(2)} / L
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendencia acumulada */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <p className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Tendencia (últimos 30 días)</p>
        <p className="text-xs text-[var(--color-ink-soft)] mb-2">
          Muestra si el negocio va creciendo o achicándose día a día. Si la línea sube con el tiempo, vas
          mejorando; si baja, es momento de revisar qué está pasando.
        </p>
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
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
          <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">Composición de gastos (histórico)</p>
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

      {/* Otros gastos (Telegram / manual) */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <p className="font-display font-semibold text-sm mb-2 text-[var(--color-ink)]">🧾 Otros gastos</p>
        <div className="space-y-1">
          {otrosGastos.length === 0 && (
            <p className="text-sm text-[var(--color-ink-soft)]">Sin otros gastos registrados todavía.</p>
          )}
          {otrosGastos.map((m) => (
            <div key={m.id} className="text-sm border-b pb-1 flex justify-between">
              <span>
                {m.descripcion || "Otro gasto"}
                {m.proveedor ? ` · ${m.proveedor}` : ""}
                {m.camion ? ` · ${m.camion.matricula || m.camion.nombre}` : ""}
              </span>
              <span className="text-[var(--color-danger)]">-{(m.monto ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botón + lista completa de TODAS las partidas */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4">
        <button
          onClick={() => setMostrarTodos(!mostrarTodos)}
          className="w-full text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 active:scale-95 transition"
        >
          {mostrarTodos ? "Ocultar todas las partidas" : "📋 Ver todas las partidas de gastos"}
        </button>

        {mostrarTodos && (
          <div className="space-y-1 mt-3 max-h-96 overflow-y-auto">
            {todosMovimientos.length === 0 && (
              <p className="text-sm text-[var(--color-ink-soft)]">Sin movimientos registrados.</p>
            )}
            {todosMovimientos.map((m) => (
              <div key={m.id} className="text-sm border-b pb-1">
                <div className="flex justify-between">
                  <span className="font-medium">{m.tipo}</span>
                  <span className={m.monto >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-danger)]"}>
                    {(m.monto ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-ink-soft)]">
                  {m.fecha}
                  {m.descripcion ? ` · ${m.descripcion}` : ""}
                  {m.proveedor ? ` · ${m.proveedor}` : ""}
                  {m.camion ? ` · ${m.camion.matricula || m.camion.nombre}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registrar movimiento */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4 space-y-2">
        <p className="font-display font-semibold text-sm text-[var(--color-ink)]">Registrar movimiento</p>

        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo</p>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoFinanzasMovimiento)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        >
          {Object.entries(LABELS_TIPO_FINANZAS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>

        {(tipo === "gasto_servicio_tercero" || tipo === "gasto_otro" || tipo === "capital_inyectado") && (
          <>
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Camión (opcional si es general)</p>
            <select value={camionId} onChange={(e) => setCamionId(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent">
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
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Producto</p>
            <select
              value={productoId}
              onChange={(e) => {
                setProductoId(e.target.value);
                if (e.target.value) {
                  setProductoNuevoNombre("");
                  setProductoNuevoUnidad("");
                }
              }}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            >
              <option value="">
                {productos.length > 0 ? "Elegir producto existente" : "No hay productos todavía"}
              </option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (precio prom.: {p.precio_unitario.toFixed(2)})
                </option>
              ))}
            </select>

            {!productoId && (
              <>
                <p className="text-xs font-medium text-[var(--color-ink-soft)] pt-1 block">O escribí el nombre de un producto nuevo</p>
                <input
                  type="text"
                  value={productoNuevoNombre}
                  onChange={(e) => setProductoNuevoNombre(e.target.value)}
                  placeholder="Ej: Aceite 15W40"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <input
                  type="text"
                  value={productoNuevoUnidad}
                  onChange={(e) => setProductoNuevoUnidad(e.target.value)}
                  placeholder="Unidad (litro, unidad, kg...) opcional"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
              </>
            )}

            <p className="text-xs font-medium text-[var(--color-ink-soft)] pt-1 block">Cantidad comprada</p>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
            <p className="text-xs text-[var(--color-ink-soft)] opacity-70">
              El precio del producto en Inventario se actualiza como promedio ponderado, no se pisa.
            </p>
          </>
        )}

        {tipo === "gasto_servicio_tercero" && (
          <>
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo de mantenimiento</p>
            <select
              value={tipoMantenimiento}
              onChange={(e) => setTipoMantenimiento(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            >
              {TIPOS_MANTENIMIENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Proveedor / taller</p>
            <input
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
          </>
        )}

        {(tipo === "gasto_servicio_tercero" || tipo === "gasto_otro") && (
          <>
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Debitar de la Provisión (opcional)</p>
            <select value={submayor} onChange={(e) => setSubmayor(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent">
              <option value="">No debitar de la provisión</option>
              {SUBMAYORES_PROVISION.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </>
        )}

        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Monto</p>
        <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent" />

        <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Descripción / observaciones</p>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />

        {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}

        <button onClick={registrar} disabled={guardando} className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition">
          {guardando ? "Guardando..." : "Registrar"}
        </button>
      </div>
    </div>
  );
}

/* ================= PARALIZACIONES ================= */

const MOTIVOS_PARALIZACION: MotivoParalizacion[] = ["En taller", "Sin chofer", "Esperando repuesto", "Sin actividad", "Otro"];

function DetalleParalizaciones({ camion, onVolver }: { camion: Camion; onVolver: () => void }) {
  const [paralizaciones, setParalizaciones] = useState<Paralizacion[]>([]);
  const [utilidadDiariaPromedio, setUtilidadDiariaPromedio] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [motivo, setMotivo] = useState<MotivoParalizacion>("En taller");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    const res = await fetch(`/api/admin/paralizaciones?camion_id=${camion.id}`);
    const json = await res.json();
    setParalizaciones(json.paralizaciones ?? []);
    setUtilidadDiariaPromedio(json.utilidadDiariaPromedio ?? 0);
    setCargando(false);
  }

  const activa = paralizaciones.find((p) => !p.fecha_fin);

  async function iniciarParalizacion() {
    setError("");
    const res = await fetch("/api/admin/paralizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camion_id: camion.id, motivo, fecha_inicio: fechaInicio, notas: notas.trim() || null }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setNotas("");
    await cargarDatos();
  }

  async function finalizarParalizacion(id: string) {
    await fetch(`/api/admin/paralizaciones/${id}`, { method: "PATCH" });
    await cargarDatos();
  }

  function diasDesde(fecha: string) {
    const hoy = new Date();
    const inicio = new Date(fecha);
    return Math.max(1, Math.round((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3 text-[var(--color-ink-soft)]">
        ← Volver a vehículos
      </button>
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">{camion.matricula || camion.nombre}</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3">
        {camion.nombre} · Utilidad diaria promedio (30 días): <strong>{utilidadDiariaPromedio.toFixed(2)}</strong>
      </p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {activa && (
        <div className="rounded-2xl shadow-sm p-4 border border-[var(--color-danger)] bg-[var(--color-danger-soft)] mb-4">
          <p className="font-semibold text-sm text-[var(--color-danger)]">🔴 Parado ahora — {activa.motivo}</p>
          <p className="text-sm text-[var(--color-danger)]">
            {diasDesde(activa.fecha_inicio)} día{diasDesde(activa.fecha_inicio) === 1 ? "" : "s"} desde {activa.fecha_inicio}
          </p>
          <p className="text-sm font-semibold text-[var(--color-danger)]">
            ≈ {(diasDesde(activa.fecha_inicio) * utilidadDiariaPromedio).toFixed(2)} en utilidad no generada
          </p>
          <button
            onClick={() => finalizarParalizacion(activa.id)}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 mt-3 active:scale-[0.98] transition"
          >
            Marcar como resuelto (vuelve a operar hoy)
          </button>
        </div>
      )}

      {!activa && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 mb-4 space-y-2">
          <p className="font-display font-semibold text-sm text-[var(--color-ink)]">Registrar paralización</p>

          <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Motivo</label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoParalizacion)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
          >
            {MOTIVOS_PARALIZACION.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Fecha de inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
          />

          <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Notas (opcional)</label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
          />

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <button
            onClick={iniciarParalizacion}
            className="w-full rounded-xl bg-[var(--color-danger)] text-white font-semibold py-2.5 active:scale-[0.98] transition"
          >
            Registrar paralización
          </button>
        </div>
      )}

      <h3 className="font-display font-semibold text-sm mb-1 text-[var(--color-ink)]">Historial</h3>
      <div className="space-y-2">
        {paralizaciones
          .filter((p) => p.fecha_fin)
          .map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 text-sm">
              <p className="font-semibold text-[var(--color-ink)]">{p.motivo}</p>
              <p className="text-[var(--color-ink-soft)]">
                {p.fecha_inicio} → {p.fecha_fin}
              </p>
              {p.notas && <p className="text-[var(--color-ink-soft)]">{p.notas}</p>}
            </div>
          ))}
        {!cargando && paralizaciones.filter((p) => p.fecha_fin).length === 0 && (
          <p className="text-[var(--color-ink-soft)]">Sin paralizaciones resueltas todavía.</p>
        )}
      </div>
    </div>
  );
}

/* ================= CARGAR DOCUMENTO CON IA ================= */

interface DatosIA {
  tipo_documento: "factura_insumo" | "servicio_tercero" | "documento_vehiculo" | "otro_gasto" | "no_reconocido";
  proveedor: string | null;
  monto: number | null;
  fecha: string | null;
  descripcion: string | null;
  producto_nombre: string | null;
  cantidad: number | null;
  tipo_documento_vehiculo: "seguro" | "inspeccion_tecnica" | "carta_alquiler" | null;
  fecha_emision: string | null;
  fecha_caducidad: string | null;
  matricula: string | null;
  confianza: "alta" | "media" | "baja";
  notas_ia: string | null;
}

function BotonCargarDocumento() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [datos, setDatos] = useState<DatosIA | null>(null);
  const [error, setError] = useState("");
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [camionId, setCamionId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  function abrirCamara() {
    inputRef.current?.click();
  }

  async function archivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError("");
    setDatos(null);
    setGuardadoOk(false);
    setProcesando(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
      });

      const res = await fetch("/api/admin/ia/procesar-documento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen_base64: base64, mime_type: archivo.type }),
      });
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        setProcesando(false);
        return;
      }

      setDatos(json.datos);

      const resCamiones = await fetch("/api/admin/camiones");
      const jsonCamiones = await resCamiones.json();
      const listaCamiones: Camion[] = jsonCamiones.camiones ?? [];
      setCamiones(listaCamiones);

      if (json.datos.matricula) {
        const encontrado = listaCamiones.find(
          (c) => c.matricula?.toLowerCase().trim() === json.datos.matricula.toLowerCase().trim()
        );
        if (encontrado) setCamionId(encontrado.id);
      }
    } catch {
      setError("No se pudo procesar la imagen. Probá de nuevo.");
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function cerrar() {
    setDatos(null);
    setError("");
    setCamionId("");
    setGuardadoOk(false);
  }

  function actualizar<K extends keyof DatosIA>(campo: K, valor: DatosIA[K]) {
    if (!datos) return;
    setDatos({ ...datos, [campo]: valor });
  }

  async function confirmarGuardado() {
    if (!datos) return;
    setError("");
    setGuardando(true);

    try {
      if (datos.tipo_documento === "documento_vehiculo") {
        if (!camionId || !datos.tipo_documento_vehiculo || !datos.fecha_caducidad) {
          setError("Faltan camión, tipo de documento o fecha de caducidad");
          setGuardando(false);
          return;
        }
        const res = await fetch("/api/admin/documentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            camion_id: camionId,
            tipo: datos.tipo_documento_vehiculo,
            fecha_emision: datos.fecha_emision,
            fecha_caducidad: datos.fecha_caducidad,
          }),
        });
        const json = await res.json();
        if (json.error) {
          setError(json.error);
          setGuardando(false);
          return;
        }
      } else {
        const mapaTipo: Record<string, TipoFinanzasMovimiento> = {
          factura_insumo: "gasto_insumo",
          servicio_tercero: "gasto_servicio_tercero",
          otro_gasto: "gasto_otro",
        };
        const tipoFinanzas = mapaTipo[datos.tipo_documento];
        if (!tipoFinanzas || !datos.monto) {
          setError("Faltan datos para registrar el gasto");
          setGuardando(false);
          return;
        }
        const res = await fetch("/api/admin/finanzas/movimientos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: tipoFinanzas,
            camion_id: camionId || null,
            producto_nombre_nuevo: tipoFinanzas === "gasto_insumo" ? datos.producto_nombre : null,
            cantidad: datos.cantidad,
            monto: datos.monto,
            proveedor: datos.proveedor,
            descripcion: datos.descripcion,
            fecha: datos.fecha,
          }),
        });
        const json = await res.json();
        if (json.error) {
          setError(json.error);
          setGuardando(false);
          return;
        }
      }

      setGuardadoOk(true);
      setGuardando(false);
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
      setGuardando(false);
    }
  }

  const LABELS_TIPO_DOC: Record<string, string> = {
    factura_insumo: "Compra de insumo",
    servicio_tercero: "Servicio de tercero",
    documento_vehiculo: "Documento del vehículo",
    otro_gasto: "Otro gasto",
    no_reconocido: "No se pudo identificar",
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={archivoSeleccionado}
        className="hidden"
      />

      <button
        onClick={abrirCamara}
        className="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center text-2xl active:scale-95 transition"
        aria-label="Cargar documento con foto"
      >
        📷
      </button>

      {(procesando || datos || error) && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={procesando ? undefined : cerrar}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-w-md mx-auto max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-4" />

            {procesando && (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🔎</p>
                <p className="font-display font-semibold text-[var(--color-ink)]">Leyendo el documento...</p>
                <p className="text-sm text-[var(--color-ink-soft)] mt-1">Puede tardar unos segundos</p>
              </div>
            )}

            {!procesando && error && (
              <div className="text-center py-6">
                <p className="text-sm text-[var(--color-danger)] mb-4">{error}</p>
                <button
                  onClick={cerrar}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold py-2.5 active:scale-[0.98] transition"
                >
                  Cerrar
                </button>
              </div>
            )}

            {!procesando && !error && guardadoOk && (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">✅</p>
                <p className="font-display font-semibold text-[var(--color-ink)]">Guardado</p>
                <button
                  onClick={cerrar}
                  className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 mt-4 active:scale-[0.98] transition"
                >
                  Listo
                </button>
              </div>
            )}

            {!procesando && !error && !guardadoOk && datos && datos.tipo_documento === "no_reconocido" && (
              <div className="text-center py-6">
                <p className="text-sm text-[var(--color-ink-soft)] mb-4">
                  No pude identificar el documento en la foto. Probá con más luz o más cerca.
                </p>
                <button
                  onClick={cerrar}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold py-2.5 active:scale-[0.98] transition"
                >
                  Cerrar
                </button>
              </div>
            )}

            {!procesando && !error && !guardadoOk && datos && datos.tipo_documento !== "no_reconocido" && (
              <div className="space-y-2">
                <p className="font-display font-semibold text-[var(--color-ink)]">
                  {LABELS_TIPO_DOC[datos.tipo_documento]}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)] mb-2">
                  Confianza de lectura: {datos.confianza}
                  {datos.notas_ia ? ` · ${datos.notas_ia}` : ""}
                </p>

                <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Camión</label>
                <select
                  value={camionId}
                  onChange={(e) => setCamionId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                >
                  <option value="">General (sin camión específico)</option>
                  {camiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.matricula || c.nombre}
                    </option>
                  ))}
                </select>

                {datos.tipo_documento === "documento_vehiculo" ? (
                  <>
                    <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Tipo</label>
                    <select
                      value={datos.tipo_documento_vehiculo ?? ""}
                      onChange={(e) => actualizar("tipo_documento_vehiculo", e.target.value as DatosIA["tipo_documento_vehiculo"])}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                    >
                      <option value="">Elegir...</option>
                      <option value="seguro">Seguro</option>
                      <option value="inspeccion_tecnica">Inspección técnica</option>
                      <option value="carta_alquiler">Carta de alquiler</option>
                    </select>

                    <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Fecha de emisión</label>
                    <input
                      type="date"
                      value={datos.fecha_emision ?? ""}
                      onChange={(e) => actualizar("fecha_emision", e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                    />

                    <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Fecha de caducidad</label>
                    <input
                      type="date"
                      value={datos.fecha_caducidad ?? ""}
                      onChange={(e) => actualizar("fecha_caducidad", e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                    />
                  </>
                ) : (
                  <>
                    {datos.tipo_documento === "factura_insumo" && (
                      <>
                        <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Producto</label>
                        <input
                          type="text"
                          value={datos.producto_nombre ?? ""}
                          onChange={(e) => actualizar("producto_nombre", e.target.value)}
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                        />
                        <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Cantidad</label>
                        <input
                          type="number"
                          value={datos.cantidad ?? ""}
                          onChange={(e) => actualizar("cantidad", parseFloat(e.target.value))}
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                        />
                      </>
                    )}

                    <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Proveedor</label>
                    <input
                      type="text"
                      value={datos.proveedor ?? ""}
                      onChange={(e) => actualizar("proveedor", e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                    />

                    <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Monto</label>
                    <input
                      type="number"
                      value={datos.monto ?? ""}
                      onChange={(e) => actualizar("monto", parseFloat(e.target.value))}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                    />

                    <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Fecha</label>
                    <input
                      type="date"
                      value={datos.fecha ?? ""}
                      onChange={(e) => actualizar("fecha", e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                    />

                    <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Descripción</label>
                    <input
                      type="text"
                      value={datos.descripcion ?? ""}
                      onChange={(e) => actualizar("descripcion", e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
                    />
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={cerrar}
                    className="rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] px-3 py-2.5 font-semibold flex-1 active:scale-[0.98] transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarGuardado}
                    disabled={guardando}
                    className="rounded-xl bg-[var(--color-accent)] text-white px-3 py-2.5 font-semibold flex-1 active:scale-[0.98] transition disabled:opacity-40"
                  >
                    {guardando ? "Guardando..." : "Confirmar y guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ================= CONFIGURACIÓN GPS ================= */

function DetalleGPS({ camion, onVolver }: { camion: Camion; onVolver: () => void }) {
  const [cargando, setCargando] = useState(true);
  const [configurado, setConfigurado] = useState(false);
  const [servidorUrlActual, setServidorUrlActual] = useState<string | null>(null);
  const [iccidActual, setIccidActual] = useState<string | null>(null);
  const [actualizadoEl, setActualizadoEl] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const [servidorUrl, setServidorUrl] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [iccid, setIccid] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState("");
  const [generandoLink, setGenerandoLink] = useState(false);
  const [mostrarFormularioManual, setMostrarFormularioManual] = useState(false);

  useEffect(() => {
    cargarEstado();
  }, []);

  async function generarLink() {
    setGenerandoLink(true);
    setError("");
    const res = await fetch("/api/admin/gps/generar-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camion_id: camion.id }),
    });
    const json = await res.json();
    setGenerandoLink(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    const url = `${window.location.origin}/gps-config/${json.token}`;
    setLinkGenerado(url);
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkGenerado);
  }

  async function cargarEstado() {
    setCargando(true);
    const res = await fetch(`/api/admin/gps?camion_id=${camion.id}`);
    const json = await res.json();
    setConfigurado(json.configurado);
    setServidorUrlActual(json.servidor_url);
    setIccidActual(json.iccid);
    setActualizadoEl(json.updated_at);
    setEditando(!json.configurado);
    setCargando(false);
  }

  async function guardar() {
    setError("");
    if (!servidorUrl.trim() || !usuario.trim() || !password.trim()) {
      setError("Completá al menos servidor, usuario y contraseña");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/admin/gps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camion_id: camion.id,
        servidor_url: servidorUrl.trim(),
        usuario: usuario.trim(),
        password,
        iccid: iccid.trim() || null,
      }),
    });
    const json = await res.json();
    setGuardando(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    setUsuario("");
    setPassword("");
    setGuardadoOk(true);
    await cargarEstado();
  }

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-3 text-[var(--color-ink-soft)]">
        ← Volver a vehículos
      </button>
      <h2 className="font-display font-semibold mb-1 text-[var(--color-ink)]">
        GPS — {camion.matricula || camion.nombre}
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">{camion.nombre}</p>

      {cargando && <p className="text-[var(--color-ink-soft)]">Cargando...</p>}

      {!cargando && configurado && !editando && (
        <div className="bg-white rounded-2xl border border-[var(--color-ok)] shadow-sm p-4 mb-4">
          <p className="font-semibold text-[var(--color-ok)]">✅ GPS configurado</p>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Servidor: {servidorUrlActual}
          </p>
          {iccidActual && <p className="text-sm text-[var(--color-ink-soft)]">ICCID: {iccidActual}</p>}
          {actualizadoEl && (
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">
              Última actualización: {new Date(actualizadoEl).toLocaleDateString()}
            </p>
          )}
          <p className="text-xs text-[var(--color-ink-soft)] mt-2 italic">
            El usuario y la contraseña quedan guardados de forma privada — no se vuelven a mostrar en pantalla.
          </p>
          <button
            onClick={() => setEditando(true)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold py-2.5 mt-3 active:scale-[0.98] transition"
          >
            Reconfigurar / cambiar credenciales
          </button>
        </div>
      )}

      {!cargando && editando && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 space-y-2 mb-3">
          <p className="font-semibold text-sm text-[var(--color-ink)]">
            {configurado ? "Actualizar" : "Configurar"} acceso al GPS
          </p>
          <p className="text-xs text-[var(--color-ink-soft)]">
            Lo más privado: generá un link de un solo uso y mandáselo al dueño del camión por Telegram. Lo completa
            él mismo, desde su propio teléfono — vos nunca ves usuario ni contraseña.
          </p>

          <button
            onClick={generarLink}
            disabled={generandoLink}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 active:scale-[0.98] transition disabled:opacity-40"
          >
            {generandoLink ? "Generando..." : "🔗 Generar link para el dueño"}
          </button>

          {linkGenerado && (
            <div className="border border-[var(--color-border)] rounded-xl p-3 mt-2">
              <p className="text-xs text-[var(--color-ink-soft)] mb-1">
                Link válido por 48 horas, un solo uso:
              </p>
              <p className="text-xs break-all text-[var(--color-ink)] mb-2">{linkGenerado}</p>
              <button
                onClick={copiarLink}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold py-2 active:scale-95 transition text-sm"
              >
                Copiar link
              </button>
            </div>
          )}

          <button
            onClick={() => setMostrarFormularioManual(!mostrarFormularioManual)}
            className="text-xs text-[var(--color-ink-soft)] underline mt-2"
          >
            {mostrarFormularioManual ? "Ocultar" : "O completarlo yo mismo (menos privado)"}
          </button>
        </div>
      )}

      {!cargando && editando && mostrarFormularioManual && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 space-y-2">
          <p className="font-semibold text-sm text-[var(--color-ink)]">Completar manualmente</p>

          <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">
            Servidor GPS (URL)
          </label>
          <input
            type="text"
            value={servidorUrl}
            onChange={(e) => setServidorUrl(e.target.value)}
            placeholder="ej: tuservidor.gpswox.com"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
          />

          <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Usuario</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="off"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
          />

          <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
          />

          <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1 block">
            ICCID del dispositivo (opcional)
          </label>
          <input
            type="text"
            value={iccid}
            onChange={(e) => setIccid(e.target.value)}
            placeholder="Número de serie de la SIM del GPS"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[15px]"
          />

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-2.5 mt-2 active:scale-[0.98] transition disabled:opacity-40"
          >
            {guardando ? "Guardando..." : "Guardar de forma segura"}
          </button>

          {configurado && (
            <button
              onClick={() => setEditando(false)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold py-2.5 active:scale-[0.98] transition"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {guardadoOk && !editando && (
        <p className="text-sm text-[var(--color-ok)] mt-3">✅ Guardado correctamente.</p>
      )}
    </div>
  );
}
