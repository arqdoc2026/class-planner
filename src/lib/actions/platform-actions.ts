"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "../auth";
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
