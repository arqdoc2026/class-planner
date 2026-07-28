-- Structured catalog links used by institutional filters and exports.
ALTER TABLE "ClassPlan"
  ADD COLUMN IF NOT EXISTS "campusId" TEXT,
  ADD COLUMN IF NOT EXISTS "academicYearId" TEXT,
  ADD COLUMN IF NOT EXISTS "academicPeriodId" TEXT,
  ADD COLUMN IF NOT EXISTS "academicAreaId" TEXT,
  ADD COLUMN IF NOT EXISTS "academicSubjectId" TEXT,
  ADD COLUMN IF NOT EXISTS "academicGradeId" TEXT,
  ADD COLUMN IF NOT EXISTS "courseGroupId" TEXT;

DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_academicAreaId_fkey" FOREIGN KEY ("academicAreaId") REFERENCES "AcademicArea"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_academicSubjectId_fkey" FOREIGN KEY ("academicSubjectId") REFERENCES "AcademicSubject"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_academicGradeId_fkey" FOREIGN KEY ("academicGradeId") REFERENCES "AcademicGrade"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_courseGroupId_fkey" FOREIGN KEY ("courseGroupId") REFERENCES "CourseGroup"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "ClassPlan_institutionId_academicYearId_academicPeriodId_idx" ON "ClassPlan"("institutionId", "academicYearId", "academicPeriodId");
CREATE INDEX IF NOT EXISTS "ClassPlan_institutionId_academicAreaId_academicSubjectId_idx" ON "ClassPlan"("institutionId", "academicAreaId", "academicSubjectId");
CREATE INDEX IF NOT EXISTS "ClassPlan_institutionId_academicGradeId_courseGroupId_idx" ON "ClassPlan"("institutionId", "academicGradeId", "courseGroupId");
CREATE INDEX IF NOT EXISTS "ClassPlan_institutionId_campusId_idx" ON "ClassPlan"("institutionId", "campusId");

-- Defense in depth for tables that can otherwise be reached directly through Supabase.
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicPeriod" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_plan_member" ON "Session";
CREATE POLICY "sessions_plan_member" ON "Session" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "Session"."planId" AND public.is_active_institution_member(p."institutionId")
));
DROP POLICY IF EXISTS "sessions_plan_editor" ON "Session";
CREATE POLICY "sessions_plan_editor" ON "Session" FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "Session"."planId" AND (
    public.has_institution_role(p."institutionId", ARRAY['INSTITUTION_ADMIN','COORDINATOR']::"MembershipRole"[])
    OR p."authorId" = auth.uid()
    OR EXISTS (SELECT 1 FROM "PlanCollaborator" c WHERE c."planId" = p."id" AND c."profileId" = auth.uid() AND c."role" = 'EDITOR')
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "Session"."planId" AND public.is_active_institution_member(p."institutionId")
));

DROP POLICY IF EXISTS "periods_tenant" ON "AcademicPeriod";
CREATE POLICY "periods_tenant" ON "AcademicPeriod" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "AcademicYear" y
  WHERE y."id" = "AcademicPeriod"."academicYearId" AND public.is_active_institution_member(y."institutionId")
));
DROP POLICY IF EXISTS "periods_admin_write" ON "AcademicPeriod";
CREATE POLICY "periods_admin_write" ON "AcademicPeriod" FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM "AcademicYear" y
  WHERE y."id" = "AcademicPeriod"."academicYearId"
    AND public.has_institution_role(y."institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "AcademicYear" y
  WHERE y."id" = "AcademicPeriod"."academicYearId"
    AND public.has_institution_role(y."institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[])
));
