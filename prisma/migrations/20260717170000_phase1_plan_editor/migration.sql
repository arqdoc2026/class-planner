-- Fase 1: metadatos persistentes y sesiones ordenadas.
-- Las columnas son opcionales o tienen valores por defecto para conservar
-- todas las planeaciones creadas antes de esta migración.
ALTER TABLE "ClassPlan"
  ADD COLUMN IF NOT EXISTS "area" TEXT,
  ADD COLUMN IF NOT EXISTS "trimesterConfigId" TEXT,
  ADD COLUMN IF NOT EXISTS "teacherName" TEXT,
  ADD COLUMN IF NOT EXISTS "coordinatorName" TEXT,
  ADD COLUMN IF NOT EXISTS "completedSessions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS "ClassPlan_trimesterConfigId_idx"
  ON "ClassPlan"("trimesterConfigId");

CREATE INDEX IF NOT EXISTS "Session_planId_idx"
  ON "Session"("planId");

CREATE UNIQUE INDEX IF NOT EXISTS "Session_planId_sessionNumber_key"
  ON "Session"("planId", "sessionNumber");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassPlan_trimesterConfigId_fkey'
  ) THEN
    ALTER TABLE "ClassPlan"
      ADD CONSTRAINT "ClassPlan_trimesterConfigId_fkey"
      FOREIGN KEY ("trimesterConfigId") REFERENCES "TrimesterConfig"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
