# GYMPLAN

Plataforma web para crear y administrar planeaciones académicas institucionales.
La aplicación conserva el editor original y añade arquitectura multiinstitución,
roles institucionales, editor estructurado, colaboración, revisión, historial,
asistencia de IA controlada y exportación.

## Tecnologías

- Next.js 16 con App Router y React 19.
- TypeScript estricto y Tailwind CSS 4.
- PostgreSQL y Supabase.
- Prisma 7 con el adaptador oficial para PostgreSQL.
- Supabase Auth y Storage.
- Google Gemini para asistencia pedagógica desde el servidor.

## Requisitos

- Node.js 22.
- npm 10 o posterior.
- Un proyecto de Supabase con PostgreSQL, Auth y Storage.
- Una clave de Google Gemini si se habilitarán las funciones de IA.

## Instalación local

1. Instala las dependencias:

   ```bash
   npm ci
   ```

2. Copia `.env.example` como `.env` y sustituye todos los valores de ejemplo.
   No confirmes `.env` ni credenciales reales en Git.

3. Genera el cliente de Prisma:

   ```bash
   npm run db:generate
   ```

4. Verifica el estado de las migraciones:

   ```bash
   npm run db:status
   ```

5. Inicia el servidor:

   ```bash
   npm run dev
   ```

La aplicación estará disponible en `http://localhost:3000`.

## Variables de entorno

| Variable | Exposición | Uso |
|---|---|---|
| `DATABASE_URL` | Servidor | Consultas de Prisma mediante el pool de PostgreSQL |
| `DIRECT_URL` | Servidor | Migraciones y conexión directa |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pública | Auth desde navegador y servidor SSR |
| `SUPABASE_URL` | Servidor | Operaciones administrativas de Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor | Carga privada de archivos y gestión del bucket |
| `GEMINI_API_KEY` | Servidor | Generación y asistencia pedagógica |

La clave `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY` nunca deben utilizarse
en componentes cliente ni llevar el prefijo `NEXT_PUBLIC_`.

## Comandos de calidad

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run check
npm run build
```

`npm run check` ejecuta tipos, lint y pruebas unitarias. El build se mantiene
como paso separado porque requiere las variables de entorno de la aplicación.

## Base de datos

El modelo está en `prisma/schema.prisma` y las migraciones SQL en
`prisma/migrations`.

Para producción se debe usar:

```bash
npm run db:deploy
```

No uses `prisma db push` en producción. La migración base reconstruida permite
instalaciones nuevas y conserva bases históricas creadas originalmente con
`db push`.

## Autenticación actual

Supabase Auth administra las sesiones. El acceso se realiza con un nombre de
usuario que internamente se transforma en una dirección de correo sintética.
Para el flujo actual, la confirmación obligatoria de correo debe estar
desactivada en Supabase.

El primer usuario puede completar el arranque inicial. Los registros siguientes
requieren una invitación institucional vigente, creada por un administrador.
Los roles institucionales son `INSTITUTION_ADMIN`, `COORDINATOR`, `TEACHER` y
`VIEWER`; la autorización se comprueba nuevamente en el servidor.

## Módulos principales

- `/overview`: panel adaptado al rol.
- `/plans`: búsqueda, filtros y paginación.
- `/plans/new`: creación desde el formato institucional vigente.
- `/plans/[id]/edit`: editor estructurado con guardado automático.
- `/plans/[id]/review`: colaboración, comentarios, versiones y aprobación.
- `/rubrics`: banco institucional de rúbricas.
- `/activities`: banco institucional de actividades.
- `/notifications`: notificaciones internas.
- `/trash`: restauración de planeaciones eliminadas lógicamente.
- `/admin/institution`: catálogos institucionales.
- `/admin/team`: miembros, roles e invitaciones.
- `/config/template/fields`: campos, instrucciones y obligatoriedad del formato.
- `/superadmin`: instituciones, suspensión y métricas globales.

## Despliegue en Vercel

1. Conecta el repositorio de GitHub al proyecto de Vercel.
2. Configura todas las variables de `.env.example` por separado para Preview y
   Production.
3. Verifica que `DIRECT_URL` sea una conexión de sesión por puerto 5432. Ejecuta
   las migraciones con `npm run db:deploy` en un paso controlado antes
   de dirigir tráfico a una versión que dependa de ellas.
4. Usa `npm run build` como comando de compilación.
5. Comprueba autenticación, acceso a PostgreSQL, carga de rúbricas y una llamada
   de IA en el entorno desplegado.

Las rúbricas y los adjuntos se guardan en buckets privados de Supabase Storage;
no dependen del sistema de archivos efímero de Vercel.

## Flujo de ramas recomendado

- `main`: producción.
- Ramas cortas `feature/<descripcion>` o `fix/<descripcion>`.
- Pull request con `npm run check` y `npm run build` exitosos.
- Migraciones compatibles hacia adelante y revisadas antes de fusionar.

Los cambios de esquema, seguridad, interfaz e IA deben mantenerse en commits
pequeños y descriptivos.

## Datos de desarrollo

El seed crea una institución, sede, administrador, coordinador, tres profesores,
catálogos, formato MGF-03-R05, cuatro planeaciones, sesiones, colaborador y
rúbrica. Requiere una clave `service_role` y una contraseña temporal segura:

```bash
npm run db:seed
```

El script se bloquea en producción salvo que se configure intencionalmente
`ALLOW_TEST_SEED=true`. No actives esa variable en el entorno normal de
producción.

Consulta [MIGRATIONS.md](docs/MIGRATIONS.md) y
[DEPLOYMENT.md](docs/DEPLOYMENT.md) antes del primer despliegue del esquema
multiinstitución.
