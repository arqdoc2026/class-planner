"use server";

// Usamos rutas relativas (../) porque estamos dentro de la carpeta actions
import { prisma } from "../prisma";
import { generateTrimesterSchedule } from "../planner-logic";
import { requireInstitutionContext } from "../auth";

export async function createQuarterlyPlans(formData: FormData) {
  try {
    const context = await requireInstitutionContext();
    // 1. Extraer los datos del formulario
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const classDay = parseInt(formData.get("classDay") as string);
    const unitTitle = formData.get("unitTitle") as string;

    // 2. Calcular todas las fechas
    const schedule = generateTrimesterSchedule(startDate, endDate, classDay);

    // 3. Preparar los datos para Prisma
    const plansToCreate = schedule.map((s: { session: number, classDate: Date, elaborationDate: Date, approvalDate: Date }) => ({
      unitTitle: `${unitTitle} - Sesión ${s.session}`,
      classDate: s.classDate,
      elaborationDate: s.elaborationDate,
      approvalDate: s.approvalDate,
      authorId: context.profile.id,
      institutionId: context.institutionId,
    }));

    // 4. Guardar todo en Supabase en una sola operación rápida
    const result = await prisma.classPlan.createMany({
      data: plansToCreate,
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error generando trimestre:", error);
    return { success: false, error: "Hubo un error al generar las planeaciones." };
  }
}
