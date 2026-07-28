"use server";

import { requireInstitutionContext } from "../auth";
import { prisma } from "../prisma";

export async function heartbeatPlanPresence(planId: string, sectionKey?: string) {
  const context = await requireInstitutionContext();
  const plan = await prisma.classPlan.findFirst({
    where: {
      id: planId, institutionId: context.institutionId, deletedAt: null,
      ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
        ? {}
        : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id } } }] }),
    },
    select: { id: true },
  });
  if (!plan) return { success: false, editors: [] };
  await prisma.editingPresence.upsert({
    where: { planId_profileId: { planId, profileId: context.profile.id } },
    update: { sectionKey: sectionKey?.slice(0, 100) || null, lastSeenAt: new Date() },
    create: { planId, profileId: context.profile.id, sectionKey: sectionKey?.slice(0, 100) || null },
  });
  const cutoff = new Date(Date.now() - 90_000);
  const editors = await prisma.editingPresence.findMany({
    where: { planId, lastSeenAt: { gte: cutoff }, profileId: { not: context.profile.id } },
    include: { profile: { select: { fullName: true } } },
    orderBy: { lastSeenAt: "desc" },
  });
  return { success: true, editors: editors.map((item) => ({ name: item.profile.fullName, sectionKey: item.sectionKey })) };
}

export async function lockPlanSection(planId: string, sectionKey: string) {
  const context = await requireInstitutionContext();
  const plan = await prisma.classPlan.findFirst({
    where: {
      id: planId, institutionId: context.institutionId, deletedAt: null,
      ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
        ? {}
        : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id } } }] }),
    },
    select: { id: true },
  });
  if (!plan) return { success: false, error: "Planeación no disponible." };
  await prisma.sectionLock.deleteMany({ where: { expiresAt: { lte: new Date() }, plan: { institutionId: context.institutionId } } });
  const current = await prisma.sectionLock.findUnique({ where: { planId_sectionKey: { planId, sectionKey } }, include: { profile: true } });
  if (current && current.profileId !== context.profile.id) return { success: false, error: `${current.profile.fullName} está editando esta sección.` };
  await prisma.sectionLock.upsert({
    where: { planId_sectionKey: { planId, sectionKey } },
    update: { profileId: context.profile.id, expiresAt: new Date(Date.now() + 5 * 60_000) },
    create: { planId, sectionKey, profileId: context.profile.id, expiresAt: new Date(Date.now() + 5 * 60_000) },
  });
  return { success: true };
}

export async function unlockPlanSection(planId: string, sectionKey: string) {
  const context = await requireInstitutionContext();
  await prisma.sectionLock.deleteMany({ where: { planId, sectionKey, profileId: context.profile.id, plan: { institutionId: context.institutionId } } });
  return { success: true };
}
