"use client";

import { useEffect, useState } from "react";
import type { Camion } from "@/lib/tipos";

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

  return <PanelCamiones />;
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

function PanelCamiones() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [capacidadNueva, setCapacidadNueva] = useState("");
  const [matriculaNueva, setMatriculaNueva] = useState("");
  const [marcaNueva, setMarcaNueva] = useState("");
  const [kmLitroNuevo, setKmLitroNuevo] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [capacidadEdit, setCapacidadEdit] = useState("");
  const [matriculaEdit, setMatriculaEdit] = useState("");
  const [marcaEdit, setMarcaEdit] = useState("");
  const [kmLitroEdit, setKmLitroEdit] = useState("");

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

  async function cerrarSesion() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
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
    await cargarCamiones();
  }

  function empezarEdicion(c: Camion) {
    setEditandoId(c.id);
    setNombreEdit(c.nombre);
    setCapacidadEdit(String(c.capacidad_litros));
    setMatriculaEdit(c.matricula ?? "");
    setMarcaEdit(c.marca ?? "");
    setKmLitroEdit(c.km_por_litro !== null ? String(c.km_por_litro) : "");
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
    <main className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Panel del dueño</h1>
        <button onClick={cerrarSesion} className="text-sm border rounded-lg px-3 py-1">
          Salir
        </button>
      </div>

      <h2 className="font-semibold mb-2">Camiones</h2>

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
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="text-sm text-gray-500">
                    {c.litros_actual.toFixed(2)} L / {c.capacidad_litros.toFixed(2)} L
                  </p>
                  {(c.matricula || c.marca || c.km_por_litro) && (
                    <p className="text-xs text-gray-400">
                      {c.marca ?? ""} {c.matricula ? `· ${c.matricula}` : ""}{" "}
                      {c.km_por_litro ? `· ${c.km_por_litro} km/L` : ""}
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
        <button onClick={crearCamion} className="border rounded-lg p-2 w-full font-semibold">
          Crear camión
        </button>
      </div>
    </main>
  );
}
