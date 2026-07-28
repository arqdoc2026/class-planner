import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { createClient } from "./supabase/server";

export type InstitutionRole = "INSTITUTION_ADMIN" | "COORDINATOR" | "TEACHER" | "VIEWER";

export function roleHomePath(role: InstitutionRole, isSuperAdmin = false) {
  if (isSuperAdmin) return "/superadmin";
  if (role === "INSTITUTION_ADMIN" || role === "COORDINATOR") return "/overview";
  if (role === "TEACHER") return "/overview";
  return "/plans";
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  return prisma.profile.findUnique({ where: { id: userId } });
}

export async function getCurrentInstitutionContext() {
  const profile = await getCurrentProfile();
  if (!profile?.active) return null;

  const membership = await prisma.institutionMembership.findFirst({
    where: {
      profileId: profile.id,
      status: "ACTIVE",
      deletedAt: null,
      institution: { active: true, deletedAt: null },
    },
    include: { institution: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) return null;
  return {
    profile,
    institution: membership.institution,
    membership,
    institutionId: membership.institutionId,
    role: membership.role as InstitutionRole,
  };
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active) redirect("/");
  return profile;
}

export async function requireInstitutionContext() {
  const context = await getCurrentInstitutionContext();
  if (!context) redirect("/");
  return context;
}

export async function requireInstitutionRole(roles: InstitutionRole[]) {
  const context = await requireInstitutionContext();
  if (!roles.includes(context.role)) redirect("/overview");
  return context;
}

export async function requireAdmin() {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  return context.profile;
}

export async function requireSuperAdmin() {
  const profile = await requireProfile();
  if (!profile.isSuperAdmin) redirect("/overview");
  return profile;
}
