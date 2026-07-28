export const PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En elaboración",
  READY_FOR_REVIEW: "Lista para revisión",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Cambios solicitados",
  CORRECTED: "Corregida",
  APPROVED: "Aprobada",
  ARCHIVED: "Archivada",
};

export function planStatusLabel(status: string) {
  return PLAN_STATUS_LABELS[status] || status;
}
