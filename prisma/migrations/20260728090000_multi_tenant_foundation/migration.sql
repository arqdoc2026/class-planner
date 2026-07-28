-- Fundación multi-tenant aditiva.
-- Conserva todas las entidades y datos existentes.
CREATE TYPE "MembershipRole" AS ENUM ('INSTITUTION_ADMIN', 'COORDINATOR', 'TEACHER', 'VIEWER');
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

ALTER TABLE "profiles" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE "profiles" SET "isSuperAdmin" = TRUE
WHERE "id" = (SELECT "id" FROM "profiles" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1);

CREATE TABLE "Institution" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "Campus" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("institutionId", "name")
);

CREATE TABLE "InstitutionMembership" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "profileId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role" "MembershipRole" NOT NULL DEFAULT 'TEACHER',
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  UNIQUE ("institutionId", "profileId")
);
CREATE INDEX "InstitutionMembership_profileId_status_idx" ON "InstitutionMembership"("profileId", "status");

ALTER TABLE "ClassPlan"
  ADD COLUMN "institutionId" TEXT,
  ADD COLUMN "formatVersionId" TEXT,
  ADD COLUMN "formatSnapshot" JSONB,
  ADD COLUMN "expectedResults" JSONB,
  ADD COLUMN "evaluationEvidence" JSONB,
  ADD COLUMN "finalReflection" JSONB,
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD CONSTRAINT "ClassPlan_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT;

ALTER TABLE "TrimesterConfig" ADD COLUMN "institutionId" TEXT;
ALTER TABLE "Template" ADD COLUMN "institutionId" TEXT;
ALTER TABLE "TeacherSchedule" ADD COLUMN "institutionId" TEXT;

ALTER TABLE "Session"
  ADD COLUMN "plannedDate" TIMESTAMP(3),
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PLANNED',
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "formativeAssessment" TEXT,
  ADD COLUMN "differentiation" TEXT,
  ADD COLUMN "individualWork" TEXT,
  ADD COLUMN "teamwork" TEXT,
  ADD COLUMN "wholeClassInstruction" TEXT,
  ADD COLUMN "exchangeOfIdeas" TEXT,
  ADD COLUMN "commitments" TEXT,
  ADD COLUMN "generatedEvidence" TEXT,
  ADD COLUMN "responsible" TEXT,
  ADD COLUMN "observations" TEXT,
  ADD COLUMN "ignatianElements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "personalizationStrategies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "InstitutionalTemplate"
  ADD COLUMN "institutionId" TEXT,
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "configuration" JSONB,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT "InstitutionalTemplate_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;

-- Institución inicial para migrar el MVP de equipo único sin perder datos.
INSERT INTO "Institution" ("id", "name", "slug", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'Colegio San José', 'colegio-san-jose', CURRENT_TIMESTAMP);

INSERT INTO "Campus" ("id", "institutionId", "name", "code", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Sede principal', 'PRINCIPAL', CURRENT_TIMESTAMP);

INSERT INTO "InstitutionMembership" ("id", "institutionId", "profileId", "role", "status", "updatedAt")
SELECT gen_random_uuid()::text,
       '00000000-0000-4000-8000-000000000001',
       p."id",
       CASE WHEN p."role" = 'ADMIN' THEN 'INSTITUTION_ADMIN'::"MembershipRole" ELSE 'TEACHER'::"MembershipRole" END,
       CASE WHEN p."active" THEN 'ACTIVE'::"MembershipStatus" ELSE 'SUSPENDED'::"MembershipStatus" END,
       CURRENT_TIMESTAMP
FROM "profiles" p
ON CONFLICT ("institutionId", "profileId") DO NOTHING;

-- Mantiene el registro abierto del MVP asociado a la institución inicial.
-- La fase de invitaciones reemplazará este comportamiento.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_role public."UserRole";
  membership_role public."MembershipRole";
BEGIN
  new_role := CASE WHEN NOT EXISTS (SELECT 1 FROM public.profiles)
    THEN 'ADMIN'::public."UserRole" ELSE 'TEACHER'::public."UserRole" END;
  membership_role := CASE WHEN new_role = 'ADMIN'
    THEN 'INSTITUTION_ADMIN'::public."MembershipRole" ELSE 'TEACHER'::public."MembershipRole" END;

  INSERT INTO public.profiles ("id", "email", "username", "fullName", "role", "updatedAt")
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    lower(COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'username', ''), split_part(COALESCE(NEW.email, ''), '@', 1))),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.raw_user_meta_data ->> 'username', 'Docente'),
    new_role,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("id") DO NOTHING;

  INSERT INTO public."InstitutionMembership"
    ("id", "institutionId", "profileId", "role", "status", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    '00000000-0000-4000-8000-000000000001',
    NEW.id,
    membership_role,
    'ACTIVE',
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("institutionId", "profileId") DO NOTHING;
  RETURN NEW;
END;
$$;

UPDATE "ClassPlan"
SET "institutionId" = '00000000-0000-4000-8000-000000000001'
WHERE "institutionId" IS NULL;

UPDATE "TrimesterConfig" SET "institutionId" = '00000000-0000-4000-8000-000000000001' WHERE "institutionId" IS NULL;
UPDATE "Template" SET "institutionId" = '00000000-0000-4000-8000-000000000001' WHERE "institutionId" IS NULL;
UPDATE "TeacherSchedule" SET "institutionId" = '00000000-0000-4000-8000-000000000001' WHERE "institutionId" IS NULL;

UPDATE "InstitutionalTemplate"
SET "institutionId" = '00000000-0000-4000-8000-000000000001'
WHERE "institutionId" IS NULL;

CREATE INDEX "ClassPlan_institutionId_status_updatedAt_idx"
  ON "ClassPlan"("institutionId", "status", "updatedAt");
CREATE INDEX "InstitutionalTemplate_institutionId_published_idx"
  ON "InstitutionalTemplate"("institutionId", "published");
CREATE INDEX "TrimesterConfig_institutionId_grade_trimester_idx" ON "TrimesterConfig"("institutionId", "grade", "trimester");
CREATE INDEX "TeacherSchedule_institutionId_idx" ON "TeacherSchedule"("institutionId");

CREATE TABLE "InstitutionalTemplateVersion" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES "InstitutionalTemplate"("id") ON DELETE CASCADE,
  "institutionId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "formatCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "configuration" JSONB NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  UNIQUE ("templateId", "version")
);
CREATE INDEX "InstitutionalTemplateVersion_institutionId_effectiveFrom_idx"
  ON "InstitutionalTemplateVersion"("institutionId", "effectiveFrom");
ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_formatVersionId_fkey"
  FOREIGN KEY ("formatVersionId") REFERENCES "InstitutionalTemplateVersion"("id") ON DELETE RESTRICT;
CREATE INDEX "ClassPlan_formatVersionId_idx" ON "ClassPlan"("formatVersionId");

CREATE TABLE "AcademicArea" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("institutionId", "name")
);

CREATE TABLE "AcademicSubject" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL REFERENCES "AcademicArea"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("institutionId", "name")
);
CREATE INDEX "AcademicSubject_areaId_idx" ON "AcademicSubject"("areaId");

CREATE TABLE "AcademicYear" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE ("institutionId", "name")
);

CREATE TABLE "AcademicPeriod" (
  "id" TEXT PRIMARY KEY,
  "academicYearId" TEXT NOT NULL REFERENCES "AcademicYear"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "periodType" TEXT NOT NULL DEFAULT 'TRIMESTER',
  UNIQUE ("academicYearId", "sequence")
);

CREATE TABLE "PlanCollaborator" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE,
  "profileId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'EDITOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("planId", "profileId")
);
CREATE INDEX "PlanCollaborator_profileId_idx" ON "PlanCollaborator"("profileId");

CREATE TABLE "PlanComment" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE,
  "authorId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "sectionKey" TEXT,
  "body" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "PlanComment_planId_resolvedAt_idx" ON "PlanComment"("planId", "resolvedAt");

CREATE TABLE "PlanVersion" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE,
  "institutionId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "reason" TEXT,
  "createdById" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("planId", "versionNumber")
);
CREATE INDEX "PlanVersion_institutionId_createdAt_idx" ON "PlanVersion"("institutionId", "createdAt");

CREATE TABLE "Activity" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "Session"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "classMoment" TEXT NOT NULL,
  "estimatedMinutes" INTEGER,
  "groupingType" TEXT,
  "resources" TEXT,
  "pedagogicalPurpose" TEXT,
  "expectedEvidence" TEXT,
  "assessmentStrategy" TEXT,
  "differentiationStrategy" TEXT,
  "ignatianElements" TEXT[] NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sessionId", "position")
);

CREATE TABLE "ActivityLog" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "actorId" UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ActivityLog_institutionId_entityType_entityId_createdAt_idx"
  ON "ActivityLog"("institutionId", "entityType", "entityId", "createdAt");

CREATE TABLE "AcademicGrade" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "level" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("institutionId", "name")
);
CREATE TABLE "CourseGroup" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "gradeId" TEXT NOT NULL REFERENCES "AcademicGrade"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("institutionId", "gradeId", "name")
);
CREATE TABLE "PlanReview" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE,
  "reviewerId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "versionNumber" INTEGER NOT NULL,
  "decision" TEXT NOT NULL DEFAULT 'PENDING',
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3)
);
CREATE INDEX "PlanReview_reviewerId_decision_idx" ON "PlanReview"("reviewerId", "decision");
CREATE INDEX "PlanReview_planId_createdAt_idx" ON "PlanReview"("planId", "createdAt");
CREATE TABLE "PlanApproval" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE RESTRICT,
  "approverId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "versionNumber" INTEGER NOT NULL,
  "observations" TEXT,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PlanApproval_planId_approvedAt_idx" ON "PlanApproval"("planId", "approvedAt");
CREATE TABLE "Rubric" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "structure" JSONB NOT NULL,
  "reusable" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "Rubric_institutionId_reusable_idx" ON "Rubric"("institutionId", "reusable");
CREATE TABLE "AiRequest" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "profileId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "planId" TEXT,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "inputLength" INTEGER NOT NULL DEFAULT 0,
  "outputLength" INTEGER NOT NULL DEFAULT 0,
  "suggestion" JSONB,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AiRequest_institutionId_createdAt_idx" ON "AiRequest"("institutionId", "createdAt");
CREATE INDEX "AiRequest_profileId_createdAt_idx" ON "AiRequest"("profileId", "createdAt");
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "profileId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Notification_profileId_readAt_createdAt_idx" ON "Notification"("profileId", "readAt", "createdAt");
CREATE TABLE "SavedFilter" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "profileId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("institutionId", "profileId", "name")
);
CREATE INDEX "SavedFilter_profileId_createdAt_idx" ON "SavedFilter"("profileId", "createdAt");
CREATE TABLE "InstitutionInvitation" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "username" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'TEACHER',
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedById" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("institutionId", "username")
);
CREATE INDEX "InstitutionInvitation_institutionId_expiresAt_idx" ON "InstitutionInvitation"("institutionId", "expiresAt");
CREATE TABLE "EditingPresence" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE,
  "profileId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "sectionKey" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("planId", "profileId")
);
CREATE INDEX "EditingPresence_planId_lastSeenAt_idx" ON "EditingPresence"("planId", "lastSeenAt");
CREATE TABLE "SectionLock" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE,
  "profileId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "sectionKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("planId", "sectionKey")
);
CREATE INDEX "SectionLock_expiresAt_idx" ON "SectionLock"("expiresAt");
CREATE TABLE "ActivityTemplate" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL REFERENCES "Institution"("id") ON DELETE CASCADE,
  "createdById" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "classMoment" TEXT NOT NULL,
  "estimatedMinutes" INTEGER,
  "groupingType" TEXT,
  "resources" TEXT,
  "pedagogicalPurpose" TEXT,
  "expectedEvidence" TEXT,
  "assessmentStrategy" TEXT,
  "differentiationStrategy" TEXT,
  "ignatianElements" TEXT[] NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ActivityTemplate_institutionId_active_updatedAt_idx" ON "ActivityTemplate"("institutionId", "active", "updatedAt");
CREATE TABLE "PlanAttachment" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE,
  "uploaderId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "fileName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL UNIQUE,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "PlanAttachment_planId_category_createdAt_idx" ON "PlanAttachment"("planId", "category", "createdAt");

-- RLS: la membresía activa es la frontera de cada institución.
ALTER TABLE "Institution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstitutionMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanCollaborator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicGrade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rubric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedFilter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstitutionInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EditingPresence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SectionLock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstitutionalTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstitutionalTemplateVersion" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_institution_member(target_institution_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."InstitutionMembership" m
    WHERE m."institutionId" = target_institution_id
      AND m."profileId" = auth.uid()
      AND m."status" = 'ACTIVE'
      AND m."deletedAt" IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_institution_role(target_institution_id TEXT, allowed_roles "MembershipRole"[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."InstitutionMembership" m
    WHERE m."institutionId" = target_institution_id
      AND m."profileId" = auth.uid()
      AND m."status" = 'ACTIVE'
      AND m."role" = ANY(allowed_roles)
      AND m."deletedAt" IS NULL
  );
$$;

DROP POLICY IF EXISTS "plans_owner_or_admin" ON "ClassPlan";
CREATE POLICY "plans_institution_read" ON "ClassPlan" FOR SELECT TO authenticated
USING (public.is_active_institution_member("institutionId") AND "deletedAt" IS NULL);
CREATE POLICY "plans_institution_write" ON "ClassPlan" FOR ALL TO authenticated
USING (
  public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN','COORDINATOR']::"MembershipRole"[])
  OR "authorId" = auth.uid()
  OR EXISTS (SELECT 1 FROM "PlanCollaborator" c WHERE c."planId" = "ClassPlan"."id" AND c."profileId" = auth.uid() AND c."role" = 'EDITOR')
)
WITH CHECK (public.is_active_institution_member("institutionId"));

CREATE POLICY "institutions_member_read" ON "Institution" FOR SELECT TO authenticated
USING (public.is_active_institution_member("id"));
CREATE POLICY "memberships_member_read" ON "InstitutionMembership" FOR SELECT TO authenticated
USING (public.is_active_institution_member("institutionId"));
CREATE POLICY "memberships_admin_write" ON "InstitutionMembership" FOR ALL TO authenticated
USING (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));

CREATE POLICY "campus_tenant" ON "Campus" FOR ALL TO authenticated
USING (public.is_active_institution_member("institutionId"))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "areas_tenant" ON "AcademicArea" FOR ALL TO authenticated
USING (public.is_active_institution_member("institutionId"))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "subjects_tenant" ON "AcademicSubject" FOR ALL TO authenticated
USING (public.is_active_institution_member("institutionId"))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "years_tenant" ON "AcademicYear" FOR ALL TO authenticated
USING (public.is_active_institution_member("institutionId"))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "templates_tenant" ON "InstitutionalTemplate" FOR SELECT TO authenticated
USING (public.is_active_institution_member("institutionId"));
CREATE POLICY "templates_admin_write" ON "InstitutionalTemplate" FOR ALL TO authenticated
USING (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "template_versions_read" ON "InstitutionalTemplateVersion" FOR SELECT TO authenticated
USING (public.is_active_institution_member("institutionId"));
CREATE POLICY "template_versions_admin_write" ON "InstitutionalTemplateVersion" FOR ALL TO authenticated
USING (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));

CREATE POLICY "grades_tenant" ON "AcademicGrade" FOR ALL TO authenticated
USING (public.is_active_institution_member("institutionId"))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "groups_tenant" ON "CourseGroup" FOR ALL TO authenticated
USING (public.is_active_institution_member("institutionId"))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "rubrics_tenant_read" ON "Rubric" FOR SELECT TO authenticated
USING (public.is_active_institution_member("institutionId") AND "deletedAt" IS NULL);
CREATE POLICY "rubrics_tenant_write" ON "Rubric" FOR ALL TO authenticated
USING (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN','COORDINATOR','TEACHER']::"MembershipRole"[]))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN','COORDINATOR','TEACHER']::"MembershipRole"[]));
CREATE POLICY "ai_requests_owner" ON "AiRequest" FOR SELECT TO authenticated
USING ("profileId" = auth.uid() AND public.is_active_institution_member("institutionId"));
CREATE POLICY "notifications_owner" ON "Notification" FOR ALL TO authenticated
USING ("profileId" = auth.uid() AND public.is_active_institution_member("institutionId"))
WITH CHECK ("profileId" = auth.uid() AND public.is_active_institution_member("institutionId"));
CREATE POLICY "saved_filters_owner" ON "SavedFilter" FOR ALL TO authenticated
USING ("profileId" = auth.uid() AND public.is_active_institution_member("institutionId"))
WITH CHECK ("profileId" = auth.uid() AND public.is_active_institution_member("institutionId"));
CREATE POLICY "invitations_admin" ON "InstitutionInvitation" FOR ALL TO authenticated
USING (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN']::"MembershipRole"[]));
CREATE POLICY "presence_plan_member" ON "EditingPresence" FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM "ClassPlan" p WHERE p."id" = "EditingPresence"."planId" AND public.is_active_institution_member(p."institutionId")))
WITH CHECK ("profileId" = auth.uid() AND EXISTS (SELECT 1 FROM "ClassPlan" p WHERE p."id" = "EditingPresence"."planId" AND public.is_active_institution_member(p."institutionId")));
CREATE POLICY "locks_plan_member" ON "SectionLock" FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM "ClassPlan" p WHERE p."id" = "SectionLock"."planId" AND public.is_active_institution_member(p."institutionId")))
WITH CHECK ("profileId" = auth.uid() AND EXISTS (SELECT 1 FROM "ClassPlan" p WHERE p."id" = "SectionLock"."planId" AND public.is_active_institution_member(p."institutionId")));
CREATE POLICY "activity_templates_tenant" ON "ActivityTemplate" FOR ALL TO authenticated
USING (public.is_active_institution_member("institutionId"))
WITH CHECK (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN','COORDINATOR','TEACHER']::"MembershipRole"[]));
CREATE POLICY "attachments_plan_member" ON "PlanAttachment" FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM "ClassPlan" p WHERE p."id" = "PlanAttachment"."planId" AND public.is_active_institution_member(p."institutionId")));
CREATE POLICY "comments_plan_member" ON "PlanComment" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "PlanComment"."planId" AND public.is_active_institution_member(p."institutionId")
));
CREATE POLICY "comments_plan_create" ON "PlanComment" FOR INSERT TO authenticated
WITH CHECK ("authorId" = auth.uid() AND EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "PlanComment"."planId" AND public.is_active_institution_member(p."institutionId")
));
CREATE POLICY "collaborators_plan_member" ON "PlanCollaborator" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "PlanCollaborator"."planId" AND public.is_active_institution_member(p."institutionId")
));
CREATE POLICY "versions_plan_member" ON "PlanVersion" FOR SELECT TO authenticated
USING (public.is_active_institution_member("institutionId"));
CREATE POLICY "activities_plan_member" ON "Activity" FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Session" s JOIN "ClassPlan" p ON p."id" = s."planId"
  WHERE s."id" = "Activity"."sessionId" AND public.is_active_institution_member(p."institutionId")
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "Session" s JOIN "ClassPlan" p ON p."id" = s."planId"
  WHERE s."id" = "Activity"."sessionId" AND public.is_active_institution_member(p."institutionId")
));
CREATE POLICY "reviews_plan_member" ON "PlanReview" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "PlanReview"."planId" AND public.is_active_institution_member(p."institutionId")
));
CREATE POLICY "approvals_plan_member" ON "PlanApproval" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ClassPlan" p
  WHERE p."id" = "PlanApproval"."planId" AND public.is_active_institution_member(p."institutionId")
));
CREATE POLICY "audit_admin_read" ON "ActivityLog" FOR SELECT TO authenticated
USING (public.has_institution_role("institutionId", ARRAY['INSTITUTION_ADMIN','COORDINATOR']::"MembershipRole"[]));
