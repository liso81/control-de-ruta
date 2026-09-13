This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Mi Banco — finanzas personales

Ademas del sistema de control de flota, este proyecto incluye un modulo
independiente en `/mi-banco` para gestionar tus finanzas personales bajo el
concepto de "se tu propio banco": cuentas y sobres virtuales, ingresos y
gastos categorizados, presupuestos mensuales, metas de ahorro, y carga de
facturas por foto a traves de un bot de Telegram con lectura automatica
(IA) del monto, comercio y fecha.

Vive aislado del resto de la app: tiene su propio login (`/mi-banco`), sus
propias tablas en Supabase (prefijo `mb_`) y su propio bot de Telegram, asi
que no interfiere con el sistema de empresas/choferes.

### 1. Base de datos (Supabase)

Corre el contenido de [`sql/mi-banco-schema.sql`](sql/mi-banco-schema.sql)
en el SQL Editor de tu proyecto de Supabase (el mismo que ya usa
`control-de-ruta`, no hace falta uno nuevo).

### 2. Variables de entorno

Agrega estas variables en `.env.local` (para desarrollo) y en Vercel
(Project Settings → Environment Variables) para produccion. Las de
Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`) ya deberian
estar configuradas por el resto de la app.

```
MB_JWT_SECRET=una-clave-larga-y-aleatoria
MB_TELEGRAM_BOT_TOKEN=el-token-que-te-da-BotFather
MB_TELEGRAM_WEBHOOK_SECRET=otra-clave-aleatoria
MB_TELEGRAM_LINK_CODE=un-codigo-secreto-que-vos-elijas
MB_GEMINI_API_KEY=tu-api-key-de-Gemini   # opcional, si no la seteas usa GEMINI_API_KEY
APP_BASE_URL=https://tu-app.vercel.app
```

### 3. Crear tu usuario de acceso

Con las variables de Supabase ya en `.env.local`, corre (en Termux o donde
tengas el repo clonado):

```bash
npm install
node scripts/mi-banco-crear-usuario.mjs tu_usuario tu_contraseña
```

Repetir el comando con el mismo usuario actualiza la contraseña.

### 4. Bot de Telegram

1. Hablale a [@BotFather](https://t.me/BotFather) en Telegram, creá un bot
   nuevo (`/newbot`) y copiá el token en `MB_TELEGRAM_BOT_TOKEN`.
2. Deployá la app en Vercel con todas las variables de entorno cargadas.
3. Registrá el webhook del bot contra tu URL de Vercel:

   ```bash
   node scripts/mi-banco-set-webhook.mjs
   ```

4. Abrí un chat con tu bot y mandale como primer mensaje el valor exacto
   de `MB_TELEGRAM_LINK_CODE` para autorizar ese chat. A partir de ahi,
   mandale la foto de cualquier factura o ticket: el bot la lee con IA y
   te pregunta de que cuenta/sobre y categoria sale antes de guardarla.
   También podés escribirle `/saldo` para ver el balance de tus cuentas.

### 5. Usar la app

Entrá a `https://tu-app.vercel.app/mi-banco`, iniciá sesion con el usuario
que creaste, y desde ahi podés:

- Crear **cuentas** (dinero real: banco, efectivo) y **sobres virtuales**
  (bolsas internas de presupuesto, ej. "Vacaciones", "Fondo de emergencia").
- Transferir dinero entre cuentas y sobres.
- Cargar ingresos y gastos manuales, con categoria, comercio y fecha.
- Definir un **presupuesto mensual** por categoria de gasto y ver el
  progreso del mes.
- Crear **metas de ahorro**, ligadas a una cuenta/sobre (el progreso se
  calcula solo) o manuales.
- Ver el **resumen**: balance total, gasto por categoria y evolucion de
  ingresos vs gastos de los ultimos 6 meses.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
