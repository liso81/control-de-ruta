// app/superadmin/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);

    const res = await fetch("/api/superadmin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });

    setCargando(false);

    if (!res.ok) {
      setError("Usuario o contraseña incorrectos");
      return;
    }

    router.push("/superadmin/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F0] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-5"
      >
        <div className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#0E7C7B] flex items-center justify-center text-white font-semibold text-lg">
            VC
          </div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Panel de Licencias
          </h1>
          <p className="text-sm text-gray-500">Veracsistem — acceso restringido</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C7B]"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C7B]"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-xl bg-[#0E7C7B] text-white py-3 text-sm font-medium disabled:opacity-60"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
