import type { InstitutionRole } from "../auth";

export type Permission =
  | "institution.manage"
  | "members.manage"
  | "catalog.manage"
  | "templates.manage"
  | "plans.create"
  | "plans.edit"
  | "plans.review"
  | "plans.approve"
  | "plans.read"
  | "ai.use";

const permissions: Record<InstitutionRole, ReadonlySet<Permission>> = {
  INSTITUTION_ADMIN: new Set([
    "institution.manage", "members.manage", "catalog.manage", "templates.manage",
    "plans.create", "plans.edit", "plans.review", "plans.approve", "plans.read", "ai.use",
  ]),
  COORDINATOR: new Set(["plans.create", "plans.edit", "plans.review", "plans.approve", "plans.read", "ai.use"]),
  TEACHER: new Set(["plans.create", "plans.edit", "plans.read", "ai.use"]),
  VIEWER: new Set(["plans.read"]),
};

export function hasPermission(role: InstitutionRole, permission: Permission) {
  return permissions[role].has(permission);
}

export function assertPermission(role: InstitutionRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export function assertInstitutionAiEnabled(role: InstitutionRole, settings: unknown) {
  const disabledRoles = Array.isArray((settings as { aiDisabledRoles?: unknown } | null)?.aiDisabledRoles)
    ? (settings as { aiDisabledRoles: unknown[] }).aiDisabledRoles.map(String)
    : [];
  if (disabledRoles.includes(role)) throw new Error("AI_DISABLED_FOR_ROLE");
}
