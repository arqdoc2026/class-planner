// Ruta: src/lib/actions/template-actions.ts
"use server";

import { prisma } from "../prisma";
import { requireInstitutionContext, requireInstitutionRole } from "../auth";
import { DEFAULT_FORMAT_CONFIGURATION } from "../institutional-format";

type TemplateData = {
  schoolName?: string;
  logoUrl?: string | null;
  formatName?: string;
  formatCode?: string;
  version?: string;
  processName?: string;
  defaultArea?: string;
  defaultSubject?: string;
  defaultTeacher?: string;
  defaultCoordinator?: string;
};

export async function getInstitutionalTemplate() {
  try {
    const context = await requireInstitutionContext();
    let template = await prisma.institutionalTemplate.findFirst({ where: { institutionId: context.institutionId } });

    if (!template) {
      template = await prisma.institutionalTemplate.create({
        data: {
          schoolName: "COLEGIO SAN JOSÉ",
          formatName: "FORMATO DE PLANEACIÓN DE CLASES",
          formatCode: "MGF-03-R05",
          version: "01",
          processName: "GESTIÓN ACADÉMICA Y PEDAGÓGICA",
          defaultArea: "Educación Física",
          defaultSubject: "Educación Física",
          defaultTeacher: "KEVIN PERALTA",
          defaultCoordinator: "LESVIA NAVARRO",
          institutionId: context.institutionId,
          configuration: DEFAULT_FORMAT_CONFIGURATION,
        }
      });
    }
    return { success: true, data: template };
  } catch (error) {
    console.error("Error obteniendo plantilla:", error);
    return { success: false, error: "Error de base de datos" };
  }
}

export async function updateInstitutionalTemplate(data: TemplateData) {
  try {
    const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
    const template = await prisma.institutionalTemplate.findFirst({ where: { institutionId: context.institutionId } });

    // Si no existe, la CREAMOS con los datos nuevos en lugar de fallar
    if (!template) {
      const created = await prisma.institutionalTemplate.create({
        data: {
          schoolName: data.schoolName || "COLEGIO SAN JOSÉ",
          logoUrl: data.logoUrl || null,
          formatName: data.formatName || "FORMATO DE PLANEACIÓN DE CLASES",
          formatCode: data.formatCode || "MGF-03-R05",
          version: data.version || "01",
          processName: data.processName || "GESTIÓN ACADÉMICA Y PEDAGÓGICA",
          defaultArea: data.defaultArea || "Educación Física",
          defaultSubject: data.defaultSubject || "Educación Física",
          defaultTeacher: data.defaultTeacher || "KEVIN PERALTA",
          defaultCoordinator: data.defaultCoordinator || "LESVIA NAVARRO",
          institutionId: context.institutionId,
          configuration: DEFAULT_FORMAT_CONFIGURATION,
        }
      });
      return { success: true, data: created };
    }

    // Si ya existe, simplemente la actualizamos
    const updated = await prisma.institutionalTemplate.update({
      where: { id: template.id },
      data: {
        schoolName: data.schoolName,
        logoUrl: data.logoUrl,
        formatName: data.formatName,
        formatCode: data.formatCode,
        version: data.version,
        processName: data.processName,
        defaultArea: data.defaultArea,
        defaultSubject: data.defaultSubject,
        defaultTeacher: data.defaultTeacher,
        defaultCoordinator: data.defaultCoordinator,
      }
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error actualizando plantilla:", error);
    return { success: false, error: "No se pudo guardar la configuración" };
  }
}

export async function publishInstitutionalTemplate() {
  try {
    const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
    const template = await prisma.institutionalTemplate.findFirst({ where: { institutionId: context.institutionId } });
    if (!template) return { success: false, error: "Primero configura el formato institucional." };
    const configuration = template.configuration || DEFAULT_FORMAT_CONFIGURATION;
    const version = await prisma.institutionalTemplateVersion.upsert({
      where: { templateId_version: { templateId: template.id, version: template.version } },
      update: {},
      create: {
        templateId: template.id,
        institutionId: context.institutionId,
        version: template.version,
        formatCode: template.formatCode,
        name: template.formatName,
        configuration,
        effectiveFrom: new Date(),
        createdById: context.profile.id,
      },
    });
    await prisma.institutionalTemplate.update({ where: { id: template.id }, data: { published: true } });
    await prisma.activityLog.create({
      data: {
        institutionId: context.institutionId, actorId: context.profile.id,
        action: "TEMPLATE_VERSION_PUBLISHED", entityType: "InstitutionalTemplateVersion", entityId: version.id,
        metadata: { version: version.version, formatCode: version.formatCode },
      },
    });
    return { success: true, data: version };
  } catch (error) {
    console.error("Error publicando formato:", error);
    return { success: false, error: "No se pudo publicar la versión del formato." };
  }
}

export async function updateTemplateFieldConfiguration(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const template = await prisma.institutionalTemplate.findFirst({ where: { institutionId: context.institutionId } });
  if (!template) return { success: false, error: "Formato no encontrado." };
  const current = (template.configuration as Record<string, unknown> | null) || DEFAULT_FORMAT_CONFIGURATION;
  const requiredFields = formData.getAll("requiredFields").map(String);
  const activeFields = formData.getAll("activeFields").map(String);
  const sectionNames = Object.fromEntries(
    ["expected-results", "assessment-evidence", "learning-plan", "reflection"].map((key) => [key, String(formData.get(`sectionName:${key}`) || "").trim().slice(0, 200)]),
  );
  const instructions = Object.fromEntries(
    ["expected-results", "assessment-evidence", "learning-plan", "reflection"].map((key) => [key, String(formData.get(`instruction:${key}`) || "").trim().slice(0, 2_000)]),
  );
  await prisma.institutionalTemplate.update({
    where: { id: template.id },
    data: { configuration: { ...current, requiredFields, activeFields, sectionNames, instructions } },
  });
  return { success: true };
}
