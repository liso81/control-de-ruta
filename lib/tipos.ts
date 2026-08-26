export interface Camion {
  id: string;
  nombre: string;
  capacidad_litros: number;
  litros_actual: number;
  matricula: string | null;
  marca: string | null;
  km_por_litro: number | null;
  km_base: number | null;
  precio_gasoleo_litro: number | null;
}

export interface Turno {
  id: string;
  camion_id: string;
  fecha: string;
  chofer_nombre: string;
  saldo_inicial: number;
  fondo_dueno: number;
  estado: "abierto" | "cerrado";
  efectivo_entregado: number | null;
  remanente: number | null;
  desglose_efectivo: Record<string, number> | null;
}

export type TipoMovimiento = "compra_agua" | "compra_gasoleo" | "venta" | "gasto" | "alerta_sobrante";

export interface Movimiento {
  id: string;
  turno_id: string;
  tipo: TipoMovimiento;
  litros: number | null;
  precio_litro: number | null;
  monto: number | null;
  efectivo: number;
  transferencia: number;
  credito: number;
  categoria: string | null;
  cliente_nota: string | null;
  cliente_telefono: string | null;
  created_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  unidad: string | null;
  precio_unitario: number;
  stock_actual: number;
  created_at: string;
}

export interface IntervaloMantenimiento {
  id: string;
  camion_id: string;
  tipo: string;
  intervalo_km: number;
}

export interface MantenimientoProducto {
  id: string;
  mantenimiento_id: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario_momento: number;
  subtotal: number;
}

export interface Mantenimiento {
  id: string;
  camion_id: string;
  tipo: string;
  fecha: string;
  km: number | null;
  costo_total: number | null;
  proveedor_tercero: string | null;
  costo_servicio_tercero: number | null;
  descripcion_servicio_tercero: string | null;
  notas: string | null;
  created_at: string;
  productos?: MantenimientoProducto[];
}

export interface AlertaMantenimiento {
  tipo: string;
  intervalo_km: number;
  km_ultimo_mantenimiento: number | null;
  km_proximo: number;
  km_faltantes: number;
  estado: "ok" | "proximo" | "vencido";
}

export type TipoDocumento = "seguro" | "inspeccion_tecnica" | "carta_alquiler";

export interface DocumentoVehiculo {
  id: string;
  camion_id: string;
  tipo: TipoDocumento;
  fecha_emision: string | null;
  fecha_caducidad: string;
  created_at: string;
}

export interface AlertaDocumento {
  camion_id: string;
  camion_nombre: string;
  camion_matricula: string | null;
  tipo: TipoDocumento;
  fecha_caducidad: string;
  dias_restantes: number;
  estado: "ok" | "proximo" | "vencido";
}

export interface AlertaMantenimientoReporte extends AlertaMantenimiento {
  camion_id: string;
  camion_nombre: string;
  camion_matricula: string | null;
}

export interface CuentaPorCobrar {
  id: string;
  movimiento_id: string | null;
  camion_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  monto: number;
  fecha_venta: string;
  fecha_cobro: string | null;
  estado: "pendiente" | "cobrado";
  camion?: { nombre: string; matricula: string | null } | null;
}

export interface AlertaCuentaPorCobrar {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  monto: number;
  fecha_venta: string;
  dias_antiguedad: number;
  camion_nombre: string | null;
  camion_matricula: string | null;
  estado: "proximo" | "vencido";
}

export interface DatosProvisionFondos {
  diasTrabajoMes?: string;
  posiblesViajes?: string;
  promedioKm?: string;
  valorVehiculo?: string;
  vidaUtilVehiculo?: string;
  valorNeumaticos?: string;
  vidaUtilNeumaticos?: string;
  valorBaterias?: string;
  vidaUtilBaterias?: string;
  valorInspeccion?: string;
  vidaUtilInspeccion?: string;
  valorSeguro?: string;
  vidaUtilSeguro?: string;
  valorCartaAlquiler?: string;
  vidaUtilCartaAlquiler?: string;
  valorAceite?: string;
  capacidadEnvase?: string;
  capacidadMotor?: string;
  kmCambioAceite?: string;
  valorFiltro?: string;
  valorOtroMaterial?: string;
  valorChapisteria?: string;
  valorPintura?: string;
  valorArreglosMotor?: string;
  valorOtrasRoturas?: string;
}

export const SUBMAYORES_PROVISION = [
  "vehiculo",
  "neumaticos",
  "baterias",
  "inspeccion",
  "seguro",
  "carta_alquiler",
  "aceite",
  "filtros",
  "otros_materiales",
  "chapisteria",
  "pintura",
  "arreglos_motor",
  "otras_roturas",
] as const;

export type Submayor = (typeof SUBMAYORES_PROVISION)[number];

export interface MayorProvisionEntry {
  id: string;
  camion_id: string;
  submayor: Submayor;
  fecha: string;
  tipo: "credito" | "debito";
  monto: number;
  descripcion: string | null;
  created_at: string;
}

export interface SaldoSubmayor {
  submayor: Submayor;
  saldo: number;
}

export type TipoFinanzasMovimiento =
  | "capital_inyectado"
  | "gasto_insumo"
  | "gasto_servicio_tercero"
  | "gasto_otro"
  | "fondo_extraido";

export interface FinanzasMovimiento {
  id: string;
  tipo: TipoFinanzasMovimiento;
  camion_id: string | null;
  producto_id: string | null;
  cantidad: number | null;
  monto: number;
  proveedor: string | null;
  descripcion: string | null;
  fecha: string;
  mantenimiento_id: string | null;
  created_at: string;
}

export interface PasoFlujoCaja {
  capitalInyectado: number;
  ingresosEfectivoTransferencia: number;
  ingresosCuentasCobradas: number;
  ingresosTotal: number;
  gastosInsumos: number;
  gastosServiciosTerceros: number;
  gastosOtros: number;
  gastosChofer: number;
  gastosTotal: number;
  utilidadBruta: number;
  provision: number;
  utilidadReal: number;
  efectivoAOperar: number;
  fondoExtraido: number;
  efectivoRealAOperar: number;
}

export interface ResumenFinanzas {
  diario: PasoFlujoCaja;
  acumulado: PasoFlujoCaja;
}

export interface ComparativoCamion {
  camion_id: string;
  camion_nombre: string;
  camion_matricula: string | null;
  ingresos: number;
  gastos: number;
  utilidad: number;
  litrosVendidos: number;
  utilidadPorLitro: number;
}

export interface PuntoTendencia {
  fecha: string;
  utilidadDia: number;
  utilidadAcumulada: number;
}

export interface ComposicionGastos {
  insumos: number;
  serviciosTerceros: number;
  otros: number;
  gastosChofer: number;
}

export interface GraficosFinanzas {
  comparativoPorCamion: ComparativoCamion[];
  tendencia: PuntoTendencia[];
  composicionGastos: ComposicionGastos;
}

export type MotivoParalizacion = "En taller" | "Sin chofer" | "Esperando repuesto" | "Sin actividad" | "Otro";

export interface Paralizacion {
  id: string;
  camion_id: string;
  motivo: MotivoParalizacion;
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  created_at: string;
}

export interface AlertaParalizacion {
  id: string;
  camion_id: string;
  camion_nombre: string;
  camion_matricula: string | null;
  motivo: MotivoParalizacion;
  fecha_inicio: string;
  diasParado: number;
  utilidadDiariaPromedio: number;
  costoEstimado: number;
}
