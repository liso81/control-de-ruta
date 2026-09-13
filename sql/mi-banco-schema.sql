-- Esquema de Supabase para el modulo "Mi Banco" (finanzas personales).
-- Todas las tablas usan el prefijo mb_ para no chocar con las tablas
-- del sistema de control de flota que ya vive en este mismo proyecto.
--
-- Ejecutar este archivo completo en el SQL Editor de Supabase
-- (Project -> SQL Editor -> New query -> pegar y correr).

create extension if not exists "pgcrypto";

-- Usuario que puede entrar a la app (uso personal: normalmente un solo registro).
create table if not exists mb_usuarios (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Cuentas y "sobres" virtuales (el concepto de "se tu propio banco").
-- tipo = 'cuenta'  -> representa dinero real (banco, efectivo, billetera virtual).
-- tipo = 'sobre'   -> una bolsa virtual para organizar el presupuesto (ej. "Vacaciones").
create table if not exists mb_cuentas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('cuenta', 'sobre')),
  icono text default '💰',
  color text default '#4f46e5',
  saldo_inicial numeric not null default 0,
  orden int not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists mb_categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  icono text default '🏷️',
  color text default '#6b7280',
  orden int not null default 0,
  created_at timestamptz not null default now()
);

-- Movimientos: el monto se guarda con signo (positivo = entra dinero,
-- negativo = sale dinero) para que el saldo de una cuenta sea siempre
-- saldo_inicial + suma(monto) de sus movimientos.
create table if not exists mb_movimientos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references mb_cuentas(id) on delete cascade,
  categoria_id uuid references mb_categorias(id) on delete set null,
  tipo text not null check (tipo in ('ingreso', 'gasto', 'transferencia')),
  monto numeric not null,
  descripcion text,
  comercio text,
  fecha date not null default current_date,
  origen text not null default 'manual' check (origen in ('manual', 'telegram')),
  transferencia_grupo_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists mb_movimientos_cuenta_idx on mb_movimientos(cuenta_id);
create index if not exists mb_movimientos_categoria_idx on mb_movimientos(categoria_id);
create index if not exists mb_movimientos_fecha_idx on mb_movimientos(fecha);

-- Presupuesto mensual recurrente por categoria de gasto.
create table if not exists mb_presupuestos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null unique references mb_categorias(id) on delete cascade,
  monto_mensual numeric not null,
  created_at timestamptz not null default now()
);

-- Metas de ahorro, opcionalmente ligadas a una cuenta/sobre.
create table if not exists mb_metas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  monto_objetivo numeric not null,
  cuenta_id uuid references mb_cuentas(id) on delete set null,
  monto_actual_manual numeric not null default 0,
  fecha_objetivo date,
  icono text default '🎯',
  color text default '#0ea5e9',
  completada boolean not null default false,
  created_at timestamptz not null default now()
);

-- Chats de Telegram autorizados a mandar facturas (uso personal: solo el dueño).
create table if not exists mb_telegram_vinculo (
  chat_id bigint primary key,
  autorizado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Facturas leidas por IA que esperan que el dueño confirme cuenta/categoria.
create table if not exists mb_telegram_pendientes (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null,
  monto numeric not null,
  descripcion text,
  comercio text,
  fecha date,
  cuenta_id_elegida uuid references mb_cuentas(id) on delete set null,
  categoria_id uuid references mb_categorias(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Deduplicacion de updates de Telegram (igual que en el sistema de flota).
create table if not exists mb_telegram_updates (
  update_id bigint primary key,
  created_at timestamptz not null default now()
);

-- Categorias sugeridas para arrancar. Descomentar y correr si queres cargarlas.
-- insert into mb_categorias (nombre, tipo, icono, orden) values
--   ('Sueldo', 'ingreso', '💼', 1),
--   ('Otros ingresos', 'ingreso', '➕', 2),
--   ('Supermercado', 'gasto', '🛒', 10),
--   ('Transporte', 'gasto', '🚌', 11),
--   ('Vivienda', 'gasto', '🏠', 12),
--   ('Servicios', 'gasto', '💡', 13),
--   ('Salud', 'gasto', '⚕️', 14),
--   ('Ocio', 'gasto', '🎉', 15),
--   ('Otros gastos', 'gasto', '🧾', 16);
