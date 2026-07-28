// Ruta: src/lib/planner-logic.ts

export function generateTrimesterSchedule(
  startDateStr: string,
  endDateStr: string,
  classDayOfWeek: number
) {
  // Usar 'T12:00:00' evita errores de zona horaria al crear la fecha
  const startDate = new Date(`${startDateStr}T12:00:00`);
  const endDate = new Date(`${endDateStr}T12:00:00`);
  const schedule = [];

  // Calendario oficial de festivos en Colombia para 2026 (Formato YYYY-MM-DD)
  const holidays2026 = [
    "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
    "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
    "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
    "2026-11-16", "2026-12-08", "2026-12-25"
  ];

  const currentDate = new Date(startDate);

  // 1. Buscar el primer día de clase en el rango
  while (currentDate.getDay() !== classDayOfWeek) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  let sessionNumber = 1;

  // 2. Iterar semana a semana
  while (currentDate <= endDate) {
    const classDate = new Date(currentDate);
    const dateStr = classDate.toISOString().split('T')[0]; // Extrae "YYYY-MM-DD"

    // 3. LA MAGIA: Verificamos que la fecha NO esté en la lista de festivos
    if (!holidays2026.includes(dateStr)) {
      const elaborationDate = new Date(classDate);
      elaborationDate.setDate(classDate.getDate() - 7);

      schedule.push({
        session: sessionNumber,
        classDate: classDate,
        elaborationDate: elaborationDate,
        approvalDate: elaborationDate,
      });

      // Solo aumentamos el número de sesión si realmente hubo clase
      sessionNumber++;
    }

    // Saltar a la próxima semana de todos modos
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return schedule;
}