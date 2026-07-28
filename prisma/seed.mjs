import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_SEED !== "true") {
  throw new Error("Seed bloqueado en producción. Usa ALLOW_TEST_SEED=true solo de forma intencional.");
}

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_DEFAULT_PASSWORD;
if (!databaseUrl || !supabaseUrl || !serviceKey || !password || password.length < 12) {
  throw new Error("Configura DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SEED_DEFAULT_PASSWORD.");
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const institutionId = "00000000-0000-4000-8000-000000000001";

const people = [
  ["admin", "Administradora Institucional", "INSTITUTION_ADMIN"],
  ["coordinador", "Coordinador Académico", "COORDINATOR"],
  ["profesor1", "Profesora Uno", "TEACHER"],
  ["profesor2", "Profesor Dos", "TEACHER"],
  ["profesor3", "Profesora Tres", "TEACHER"],
];

async function authUser(username, fullName) {
  const email = `${username}@users.gymplan.app`;
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = listed.data.users.find((user) => user.email === email);
  if (existing) return existing.id;
  const created = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { username, full_name: fullName },
  });
  if (created.error || !created.data.user) throw created.error || new Error(`No se creó ${username}`);
  return created.data.user.id;
}

try {
  await prisma.institution.upsert({
    where: { id: institutionId },
    update: {},
    create: { id: institutionId, name: "Colegio San José", slug: "colegio-san-jose", settings: { aiDailyLimit: 200 } },
  });
  await prisma.campus.upsert({
    where: { institutionId_name: { institutionId, name: "Sede principal" } },
    update: {},
    create: { id: "00000000-0000-4000-8000-000000000002", institutionId, name: "Sede principal", code: "PRINCIPAL" },
  });

  const users = new Map();
  for (const [username, fullName, role] of people) {
    const profileId = await authUser(username, fullName);
    users.set(username, profileId);
    await prisma.institutionMembership.upsert({
      where: { institutionId_profileId: { institutionId, profileId } },
      update: { role, status: "ACTIVE" },
      create: { institutionId, profileId, role, status: "ACTIVE" },
    });
  }

  const science = await prisma.academicArea.upsert({
    where: { institutionId_name: { institutionId, name: "Ciencias Naturales" } },
    update: {}, create: { institutionId, name: "Ciencias Naturales", code: "CN" },
  });
  const humanities = await prisma.academicArea.upsert({
    where: { institutionId_name: { institutionId, name: "Humanidades" } },
    update: {}, create: { institutionId, name: "Humanidades", code: "HUM" },
  });
  for (const [areaId, name, code] of [[science.id, "Biología", "BIO"], [science.id, "Física", "FIS"], [humanities.id, "Lengua Castellana", "LC"]]) {
    await prisma.academicSubject.upsert({
      where: { institutionId_name: { institutionId, name } },
      update: {}, create: { institutionId, areaId, name, code },
    });
  }
  for (const [name, level] of [["6", 6], ["7", 7], ["8", 8], ["9", 9]]) {
    await prisma.academicGrade.upsert({
      where: { institutionId_name: { institutionId, name } },
      update: {}, create: { institutionId, name, level },
    });
  }

  const year = await prisma.academicYear.upsert({
    where: { institutionId_name: { institutionId, name: "2026" } },
    update: {},
    create: { institutionId, name: "2026", startDate: new Date("2026-01-19T12:00:00Z"), endDate: new Date("2026-11-27T12:00:00Z") },
  });
  await prisma.academicPeriod.upsert({
    where: { academicYearId_sequence: { academicYearId: year.id, sequence: 1 } },
    update: {},
    create: { academicYearId: year.id, name: "Primer trimestre", sequence: 1, startDate: new Date("2026-01-19T12:00:00Z"), endDate: new Date("2026-04-17T12:00:00Z") },
  });
  await prisma.institutionalTemplate.upsert({
    where: { id: "seed-template-mgf-03-r05" },
    update: {},
    create: {
      id: "seed-template-mgf-03-r05", institutionId, schoolName: "Colegio San José",
      formatCode: "MGF-03-R05", version: "01", published: true,
      configuration: { requiredFields: ["unitTitle", "learningObjective", "sessions"] },
    },
  });

  const planSeeds = [
    ["seed-plan-draft", "Ecosistemas y biodiversidad", "DRAFT", "profesor1"],
    ["seed-plan-shared", "Movimiento y fuerzas", "IN_PROGRESS", "profesor2"],
    ["seed-plan-changes", "Narrativas latinoamericanas", "CHANGES_REQUESTED", "profesor3"],
    ["seed-plan-approved", "Materia y energía", "APPROVED", "profesor1"],
  ];
  for (const [id, unitTitle, status, username] of planSeeds) {
    await prisma.classPlan.upsert({
      where: { id },
      update: {},
      create: {
        id, institutionId, authorId: users.get(username), area: status === "CHANGES_REQUESTED" ? "Humanidades" : "Ciencias Naturales",
        subject: status === "CHANGES_REQUESTED" ? "Lengua Castellana" : "Biología", grade: "7", unitTitle, status,
        learningObjective: `Analizar los conceptos fundamentales de ${unitTitle}.`,
        performanceTask: "Producto auténtico con criterios definidos.",
        sessions: { create: [
          { sessionNumber: 1, learningResults: "Identifica conceptos previos.", startActivity: "Exploración de saberes.", developmentActivity: "Trabajo guiado.", closingActivity: "Ticket de salida.", resources: "Guía y tablero" },
          { sessionNumber: 2, learningResults: "Aplica los conceptos.", startActivity: "Recapitulación.", developmentActivity: "Reto colaborativo.", closingActivity: "Reflexión.", resources: "Material de aula" },
        ] },
      },
    });
  }
  await prisma.planCollaborator.upsert({
    where: { planId_profileId: { planId: "seed-plan-shared", profileId: users.get("profesor1") } },
    update: {}, create: { planId: "seed-plan-shared", profileId: users.get("profesor1"), role: "EDITOR" },
  });
  await prisma.rubric.upsert({
    where: { id: "seed-rubric" },
    update: {},
    create: {
      id: "seed-rubric", institutionId, name: "Rúbrica de desempeño",
      structure: { levels: ["Inicial", "En proceso", "Logrado"], criteria: [{ name: "Comprensión conceptual", weight: 100 }] },
    },
  });
  console.log("Seed de desarrollo completado.");
} finally {
  await prisma.$disconnect();
  await pool.end();
}
