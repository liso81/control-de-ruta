export interface Camion {
  id: string;
  nombre: string;
  capacidad_litros: number;
  litros_actual: number;
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
}

export type TipoMovimiento = "compra_agua" | "compra_gasoleo" | "venta" | "gasto";

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
  created_at: string;
}
