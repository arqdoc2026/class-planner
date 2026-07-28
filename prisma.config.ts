// Ruta: prisma.config.ts
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // URL principal para consultas de la aplicación (Transaction Mode).
    url: process.env.DATABASE_URL,
    // Solo se usa como shadow database durante operaciones de desarrollo.
    // Los comandos de despliegue usan prisma.migrate.config.ts y DIRECT_URL.
    shadowDatabaseUrl: process.env.DIRECT_URL,
  },
});
