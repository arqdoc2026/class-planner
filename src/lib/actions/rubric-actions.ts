"use server";

import { createClient } from "@supabase/supabase-js";
import { prisma } from "../prisma";
import { requireInstitutionContext } from "../auth";

const BUCKET = "plan-rubrics";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function storageAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadPlanRubric(planId: string, formData: FormData) {
  try {
    const context = await requireInstitutionContext();
    const supabase = storageAdmin();
    if (!supabase) {
      return { success: false, error: "Supabase Storage aún no tiene configuradas sus credenciales de servidor." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      return { success: false, error: "Selecciona un archivo válido." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "La rúbrica no puede superar 10 MB." };
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: "Solo se permiten archivos PDF, DOCX o XLSX." };
    }

    const plan = await prisma.classPlan.findUnique({
      where: { id: planId },
      select: { id: true, rubricFileUrl: true, authorId: true, institutionId: true },
    });
    if (!plan) return { success: false, error: "La planeación no existe." };
    if (plan.institutionId !== context.institutionId) {
      return { success: false, error: "No tienes permiso para modificar esta planeación." };
    }
    if (!["INSTITUTION_ADMIN", "COORDINATOR"].includes(context.role) && plan.authorId !== context.profile.id) {
      return { success: false, error: "No tienes permiso para modificar esta planeación." };
    }

    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
    if (bucketListError) throw bucketListError;
    if (!buckets.some((bucket) => bucket.name === BUCKET)) {
      const { error } = await supabase.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: Array.from(ALLOWED_TYPES),
      });
      if (error) throw error;
    }

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${planId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    await prisma.classPlan.update({ where: { id: planId }, data: { rubricFileUrl: path } });
    if (plan.rubricFileUrl) {
      await supabase.storage.from(BUCKET).remove([plan.rubricFileUrl]);
    }

    return { success: true, path, fileName: file.name };
  } catch (error) {
    console.error("Error subiendo rúbrica:", error);
    return { success: false, error: "No se pudo subir la rúbrica." };
  }
}

export async function getRubricDownloadUrl(path: string) {
  try {
    const context = await requireInstitutionContext();
    const plan = await prisma.classPlan.findFirst({
      where: {
        rubricFileUrl: path,
        institutionId: context.institutionId,
        deletedAt: null,
        ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
          ? {}
          : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id } } }] }),
      },
      select: { id: true },
    });
    if (!plan) return { success: false, error: "No tienes permiso para abrir esta rúbrica." };
    const supabase = storageAdmin();
    if (!supabase || !path) return { success: false, error: "Storage no está disponible." };
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
    if (error) throw error;
    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error("Error generando enlace de rúbrica:", error);
    return { success: false, error: "No se pudo abrir la rúbrica." };
  }
}
