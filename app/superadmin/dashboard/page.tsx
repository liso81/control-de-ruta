// app/superadmin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

type Licencia = {
  id: string;
  tipo: "demo" | "pago";
  estado: "vigente" | "por_vencer" | "vencida" | "bloqueada";
  fecha_emision: string;
  fecha_expiracion_demo: string | null;
  fecha_limite_pago: string | null;
  fecha_proximo_vencimiento: string | null;
};

type Empresa = {
  id: string;
  nombre: string;
  dueño_nombre: string;
  dueño_telefono: string;
  estado: "demo" | "activa" | "bloqueada" | "cancelada";
  licencia: Licencia | null;
  codigo: string | null;
};

type Notificacion = {
  id: string;
  tipo: string;
  mensaje: string;
  empresas: { nombre: string; dueño_nombre: string; dueño_telefono: string };
};

const COLOR_ESTADO: Record<string, string> = {
  demo: "bg-blue-100 text-blue-700",
  activa: "bg-emerald-100 text-emerald-700",
  bloqueada: "bg-red-100 text-red-700",
  cancelada: "bg-gray-200 text-gray-600",
  vigente: "bg-emerald-100 text-emerald-700",
  por_vencer: "bg-amber-100 text-amber-700",
  vencida: "bg-orange-100 text-orange-700",
};

function construirLinkWhatsApp(telefono: string, mensaje: string) {
  const soloDigitos = telefono.replace(/\D/g, "");
  return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(mensaje)}`;
}

const DIAS_ANTICIPACION_RENOVACION = 15;

function puedeRenovar(licencia: Licencia | null): boolean {
  if (!licencia) return true;
  if (licencia.tipo === "demo") return true;
  if (!licencia.fecha_proximo_vencimiento) return true;

  const hoy = new Date();
  const vencimiento = new Date(licencia.fecha_proximo_vencimiento + "T00:00:00");
  const diasParaVencer = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  return diasParaVencer <= DIAS_ANTICIPACION_RENOVACION;
}

export default function SuperadminDashboard() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);

  async function cargarDatos() {
    setCargando(true);
    const [resEmpresas, resNotif] = await Promise.all([
      fetch("/api/superadmin/empresas"),
      fetch("/api/superadmin/notificaciones"),
    ]);
    const dataEmpresas = await resEmpresas.json();
    const dataNotif = await resNotif.json();
    setEmpresas(dataEmpresas.empresas ?? []);
    setNotificaciones(dataNotif.notificaciones ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function accionEmpresa(id: string, accion: "renovar" | "bloquear" | "desbloquear" | "cancelar") {
    const clave = `${id}:${accion}`;
    if (accionEnCurso) return;
    setAccionEnCurso(clave);
    try {
      await fetch(`/api/superadmin/empresas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      await cargarDatos();
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function marcarEnviado(id: string) {
    await fetch("/api/superadmin/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    cargarDatos();
  }

  return (
    <main className="min-h-screen bg-[#F5F5F0] pb-24">
      <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Panel de Licencias
        </h1>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-full bg-[#0E7C7B] text-white text-sm px-4 py-2 font-medium"
        >
          + Nueva empresa
        </button>
      </header>

      <div className="px-5 py-5 space-y-8">
        {notificaciones.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Notificaciones pendientes ({notificaciones.length})
            </h2>
            {notificaciones.map((n) => (
              <div key={n.id} className="bg-white rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">{n.empresas?.nombre}</p>
                  <p className="text-xs text-gray-500">{n.mensaje}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={construirLinkWhatsApp(n.empresas?.dueño_telefono ?? "", n.mensaje)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => marcarEnviado(n.id)}
                    className="flex-1 text-center rounded-xl bg-[#25D366] text-white text-sm py-2 font-medium"
                  >
                    Enviar por WhatsApp
                  </a>
                  <button
                    onClick={() => marcarEnviado(n.id)}
                    className="rounded-xl border border-gray-200 text-sm px-3 py-2 text-gray-500"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Empresas ({empresas.length})
          </h2>

          {cargando && <p className="text-sm text-gray-400">Cargando...</p>}

          {!cargando && empresas.length === 0 && (
            <p className="text-sm text-gray-400">Todavía no hay empresas cargadas.</p>
          )}

          {empresas.map((empresa) => (
            <div key={empresa.id} className="bg-white rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{empresa.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {empresa.dueño_nombre} · {empresa.dueño_telefono}
                  </p>
                  {empresa.codigo && (
                    <p className="text-xs mt-1">
                      Código: <span className="font-mono font-semibold text-[#0E7C7B]">{empresa.codigo}</span>
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${COLOR_ESTADO[empresa.estado]}`}
                >
                  {empresa.estado}
                </span>
              </div>

              {empresa.licencia && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>
                    Licencia: <span className="font-medium">{empresa.licencia.tipo}</span> ·{" "}
                    <span className={`px-1.5 py-0.5 rounded ${COLOR_ESTADO[empresa.licencia.estado]}`}>
                      {empresa.licencia.estado}
                    </span>
                  </p>
                  {empresa.licencia.tipo === "demo" ? (
                    <p>Límite de pago: {empresa.licencia.fecha_limite_pago}</p>
                  ) : (
                    <p>Próximo vencimiento: {empresa.licencia.fecha_proximo_vencimiento}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => accionEmpresa(empresa.id, "renovar")}
                  disabled={!!accionEnCurso || !puedeRenovar(empresa.licencia)}
                  className="rounded-lg bg-[#0E7C7B] text-white text-xs px-3 py-1.5 font-medium disabled:opacity-40"
                >
                  {accionEnCurso === `${empresa.id}:renovar` ? "Procesando..." : "Registrar pago / renovar"}
                </button>
                {empresa.licencia?.tipo === "pago" && !puedeRenovar(empresa.licencia) && (
                  <p className="w-full text-[11px] text-gray-400">
                    La renovación se habilita 15 días antes del vencimiento
                  </p>
                )}
                {empresa.estado !== "bloqueada" ? (
                  <button
                    onClick={() => accionEmpresa(empresa.id, "bloquear")}
                    disabled={!!accionEnCurso}
                    className="rounded-lg border border-red-200 text-red-600 text-xs px-3 py-1.5 font-medium disabled:opacity-50"
                  >
                    Bloquear
                  </button>
                ) : (
                  <button
                    onClick={() => accionEmpresa(empresa.id, "desbloquear")}
                    disabled={!!accionEnCurso}
                    className="rounded-lg border border-emerald-200 text-emerald-600 text-xs px-3 py-1.5 font-medium disabled:opacity-50"
                  >
                    Desbloquear
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>

      {mostrarForm && (
        <FormularioNuevaEmpresa
          onClose={() => setMostrarForm(false)}
          onCreada={() => {
            setMostrarForm(false);
            cargarDatos();
          }}
        />
      )}
    </main>
  );
}

function FormularioNuevaEmpresa({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [dueñoNombre, setDueñoNombre] = useState("");
  const [dueñoTelefono, setDueñoTelefono] = useState("");
  const [dueñoEmail, setDueñoEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null);
  const [nombreCreado, setNombreCreado] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const res = await fetch("/api/superadmin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        dueño_nombre: dueñoNombre,
        dueño_telefono: dueñoTelefono,
        dueño_email: dueñoEmail || null,
        admin_username: adminUsername,
        admin_password: adminPassword,
      }),
    });
    const json = await res.json();
    setEnviando(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    setNombreCreado(nombre);
    setCodigoCreado(json.empresa?.codigo ?? null);
  }

  function copiarCodigo() {
    if (!codigoCreado) return;
    navigator.clipboard.writeText(codigoCreado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (codigoCreado) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
        <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            ✅ {nombreCreado} creada
          </h2>
          <p className="text-sm text-gray-500">
            Este es el código de la empresa. Se lo tenés que dar al dueño — lo va a necesitar para vincular su
            Telegram y a los choferes.
          </p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Código de la empresa</p>
            <p className="font-mono text-2xl font-bold text-[#0E7C7B] tracking-widest">{codigoCreado}</p>
          </div>
          <button
            onClick={copiarCodigo}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium"
          >
            {copiado ? "¡Copiado!" : "Copiar código"}
          </button>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm space-y-1">
            <p className="text-xs text-gray-500">Login del panel del dueño (veracsistem.org/admin)</p>
            <p>
              Usuario: <span className="font-mono font-semibold">{adminUsername}</span>
            </p>
            <p>
              Contraseña: <span className="font-mono font-semibold">{adminPassword}</span>
            </p>
          </div>
          <button
            onClick={onCreada}
            className="w-full rounded-xl bg-[#0E7C7B] text-white py-3 text-sm font-medium"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
      >
        <h2 className="font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Nueva empresa (licencia demo, 30 días)
        </h2>

        <input
          placeholder="Nombre del negocio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Nombre del dueño"
          value={dueñoNombre}
          onChange={(e) => setDueñoNombre(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Teléfono (con código de país, ej: 244923...)"
          value={dueñoTelefono}
          onChange={(e) => setDueñoTelefono(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Email (opcional)"
          value={dueñoEmail}
          onChange={(e) => setDueñoEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />

        <div className="border-t border-gray-100 pt-3 space-y-3">
          <p className="text-xs text-gray-500">Login del panel del dueño</p>
          <input
            placeholder="Usuario"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            required
          />
          <input
            placeholder="Contraseña"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-xl bg-[#0E7C7B] text-white py-3 text-sm font-medium disabled:opacity-60"
          >
            {enviando ? "Creando..." : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );
}
