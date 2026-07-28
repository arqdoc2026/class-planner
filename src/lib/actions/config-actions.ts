// Ruta: src/lib/actions/config-actions.ts
"use server";

import { prisma } from "../prisma";
import { requireInstitutionContext } from "../auth";

// Función 1: Guardar o Actualizar Configuración
export async function saveTrimesterConfig(formData: FormData) {
  try {
    const context = await requireInstitutionContext();
    const grade = String(formData.get("grade") || "").trim().slice(0, 100);
    const trimester = Number(formData.get("trimester"));
    const startDate = new Date(String(formData.get("startDate") || ""));
    const endDate = new Date(String(formData.get("endDate") || ""));
    const mainObjective = String(formData.get("mainObjective") || "").trim().slice(0, 20_000);
    const classDay = Number(formData.get("classDay"));
    const conceptualReferences = String(formData.get("conceptualReferences") || "").trim().slice(0, 20_000);
    if (!grade || !Number.isInteger(trimester) || trimester < 1 || trimester > 6 ||
      Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate > endDate ||
      !mainObjective || !Number.isInteger(classDay) || classDay < 0 || classDay > 6) {
      return { success: false, error: "La configuración académica contiene datos inválidos." };
    }

    await prisma.trimesterConfig.deleteMany({
      where: { grade, trimester, authorId: context.profile.id, institutionId: context.institutionId }
    });

    await prisma.trimesterConfig.create({
      data: { grade, trimester, startDate, endDate, mainObjective, classDay, conceptualReferences, authorId: context.profile.id, institutionId: context.institutionId }
    });

    return { success: true };
  } catch (error) {
    console.error("Error guardando configuración:", error);
    return { success: false, error: "No se pudo guardar la configuración." };
  }
}

// Función 2: Leer las configuraciones para mostrarlas en pantalla
export async function getTrimesterConfigs() {
  try {
    const context = await requireInstitutionContext();
    const configs = await prisma.trimesterConfig.findMany({
      where: {
        institutionId: context.institutionId,
        ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR" ? {} : { authorId: context.profile.id }),
      },
      orderBy: { trimester: 'asc' } // Ordenamos Trimestre 1, 2, 3
    });
    return { success: true, data: configs };
  } catch {
    return { success: false, error: "Error al cargar los datos." };
  }
}

// Función 3: Eliminar una configuración específica
export async function deleteTrimesterConfig(id: string) {
  try {
    const context = await requireInstitutionContext();
    const result = await prisma.trimesterConfig.deleteMany({
      where: {
        id,
        institutionId: context.institutionId,
        ...(context.role === "INSTITUTION_ADMIN" ? {} : { authorId: context.profile.id }),
      }
    });
    if (!result.count) return { success: false, error: "No tienes permiso para eliminar esta configuración." };
    return { success: true };
  } catch (error) {
    console.error("Error eliminando configuración:", error);
    return { success: false, error: "No se pudo eliminar." };
  }
}
