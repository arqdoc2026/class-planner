"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireInstitutionContext } from "../auth";
import { prisma } from "../prisma";

const BUCKET = "plan-attachments";
const MAX_SIZE = 15 * 1024 * 1024;
const TYPES = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/png", "image/jpeg"]);
function storage() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export async function uploadPlanAttachment(planId: string, formData: FormData) {
  const context = await requireInstitutionContext();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size || file.size > MAX_SIZE || !TYPES.has(file.type)) return { success: false, error: "Archivo no válido. Máximo 15 MB: PDF, DOCX, XLSX, PNG o JPG." };
  const plan = await prisma.classPlan.findFirst({
    where: {
      id: planId, institutionId: context.institutionId, deletedAt: null,
      ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
        ? {}
        : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id, role: "EDITOR" } } }] }),
    },
  });
  if (!plan) return { success: false, error: "No tienes permiso." };
  const client = storage();
  if (!client) return { success: false, error: "Storage no está configurado." };
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const path = `${context.institutionId}/${planId}/${crypto.randomUUID()}.${extension}`;
  const uploaded = await client.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (uploaded.error) return { success: false, error: "No se pudo cargar el archivo. Verifica que el bucket privado plan-attachments exista." };
  await prisma.planAttachment.create({
    data: { planId, uploaderId: context.profile.id, fileName: file.name.slice(0, 500), storagePath: path, mimeType: file.type, sizeBytes: file.size, category: String(formData.get("category") || "GENERAL").slice(0, 50) },
  });
  revalidatePath(`/plans/${planId}/review`);
  return { success: true };
}

export async function getAttachmentUrl(id: string) {
  const context = await requireInstitutionContext();
  const attachment = await prisma.planAttachment.findFirst({ where: { id, deletedAt: null, plan: { institutionId: context.institutionId, deletedAt: null } } });
  const client = storage();
  if (!attachment || !client) return { success: false, error: "Archivo no disponible." };
  const signed = await client.storage.from(BUCKET).createSignedUrl(attachment.storagePath, 600);
  return signed.error ? { success: false, error: "No se pudo abrir." } : { success: true, url: signed.data.signedUrl };
}
