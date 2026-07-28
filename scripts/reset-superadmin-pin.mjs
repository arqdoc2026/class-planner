import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const pin = process.env.SUPERADMIN_PIN || "";
if (!/^\d{6}$/.test(pin)) {
  console.error("SUPERADMIN_PIN debe contener exactamente 6 dígitos.");
  process.exit(1);
}

const databaseUrl = process.env.DIRECT_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!databaseUrl || !supabaseUrl || !serviceKey) {
  console.error("Faltan DIRECT_URL, SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
try {
  const result = await pool.query(`
    SELECT "id", "username"
    FROM public.profiles
    WHERE "isSuperAdmin" = TRUE AND "active" = TRUE
    ORDER BY "createdAt" ASC
    LIMIT 1
  `);
  const profile = result.rows[0];
  if (!profile) throw new Error("No existe un superadministrador activo.");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.admin.updateUserById(profile.id, { password: pin });
  if (error) throw error;

  const normalizedUsername = String(profile.username).toLowerCase();
  await pool.query(`
    UPDATE public.profiles
    SET "username" = $1, "updatedAt" = NOW()
    WHERE "id" = $2
  `, [normalizedUsername, profile.id]);

  console.log(`PIN actualizado correctamente para el usuario: ${normalizedUsername}`);
} catch (error) {
  console.error("No se pudo actualizar el PIN:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
