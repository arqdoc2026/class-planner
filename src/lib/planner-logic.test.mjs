import assert from "node:assert/strict";
import test from "node:test";
import { generateTrimesterSchedule } from "./planner-logic.ts";

test("genera una sesión por semana para el día seleccionado", () => {
  const schedule = generateTrimesterSchedule("2026-07-01", "2026-07-31", 3);

  assert.equal(schedule.length, 5);
  assert.deepEqual(
    schedule.map(({ session, classDate }) => ({
      session,
      date: classDate.toISOString().slice(0, 10),
    })),
    [
      { session: 1, date: "2026-07-01" },
      { session: 2, date: "2026-07-08" },
      { session: 3, date: "2026-07-15" },
      { session: 4, date: "2026-07-22" },
      { session: 5, date: "2026-07-29" },
    ],
  );
});

test("omite un festivo configurado sin dejar huecos en la numeración", () => {
  const schedule = generateTrimesterSchedule("2026-07-01", "2026-07-31", 1);

  assert.deepEqual(
    schedule.map(({ session, classDate }) => ({
      session,
      date: classDate.toISOString().slice(0, 10),
    })),
    [
      { session: 1, date: "2026-07-06" },
      { session: 2, date: "2026-07-13" },
      { session: 3, date: "2026-07-27" },
    ],
  );
});

test("calcula elaboración y aprobación siete días antes de la clase", () => {
  const [entry] = generateTrimesterSchedule("2026-07-01", "2026-07-02", 3);

  assert.equal(entry.classDate.toISOString().slice(0, 10), "2026-07-01");
  assert.equal(entry.elaborationDate.toISOString().slice(0, 10), "2026-06-24");
  assert.equal(entry.approvalDate.toISOString().slice(0, 10), "2026-06-24");
});
