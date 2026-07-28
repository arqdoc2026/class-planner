# Migraciones

## Estado detectado

La base conectada contiene el esquema histórico del MVP, pero no registra las
migraciones en `_prisma_migrations`. Prisma reporta seis migraciones pendientes.

La migración `20260717000000_initial_baseline` reconstruye la línea base con
`CREATE TABLE IF NOT EXISTS`; las migraciones posteriores agregan las columnas
históricas, la fundación multiinstitución, vínculos con catálogos y políticas
RLS adicionales.

## Procedimiento recomendado

1. Crea un backup verificable de PostgreSQL desde Supabase.
2. Crea una rama de base de datos o proyecto de staging restaurado desde ese
   backup.
3. Configura `DIRECT_URL` con la conexión de sesión por puerto 5432. No uses el
   pool transaccional 6543 para migraciones.
4. Ejecuta:

   ```bash
   npm ci
   npm run db:status
   npm run db:deploy
   npm run db:status
   ```

5. Comprueba que todos los perfiles tengan una fila en
   `InstitutionMembership`, que todas las planeaciones tengan `institutionId` y
   que la institución inicial tenga slug `colegio-san-jose`.
6. Ejecuta `npm run check` y `npm run build`.
7. Valida login, creación, autosave, revisión, aprobación, PDF, Word y Storage.
8. Repite el mismo procedimiento sobre producción durante una ventana
   controlada.

No ejecutes `prisma db push` ni `prisma migrate reset` sobre staging restaurado
o producción.

## Rollback

La migración multi-tenant es aditiva. Ante un fallo:

1. Detén el despliegue de la versión nueva.
2. Mantén o restaura la versión anterior de Vercel.
3. Restaura el backup si la migración no terminó limpiamente.

No elimines manualmente tablas nuevas mientras exista código que pueda estar
utilizándolas.
