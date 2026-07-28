"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin, type InstitutionRole } from "../auth";
import { DEFAULT_FORMAT_CONFIGURATION } from "../institutional-format";
import { prisma } from "../prisma";

export async function getPlatformOverview() {
  await requireSuperAdmin();
  const [institutions, users, plans, aiRequests] = await Promise.all([
    prisma.institution.findMany({
      include: {
        memberships: {
          where: { deletedAt: null },
          include: { profile: { select: { id: true, fullName: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { memberships: true, plans: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.profile.count(),
    prisma.classPlan.count({ where: { deletedAt: null } }),
    prisma.aiRequest.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
  ]);
  return { institutions, metrics: { users, plans, aiRequests, institutions: institutions.length } };
}

export async function createInstitutionUser(input: {
  institutionId: string;
  fullName: string;
  username: string;
  temporaryPassword: string;
  role: InstitutionRole;
}) {
  const superAdmin = await requireSuperAdmin();
  const institutionId = input.institutionId.trim();
  const fullName = input.fullName.trim().slice(0, 200);
  const username = input.username.trim().toLowerCase();
  const temporaryPassword = input.temporaryPassword;
  const allowedRoles: InstitutionRole[] = ["INSTITUTION_ADMIN", "COORDINATOR", "TEACHER", "VIEWER"];
  if (!institutionId || fullName.length < 2 || !/^[a-z0-9._-]{3,30}$/.test(username)) {
    return { success: false, error: "Institución, nombre o usuario no válido." };
  }
  if (!allowedRoles.includes(input.role) || temporaryPassword.length < 12) {
    return { success: false, error: "Selecciona un rol y usa una contraseña temporal de al menos 12 caracteres." };
  }
  const [institution, existing] = await Promise.all([
    prisma.institution.findFirst({ where: { id: institutionId, active: true, deletedAt: null }, select: { id: true } }),
    prisma.profile.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (!institution) return { success: false, error: "La institución no existe o está suspendida." };
  if (existing) return { success: false, error: "Ese nombre de usuario ya existe." };

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { success: false, error: "Faltan las credenciales administrativas de Supabase." };
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.admin.createUser({
    email: `${username}@users.gymplan.app`,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
  });
  if (error || !data.user) {
    return { success: false, error: error?.message || "Supabase no pudo crear el usuario." };
  }

  try {
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: data.user.id },
        data: { fullName, username, active: true },
      }),
      prisma.institutionMembership.deleteMany({
        where: { profileId: data.user.id, institutionId: { not: institutionId } },
      }),
      prisma.institutionMembership.upsert({
        where: { institutionId_profileId: { institutionId, profileId: data.user.id } },
        update: { role: input.role, status: "ACTIVE", deletedAt: null },
        create: { institutionId, profileId: data.user.id, role: input.role, status: "ACTIVE" },
      }),
      prisma.activityLog.create({
        data: {
          institutionId,
          actorId: superAdmin.id,
          action: "USER_CREATED_BY_SUPERADMIN",
          entityType: "Profile",
          entityId: data.user.id,
          metadata: { username, role: input.role },
        },
      }),
    ]);
  } catch (membershipError) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    console.error("Error asignando usuario institucional:", membershipError);
    return { success: false, error: "No se pudo asignar el usuario a la institución." };
  }

  revalidatePath("/superadmin");
  return { success: true };
}

export async function createInstitution(formData: FormData) {
  const superAdmin = await requireSuperAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 200);
  const slug = String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 100);
  if (name.length < 2 || slug.length < 3) return { success: false, error: "Nombre o identificador no válido." };
  const institution = await prisma.institution.create({
    data: {
      name, slug, settings: { aiDailyLimit: 200 },
      campuses: { create: { name: "Sede principal", code: "PRINCIPAL" } },
      memberships: { create: { profileId: superAdmin.id, role: "INSTITUTION_ADMIN", status: "ACTIVE" } },
      templates: {
        create: {
          schoolName: name, formatName: "FORMATO DE PLANEACIÓN DE CLASES", formatCode: "MGF-03-R05",
          version: "01", configuration: DEFAULT_FORMAT_CONFIGURATION,
        },
      },
    },
  });
  revalidatePath("/superadmin");
  return { success: true, data: institution };
}

export async function setInstitutionActive(id: string, active: boolean) {
  await requireSuperAdmin();
  await prisma.institution.update({ where: { id }, data: { active } });
  revalidatePath("/superadmin");
  return { success: true };
}
