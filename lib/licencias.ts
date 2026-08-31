// lib/licencias.ts
// Lógica central de licencias. Sin dependencias externas — solo Date nativo.

export const DIAS_DEMO = 30;
export const DIAS_LIMITE_PAGO = 45; // desde la emisión, si no pagó -> bloqueo
export const DIAS_GRACIA_RENOVACION = 7; // margen tras vencer una licencia paga
export const MESES_CICLO_PAGO = 2;

export type Empresa = {
  id: string;
  nombre: string;
  dueño_nombre: string;
  dueño_telefono: string;
  dueño_email?: string | null;
  estado: "demo" | "activa" | "bloqueada" | "cancelada";
};

export type Licencia = {
  id: string;
  empresa_id: string;
  tipo: "demo" | "pago";
  fecha_emision: string; // ISO date
  fecha_expiracion_demo: string | null;
  fecha_limite_pago: string | null;
  fecha_pago: string | null;
  fecha_proximo_vencimiento: string | null;
  estado: "vigente" | "por_vencer" | "vencida" | "bloqueada";
};

function sumarDias(fecha: Date, dias: number) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function sumarMeses(fecha: Date, meses: number) {
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + meses);
  return d;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function diasEntre(desde: Date, hasta: Date) {
  const ms = hasta.getTime() - desde.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatoFechaLegible(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-AO", { day: "2-digit", month: "long", year: "numeric" });
}

// ---------- Creación de licencia demo ----------
export function crearLicenciaDemo(empresaId: string) {
  const hoy = new Date();
  const expiracionDemo = sumarDias(hoy, DIAS_DEMO);
  const limitePago = sumarDias(hoy, DIAS_LIMITE_PAGO);

  return {
    empresa_id: empresaId,
    tipo: "demo" as const,
    fecha_emision: toISODate(hoy),
    fecha_expiracion_demo: toISODate(expiracionDemo),
    fecha_limite_pago: toISODate(limitePago),
    fecha_pago: null,
    fecha_proximo_vencimiento: null,
    estado: "vigente" as const,
  };
}

// ---------- Registrar pago / renovar ----------
export function registrarPago(licenciaActual: Pick<Licencia, "fecha_proximo_vencimiento">) {
  const hoy = new Date();
  // Si venía de una licencia paga vigente, extiende desde el vencimiento anterior.
  // Si venía de demo o ya vencida, arranca desde hoy.
  const base = licenciaActual.fecha_proximo_vencimiento
    ? new Date(licenciaActual.fecha_proximo_vencimiento + "T00:00:00")
    : hoy;
  const puntoDePartida = base > hoy ? base : hoy;
  const proximoVencimiento = sumarMeses(puntoDePartida, MESES_CICLO_PAGO);

  return {
    tipo: "pago" as const,
    fecha_pago: toISODate(hoy),
    fecha_proximo_vencimiento: toISODate(proximoVencimiento),
    estado: "vigente" as const,
  };
}

// ---------- Cálculo de estado (usado por el cron) ----------
export type Evaluacion = {
  nuevoEstadoLicencia: Licencia["estado"];
  nuevoEstadoEmpresa: Empresa["estado"] | null; // null = no cambiar
  notificacion: null | {
    tipo: "recordatorio_demo" | "demo_vencido" | "recordatorio_renovacion" | "pago_vencido" | "bloqueo";
  };
};

export function evaluarLicencia(licencia: Licencia): Evaluacion {
  const hoy = new Date();

  if (licencia.tipo === "demo") {
    const limitePago = new Date((licencia.fecha_limite_pago as string) + "T00:00:00");
    const expiracionDemo = new Date((licencia.fecha_expiracion_demo as string) + "T00:00:00");
    const pagó = !!licencia.fecha_pago;

    if (pagó) {
      return { nuevoEstadoLicencia: "vigente", nuevoEstadoEmpresa: null, notificacion: null };
    }
    if (hoy > limitePago) {
      return { nuevoEstadoLicencia: "bloqueada", nuevoEstadoEmpresa: "bloqueada", notificacion: { tipo: "bloqueo" } };
    }
    if (hoy > expiracionDemo) {
      // Zona de gracia (día 30 a 45)
      return { nuevoEstadoLicencia: "vencida", nuevoEstadoEmpresa: null, notificacion: { tipo: "demo_vencido" } };
    }
    const diasParaVencer = diasEntre(hoy, expiracionDemo);
    if (diasParaVencer <= 10) {
      return { nuevoEstadoLicencia: "por_vencer", nuevoEstadoEmpresa: null, notificacion: { tipo: "recordatorio_demo" } };
    }
    return { nuevoEstadoLicencia: "vigente", nuevoEstadoEmpresa: null, notificacion: null };
  }

  // tipo === "pago"
  const vencimiento = new Date((licencia.fecha_proximo_vencimiento as string) + "T00:00:00");
  const limiteBloqueo = sumarDias(vencimiento, DIAS_GRACIA_RENOVACION);

  if (hoy > limiteBloqueo) {
    return { nuevoEstadoLicencia: "bloqueada", nuevoEstadoEmpresa: "bloqueada", notificacion: { tipo: "bloqueo" } };
  }
  if (hoy > vencimiento) {
    return { nuevoEstadoLicencia: "vencida", nuevoEstadoEmpresa: null, notificacion: { tipo: "pago_vencido" } };
  }
  const diasParaVencer = diasEntre(hoy, vencimiento);
  if (diasParaVencer <= 7) {
    return { nuevoEstadoLicencia: "por_vencer", nuevoEstadoEmpresa: null, notificacion: { tipo: "recordatorio_renovacion" } };
  }
  return { nuevoEstadoLicencia: "vigente", nuevoEstadoEmpresa: null, notificacion: null };
}

// ---------- Mensajes de WhatsApp ----------
export function generarMensaje(
  tipo: "recordatorio_demo" | "demo_vencido" | "recordatorio_renovacion" | "pago_vencido" | "bloqueo",
  empresa: Pick<Empresa, "dueño_nombre">,
  licencia: Licencia
): string {
  const nombre = empresa.dueño_nombre;

  switch (tipo) {
    case "recordatorio_demo":
      return `Hola ${nombre}, tu período de prueba de Control de Ruta vence el ${formatoFechaLegible(
        licencia.fecha_expiracion_demo as string
      )}. Si querés seguir usando el sistema sin interrupciones, coordinemos el pago de tu licencia. Cualquier duda, escribime.`;

    case "demo_vencido":
      return `Hola ${nombre}, tu período de prueba de Control de Ruta ya venció. Tenés hasta el ${formatoFechaLegible(
        licencia.fecha_limite_pago as string
      )} para activar tu licencia y no perder el acceso ni los datos cargados. ¿Coordinamos el pago?`;

    case "recordatorio_renovacion":
      return `Hola ${nombre}, tu licencia de Control de Ruta vence el ${formatoFechaLegible(
        licencia.fecha_proximo_vencimiento as string
      )}. Recordá renovar para no perder el acceso al sistema.`;

    case "pago_vencido":
      return `Hola ${nombre}, tu licencia de Control de Ruta venció el ${formatoFechaLegible(
        licencia.fecha_proximo_vencimiento as string
      )}. Tenés unos días de margen antes de que se bloquee el acceso. Avisame para renovar.`;

    case "bloqueo":
      return `Hola ${nombre}, tu acceso a Control de Ruta fue bloqueado por falta de pago de la licencia. Tus datos siguen guardados, no se pierden. Escribime cuando quieras reactivarlo.`;
  }
}

// ---------- Link de WhatsApp (wa.me) ----------
export function construirLinkWhatsApp(telefono: string, mensaje: string): string {
  const soloDigitos = telefono.replace(/\D/g, "");
  return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(mensaje)}`;
}
