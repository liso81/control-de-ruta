"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Estado = "cargando" | "invalido" | "inicial" | "pendiente" | "aprobado" | "revocado";

export default function UnirsePage() {
  const params = useParams();
  const token = params.token as string;

  const [estado, setEstado] = useState<Estado>("cargando");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [enviando, setEnviando] = useState(false);

  function obtenerDeviceId() {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("device_id", id);
    }
    return id;
  }

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    const res = await fetch(`/api/unirse/${token}`);
    const json = await res.json();
    if (json.error) {
      setEstado("invalido");
      return;
    }
    setEmpresaNombre(json.empresa_nombre);

    const deviceId = obtenerDeviceId();
    const resEstado = await fetch(`/api/unirse/estado?token=${token}&device_id=${deviceId}`);
    const jsonEstado = await resEstado.json();

    if (jsonEstado.estado === "aprobado") {
      localStorage.setItem("camion_id", jsonEstado.camion_id);
      window.location.href = "/";
      return;
    }
    if (jsonEstado.estado === "pendiente") {
      setEstado("pendiente");
      return;
    }
    if (jsonEstado.estado === "revocado") {
      setEstado("revocado");
      return;
    }
    setEstado("inicial");
  }

  async function solicitarAcceso() {
    setEnviando(true);
    const deviceId = obtenerDeviceId();
    const res = await fetch(`/api/unirse/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    });
    const json = await res.json();
    setEnviando(false);

    if (json.estado === "aprobado") {
      localStorage.setItem("camion_id", json.camion_id);
      window.location.href = "/";
      return;
    }
    setEstado(json.estado === "revocado" ? "revocado" : "pendiente");
  }

  async function actualizarEstado() {
    const deviceId = obtenerDeviceId();
    const res = await fetch(`/api/unirse/estado?token=${token}&device_id=${deviceId}`);
    const json = await res.json();
    if (json.estado === "aprobado") {
      localStorage.setItem("camion_id", json.camion_id);
      window.location.href = "/";
      return;
    }
    setEstado(json.estado === "revocado" ? "revocado" : "pendiente");
  }

  if (estado === "cargando") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <p className="text-[var(--color-ink-soft)]">Cargando...</p>
      </main>
    );
  }

  if (estado === "invalido") {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <p className="text-[var(--color-ink-soft)] text-center">
          Este link no es válido o venció. Pedile al dueño que te mande uno nuevo.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto flex flex-col justify-center" style={{ background: "var(--color-bg)" }}>
      <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center mb-5">
        <span className="text-white text-xl font-display font-bold">CR</span>
      </div>

      {estado === "inicial" && (
        <>
          <h1 className="font-display text-2xl font-bold mb-1 text-[var(--color-ink)]">Solicitar acceso</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">
            Vas a pedir acceso a <strong>{empresaNombre}</strong>. El dueño va a elegir a qué camión queda vinculado
            este teléfono.
          </p>
          <button
            onClick={solicitarAcceso}
            disabled={enviando}
            className="w-full rounded-xl bg-[var(--color-accent)] text-white font-semibold py-3 active:scale-[0.98] transition disabled:opacity-50"
          >
            {enviando ? "Enviando..." : `Solicitar acceso a ${empresaNombre}`}
          </button>
        </>
      )}

      {estado === "pendiente" && (
        <>
          <h1 className="font-display text-2xl font-bold mb-1 text-[var(--color-ink)]">Solicitud enviada</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">
            Esperá a que el dueño de <strong>{empresaNombre}</strong> te asigne un camión. Podés cerrar esta pantalla
            y volver a abrir la app más tarde.
          </p>
          <button
            onClick={actualizarEstado}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold py-3 active:scale-[0.98] transition"
          >
            Actualizar
          </button>
        </>
      )}

      {estado === "revocado" && (
        <>
          <h1 className="font-display text-2xl font-bold mb-1 text-[var(--color-ink)]">Acceso revocado</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            El dueño de {empresaNombre} revocó el acceso de este teléfono. Contactalo si creés que es un error.
          </p>
        </>
      )}
    </main>
  );
}
