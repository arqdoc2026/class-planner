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
      include: { _count: { select: { memberships: true, plans: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.profile.count(),
    prisma.classPlan.count({ where: { deletedAt: null } }),
    prisma.aiRequest.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
  ]);
  return { institutions, metrics: { users, plans, aiRequests, institutions: institutions.length } };
}

export async function getPlatformInstitution(institutionId: string) {
  await requireSuperAdmin();
  const [institution, removedMemberships] = await Promise.all([
    prisma.institution.findFirst({
      where: { id: institutionId, deletedAt: null },
      include: {
        campuses: { orderBy: { name: "asc" } },
        areas: { include: { subjects: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } },
        grades: { include: { groups: { orderBy: { name: "asc" } } }, orderBy: [{ level: "asc" }, { name: "asc" }] },
        years: { include: { periods: { orderBy: { sequence: "asc" } } }, orderBy: { startDate: "desc" } },
        memberships: {
          where: { deletedAt: null },
          include: { profile: { select: { id: true, fullName: true, username: true, email: true, isSuperAdmin: true } } },
          orderBy: [{ role: "asc" }, { profile: { fullName: "asc" } }],
        },
        _count: { select: { memberships: true, plans: true, campuses: true } },
      },
    }),
    prisma.institutionMembership.findMany({
      where: { institutionId, deletedAt: { not: null } },
      include: { profile: { select: { id: true, fullName: true, username: true, isSuperAdmin: true } } },
      orderBy: { deletedAt: "desc" },
    }),
  ]);
  return institution ? { ...institution, removedMemberships } : null;
}

type PlatformCatalogKind = "campus" | "area" | "subject" | "grade" | "group" | "year" | "period";

export async function createPlatformCatalogEntry(input: {
  institutionId: string;
  kind: PlatformCatalogKind;
  values: Record<string, string>;
}) {
  const superAdmin = await requireSuperAdmin();
  const institution = await prisma.institution.findFirst({
    where: { id: input.institutionId, deletedAt: null },
    select: { id: true, active: true },
  });
  if (!institution) return { success: false, error: "La institución no existe." };
  if (!institution.active) return { success: false, error: "Activa la institución antes de configurar sus catálogos." };
  const text = (key: string, max = 200) => String(input.values[key] || "").trim().slice(0, max);
  const name = text("name");
  if (name.length < 1) return { success: false, error: "Escribe un nombre válido." };

  try {
    let entityId = "";
    if (input.kind === "campus") {
      entityId = (await prisma.campus.create({ data: { institutionId: institution.id, name, code: text("code", 50) || null } })).id;
    } else if (input.kind === "area") {
      entityId = (await prisma.academicArea.create({ data: { institutionId: institution.id, name, code: text("code", 50) || null } })).id;
    } else if (input.kind === "subject") {
      const area = await prisma.academicArea.findFirst({ where: { id: text("parentId", 100), institutionId: institution.id, active: true }, select: { id: true } });
      if (!area) return { success: false, error: "Selecciona un área válida." };
      entityId = (await prisma.academicSubject.create({ data: { institutionId: institution.id, areaId: area.id, name, code: text("code", 50) || null } })).id;
    } else if (input.kind === "grade") {
      const level = Number(input.values.level);
      entityId = (await prisma.academicGrade.create({ data: { institutionId: institution.id, name, level: Number.isInteger(level) ? level : null } })).id;
    } else if (input.kind === "group") {
      const grade = await prisma.academicGrade.findFirst({ where: { id: text("parentId", 100), institutionId: institution.id, active: true }, select: { id: true } });
      if (!grade) return { success: false, error: "Selecciona un grado válido." };
      entityId = (await prisma.courseGroup.create({ data: { institutionId: institution.id, gradeId: grade.id, name } })).id;
    } else if (input.kind === "year") {
      const startDate = new Date(text("startDate", 20));
      const endDate = new Date(text("endDate", 20));
      if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate >= endDate) {
        return { success: false, error: "Las fechas del año lectivo no son válidas." };
      }
      entityId = (await prisma.academicYear.create({ data: { institutionId: institution.id, name, startDate, endDate } })).id;
    } else {
      const year = await prisma.academicYear.findFirst({ where: { id: text("parentId", 100), institutionId: institution.id, active: true }, select: { id: true } });
      const startDate = new Date(text("startDate", 20));
      const endDate = new Date(text("endDate", 20));
      const sequence = Number(input.values.sequence);
      if (!year || !Number.isInteger(sequence) || sequence < 1 || Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate >= endDate) {
        return { success: false, error: "El año, orden o las fechas del periodo no son válidos." };
      }
      const periodType = ["TRIMESTER", "SEMESTER", "PERIOD"].includes(input.values.periodType) ? input.values.periodType : "PERIOD";
      entityId = (await prisma.academicPeriod.create({ data: { academicYearId: year.id, name, sequence, startDate, endDate, periodType } })).id;
    }
    await prisma.activityLog.create({
      data: {
        institutionId: institution.id,
        actorId: superAdmin.id,
        action: "CATALOG_ENTRY_CREATED_BY_SUPERADMIN",
        entityType: input.kind,
        entityId,
        metadata: { name },
      },
    });
    revalidatePath(`/superadmin/institutions/${institution.id}`);
    revalidatePath("/plans/new");
    return { success: true };
  } catch (error) {
    console.error("Error creando catálogo desde superadministración:", error);
    return { success: false, error: "No se pudo crear el registro. Comprueba que no esté duplicado." };
  }
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
  if (!allowedRoles.includes(input.role) || !/^\d{6}$/.test(temporaryPassword)) {
    return { success: false, error: "Selecciona un rol y usa un PIN temporal de exactamente 6 dígitos." };
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

export async function updateInstitutionUser(input: {
  institutionId: string;
  profileId: string;
  fullName: string;
  username: string;
  role: InstitutionRole;
  active: boolean;
  newPassword?: string;
}) {
  const superAdmin = await requireSuperAdmin();
  const fullName = input.fullName.trim().slice(0, 200);
  const username = input.username.trim().toLowerCase();
  const newPassword = String(input.newPassword || "");
  const allowedRoles: InstitutionRole[] = ["INSTITUTION_ADMIN", "COORDINATOR", "TEACHER", "VIEWER"];
  if (fullName.length < 2 || !/^[a-z0-9._-]{3,30}$/.test(username) || !allowedRoles.includes(input.role)) {
    return { success: false, error: "Nombre, usuario o rol no válido." };
  }
  if (newPassword && !/^\d{6}$/.test(newPassword)) {
    return { success: false, error: "El nuevo PIN debe contener exactamente 6 dígitos." };
  }
  const membership = await prisma.institutionMembership.findFirst({
    where: { institutionId: input.institutionId, profileId: input.profileId, deletedAt: null },
    include: { profile: { select: { username: true, fullName: true, email: true, isSuperAdmin: true } } },
  });
  if (!membership) return { success: false, error: "El miembro no pertenece a esa institución." };
  if (membership.profile.isSuperAdmin && membership.profileId !== superAdmin.id) {
    return { success: false, error: "No puedes modificar otro superadministrador desde esta sección." };
  }
  const duplicate = await prisma.profile.findFirst({
    where: { username, id: { not: input.profileId } },
    select: { id: true },
  });
  if (duplicate) return { success: false, error: "Ese nombre de usuario ya está en uso." };

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { success: false, error: "Faltan las credenciales administrativas de Supabase." };
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `${username}@users.gymplan.app`;
  const authUpdate = await supabase.auth.admin.updateUserById(input.profileId, {
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
    ...(newPassword ? { password: newPassword } : {}),
  });
  if (authUpdate.error) return { success: false, error: authUpdate.error.message };

  try {
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: input.profileId },
        data: { fullName, username, email },
      }),
      prisma.institutionMembership.update({
        where: { institutionId_profileId: { institutionId: input.institutionId, profileId: input.profileId } },
        data: { role: input.role, status: input.active ? "ACTIVE" : "SUSPENDED" },
      }),
      prisma.activityLog.create({
        data: {
          institutionId: input.institutionId,
          actorId: superAdmin.id,
          action: "USER_UPDATED_BY_SUPERADMIN",
          entityType: "Profile",
          entityId: input.profileId,
          metadata: { username, role: input.role, active: input.active, passwordReset: Boolean(newPassword) },
        },
      }),
    ]);
  } catch (databaseError) {
    await supabase.auth.admin.updateUserById(input.profileId, {
      email: membership.profile.email,
      email_confirm: true,
      user_metadata: { full_name: membership.profile.fullName, username: membership.profile.username },
    }).catch(() => undefined);
    console.error("Error actualizando miembro institucional:", databaseError);
    return { success: false, error: "No se pudo guardar el perfil institucional." };
  }
  revalidatePath("/superadmin");
  return { success: true };
}

export async function deleteInstitutionUser(institutionId: string, profileId: string) {
  const superAdmin = await requireSuperAdmin();
  if (profileId === superAdmin.id) return { success: false, error: "No puedes eliminar tu propio acceso." };
  const membership = await prisma.institutionMembership.findFirst({
    where: { institutionId, profileId, deletedAt: null },
    include: { profile: { select: { isSuperAdmin: true, username: true } } },
  });
  if (!membership) return { success: false, error: "El miembro no existe en esta institución." };
  if (membership.profile.isSuperAdmin) return { success: false, error: "No puedes eliminar un superadministrador." };

  const otherActiveMemberships = await prisma.institutionMembership.count({
    where: {
      profileId,
      institutionId: { not: institutionId },
      status: "ACTIVE",
      deletedAt: null,
      institution: { active: true, deletedAt: null },
    },
  });
  await prisma.$transaction([
    prisma.institutionMembership.update({
      where: { institutionId_profileId: { institutionId, profileId } },
      data: { status: "SUSPENDED", deletedAt: new Date() },
    }),
    ...(otherActiveMemberships === 0 ? [prisma.profile.update({
      where: { id: profileId },
      data: { active: false },
    })] : []),
    prisma.activityLog.create({
      data: {
        institutionId,
        actorId: superAdmin.id,
        action: "USER_REMOVED_BY_SUPERADMIN",
        entityType: "Profile",
        entityId: profileId,
        metadata: {
          username: membership.profile.username,
          profileDeactivated: otherActiveMemberships === 0,
          deletionType: "SOFT_DELETE",
        },
      },
    }),
  ]);
  revalidatePath("/superadmin");
  revalidatePath(`/superadmin/institutions/${institutionId}`);
  return { success: true };
}

export async function restoreInstitutionUser(institutionId: string, profileId: string) {
  const superAdmin = await requireSuperAdmin();
  const membership = await prisma.institutionMembership.findFirst({
    where: { institutionId, profileId, deletedAt: { not: null } },
    include: { institution: { select: { active: true, deletedAt: true } }, profile: { select: { username: true } } },
  });
  if (!membership) return { success: false, error: "No se encontró una membresía eliminada." };
  if (!membership.institution.active || membership.institution.deletedAt) {
    return { success: false, error: "Activa la institución antes de restaurar usuarios." };
  }
  await prisma.$transaction([
    prisma.institutionMembership.update({
      where: { institutionId_profileId: { institutionId, profileId } },
      data: { status: "ACTIVE", deletedAt: null },
    }),
    prisma.profile.update({ where: { id: profileId }, data: { active: true } }),
    prisma.activityLog.create({
      data: {
        institutionId,
        actorId: superAdmin.id,
        action: "USER_RESTORED_BY_SUPERADMIN",
        entityType: "Profile",
        entityId: profileId,
        metadata: { username: membership.profile.username },
      },
    }),
  ]);
  revalidatePath(`/superadmin/institutions/${institutionId}`);
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
