"use client";

import { useEffect, useState } from "react";
import Login from "./components/Login";
import Panel from "./components/Panel";

export default function MiBancoPage() {
  const [cargando, setCargando] = useState(true);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    verificarSesion();
  }, []);

  async function verificarSesion() {
    const res = await fetch("/api/mi-banco/me");
    if (res.ok) {
      const data = await res.json();
      setUsername(data.username);
    }
    setCargando(false);
  }

  if (cargando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </main>
    );
  }

  if (!username) {
    return <Login onLogin={verificarSesion} />;
  }

  return <Panel username={username} onLogout={() => setUsername(null)} />;
}
