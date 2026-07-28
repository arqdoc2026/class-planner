// Ruta: src/lib/actions/schedule-actions.ts
"use server";

import { prisma } from "../prisma";
import { requireInstitutionContext } from "../auth";
import type { Prisma } from "@prisma/client";

export async function getTeacherSchedule() {
  try {
    const context = await requireInstitutionContext();
    const schedule = await prisma.teacherSchedule.findUnique({
      where: { authorId: context.profile.id }
    });
    return { success: true, data: schedule?.scheduleData || null };
  } catch (error) {
    console.error("Error obteniendo horario:", error);
    return { success: false, error: "Error de base de datos" };
  }
}

export async function saveTeacherSchedule(_teacherName: string, scheduleData: unknown) {
  try {
    const context = await requireInstitutionContext();
    const serialized = JSON.stringify(scheduleData);
    if (!serialized || serialized.length > 250_000) {
      return { success: false, error: "El horario no es válido o supera el tamaño permitido." };
    }
    const safeSchedule = JSON.parse(serialized) as Prisma.InputJsonValue;
    const schedule = await prisma.teacherSchedule.upsert({
      where: { authorId: context.profile.id },
      update: { scheduleData: safeSchedule, teacherName: context.profile.fullName, institutionId: context.institutionId },
      create: { teacherName: context.profile.fullName, scheduleData: safeSchedule, authorId: context.profile.id, institutionId: context.institutionId }
    });
    return { success: true, data: schedule.scheduleData };
  } catch (error) {
    console.error("Error guardando horario:", error);
    return { success: false, error: "No se pudo guardar el horario" };
  }
}
