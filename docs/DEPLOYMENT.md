# Despliegue en Vercel

## Variables

Configura en Development, Preview y Production:

- `DATABASE_URL`: pool transaccional PostgreSQL, normalmente puerto 6543.
- `DIRECT_URL`: conexión de sesión, puerto 5432, usada por migraciones.
- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `GEMINI_API_KEY`.

No configures `SEED_DEFAULT_PASSWORD` ni `ALLOW_TEST_SEED` en producción normal.

## Recuperación del superadministrador

Si el correo interno no tiene buzón, restablece el PIN desde una terminal local
con las variables de servidor cargadas. El valor debe suministrarse mediante
`SUPERADMIN_PIN` y nunca guardarse en `.env`, Git o Vercel:

```bash
read -s "SUPERADMIN_PIN?Nuevo PIN (6 dígitos): "
export SUPERADMIN_PIN
npm run admin:reset-pin
unset SUPERADMIN_PIN
```

## Secuencia

1. Fusiona mediante pull request con `npm run check` y `npm run build`.
2. Crea un deployment Preview.
3. Aplica `npm run db:deploy` desde un entorno controlado, no desde una función
   serverless.
4. Despliega la versión guardada en Vercel.
5. Ejecuta pruebas de humo con un usuario por rol.

## Verificación de producción

- Login y renovación de sesión.
- Aislamiento entre instituciones.
- Invitación y asignación de rol.
- Creación desde formato publicado.
- Guardado automático y conflicto de versión.
- Comentario, envío, devolución y aprobación.
- Descarga privada de rúbrica.
- Sugerencia de IA sin sobrescritura automática.
- Vista de impresión, PDF del navegador y Word.
- Notificaciones y restauración desde papelera.

En CI instala Chromium una vez con `npx playwright install --with-deps chromium`
y ejecuta `npm run test:e2e`. Las pruebas autenticadas de roles requieren una
base aislada inicializada con `npm run db:seed`; nunca deben apuntar a producción.

Supabase Storage conserva los adjuntos fuera del sistema efímero de Vercel.

## Storage privado

Crea en Supabase los buckets privados `plan-rubrics` y `plan-attachments`. No los
marques como públicos: las descargas pasan por rutas autenticadas que generan URL
firmadas de diez minutos. Los límites actuales son 10 MB por rúbrica y 20 MB por
adjunto; admite PDF, documentos Office e imágenes declarados por el servidor.
