"use server";

import { revalidatePath } from "next/cache";
import { requireInstitutionContext, requireInstitutionRole, type InstitutionRole } from "../auth";
import { prisma } from "../prisma";
import { createHash, randomBytes } from "node:crypto";

export async function getCurrentProfileAction() {
  const context = await requireInstitutionContext();
  return { id: context.profile.id, email: context.profile.email, fullName: context.profile.fullName, role: context.role, isSuperAdmin: context.profile.isSuperAdmin };
}

export async function getTeamProfiles() {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const memberships = await prisma.institutionMembership.findMany({
    where: { institutionId: context.institutionId, deletedAt: null },
    include: { profile: true },
    orderBy: [{ role: "asc" }, { profile: { fullName: "asc" } }],
  });
  return memberships.map(({ profile, role, status }) => ({
    id: profile.id,
    email: profile.email,
    username: profile.username,
    fullName: profile.fullName,
    role,
    active: status === "ACTIVE",
  }));
}

export async function updateTeamMember(profileId: string, data: { role?: InstitutionRole; active?: boolean }) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  if (profileId === context.profile.id) return { success: false, error: "No puedes cambiar tu propio acceso." };
  const membership = await prisma.institutionMembership.update({
    where: { institutionId_profileId: { institutionId: context.institutionId, profileId } },
    data: {
      ...(data.role ? { role: data.role } : {}),
      ...(typeof data.active === "boolean" ? { status: data.active ? "ACTIVE" : "SUSPENDED" } : {}),
    },
  });
  revalidatePath("/admin/team");
  return { success: true, profile: membership };
}

export async function claimLegacyData() {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const admin = context.profile;
  const result = await prisma.$transaction(async (tx) => {
    const plans = await tx.classPlan.updateMany({ where: { authorId: null, institutionId: context.institutionId }, data: { authorId: admin.id } });
    const configs = await tx.trimesterConfig.updateMany({ where: { authorId: null, institutionId: context.institutionId }, data: { authorId: admin.id } });

    // Cada perfil admite un solo horario. Si el administrador ya creó uno,
    // conservamos los horarios heredados sin dueño en lugar de sobrescribirlos.
    let scheduleCount = 0;
    const adminSchedule = await tx.teacherSchedule.findUnique({ where: { authorId: admin.id }, select: { id: true } });
    if (!adminSchedule) {
      const legacySchedule = await tx.teacherSchedule.findFirst({
        where: { authorId: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (legacySchedule) {
        await tx.teacherSchedule.update({ where: { id: legacySchedule.id }, data: { authorId: admin.id } });
        scheduleCount = 1;
      }
    }

    return { plans: plans.count, configs: configs.count, schedules: scheduleCount };
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin/team");
  return { success: true, counts: result };
}

export async function createTeamInvitation(input: { username: string; fullName: string; role: InstitutionRole }) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const username = input.username.trim().toLowerCase();
  const fullName = input.fullName.trim().slice(0, 200);
  if (!/^[a-z0-9._-]{3,30}$/.test(username) || fullName.length < 2) {
    return { success: false, error: "Nombre o usuario no válido." };
  }
  if (!["INSTITUTION_ADMIN", "COORDINATOR", "TEACHER", "VIEWER"].includes(input.role)) {
    return { success: false, error: "Rol no válido." };
  }
  const existingProfile = await prisma.profile.findUnique({ where: { username }, select: { id: true } });
  if (existingProfile) return { success: false, error: "Ese usuario ya existe; asígnalo como miembro desde administración." };
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.institutionInvitation.upsert({
    where: { institutionId_username: { institutionId: context.institutionId, username } },
    update: { fullName, role: input.role, tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000), acceptedAt: null, invitedById: context.profile.id },
    create: { institutionId: context.institutionId, username, fullName, role: input.role, tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000), invitedById: context.profile.id },
  });
  return { success: true, invitePath: `/auth/signup?invite=${encodeURIComponent(token)}` };
}
