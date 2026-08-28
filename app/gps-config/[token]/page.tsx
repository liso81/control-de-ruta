"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ConfigurarGPSPage() {
  const params = useParams();
  const token = params.token as string;

  const [cargando, setCargando] = useState(true);
  const [valido, setValido] = useState(false);
  const [camionNombre, setCamionNombre] = useState("");
  const [camionMatricula, setCamionMatricula] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [servidorUrl, setServidorUrl] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [iccid, setIccid] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    verificarToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verificarToken() {
    setCargando(true);
    const res = await fetch(`/api/gps-config/${token}`);
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      setValido(false);
    } else {
      setValido(true);
      setCamionNombre(json.camion_nombre ?? "");
      setCamionMatricula(json.camion_matricula ?? null);
    }
    setCargando(false);
  }

  async function guardar() {
    setError("");
    if (!servidorUrl.trim() || !usuario.trim() || !password.trim()) {
      setError("Completá servidor, usuario y contraseña");
      return;
    }
    setGuardando(true);
    const res = await fetch(`/api/gps-config/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
    setListo(true);
  }

  if (cargando) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <p className="text-[var(--color-ink-soft)]">Cargando...</p>
      </main>
    );
  }

  if (!valido) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-center text-[var(--color-ink)] font-semibold">
          {error || "Este link no es válido"}
        </p>
        <p className="text-center text-sm text-[var(--color-ink-soft)] mt-2">
          Pedile a la persona que te lo compartió que te genere uno nuevo.
        </p>
      </main>
    );
  }

  if (listo) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <p className="text-3xl mb-3">✅</p>
        <p className="text-center text-[var(--color-ink)] font-semibold">Datos guardados correctamente</p>
        <p className="text-center text-sm text-[var(--color-ink-soft)] mt-2">
          Ya podés cerrar esta ventana. Este link ya no se puede volver a usar.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center mb-5">
          <span className="text-white text-xl font-display font-bold">CR</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-1 text-[var(--color-ink)]">Configurar GPS</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-1">
          Camión: {camionMatricula || camionNombre}
        </p>
        <p className="text-sm text-[var(--color-ink-soft)] mb-5">
          Cargá acá los datos de acceso al sistema de GPS de este camión. Esta información queda guardada de forma
          privada — la persona que te compartió este link no puede verla.
        </p>

        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-4 space-y-2">
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
        </div>
      </div>
    </main>
  );
}
