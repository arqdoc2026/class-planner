import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 1. Prisma 7 requiere un Pool de conexiones nativo
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// 2. Creamos el adaptador oficial para Postgres
const adapter = new PrismaPg(pool)

// 3. Inicializamos el cliente pasándole únicamente el adaptador
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma