-- Fase 2: perfiles, roles y propiedad multiusuario.
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'TEACHER',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ClassPlan" ADD COLUMN IF NOT EXISTS "authorId" UUID;
ALTER TABLE "TrimesterConfig" ADD COLUMN IF NOT EXISTS "authorId" UUID;
ALTER TABLE "TeacherSchedule" ADD COLUMN IF NOT EXISTS "authorId" UUID;

CREATE INDEX IF NOT EXISTS "ClassPlan_authorId_idx" ON "ClassPlan"("authorId");
CREATE INDEX IF NOT EXISTS "TrimesterConfig_authorId_idx" ON "TrimesterConfig"("authorId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherSchedule_authorId_key" ON "TeacherSchedule"("authorId");

DO $$ BEGIN
  ALTER TABLE "ClassPlan" ADD CONSTRAINT "ClassPlan_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TrimesterConfig" ADD CONSTRAINT "TrimesterConfig_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherSchedule" ADD CONSTRAINT "TeacherSchedule_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Crea el perfil asociado a cada alta de Supabase Auth. El primer usuario es
-- administrador; los siguientes empiezan como docentes.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles ("id", "email", "fullName", "role", "updatedAt")
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'Docente'),
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'ADMIN'::public."UserRole" ELSE 'TEACHER'::public."UserRole" END,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("id") DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrimesterConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON "profiles" TO authenticated;

DROP POLICY IF EXISTS "profiles_read_team" ON "profiles";
CREATE POLICY "profiles_read_team" ON "profiles" FOR SELECT TO authenticated
USING (
  "id" = auth.uid() OR EXISTS (
    SELECT 1 FROM "profiles" admin
    WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE
  )
);

DROP POLICY IF EXISTS "plans_owner_or_admin" ON "ClassPlan";
CREATE POLICY "plans_owner_or_admin" ON "ClassPlan" FOR ALL TO authenticated
USING (
  "authorId" = auth.uid() OR EXISTS (
    SELECT 1 FROM "profiles" admin
    WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE
  )
)
WITH CHECK (
  "authorId" = auth.uid() OR EXISTS (
    SELECT 1 FROM "profiles" admin
    WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE
  )
);

DROP POLICY IF EXISTS "configs_owner_or_admin" ON "TrimesterConfig";
CREATE POLICY "configs_owner_or_admin" ON "TrimesterConfig" FOR ALL TO authenticated
USING ("authorId" = auth.uid() OR EXISTS (SELECT 1 FROM "profiles" admin WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE))
WITH CHECK ("authorId" = auth.uid() OR EXISTS (SELECT 1 FROM "profiles" admin WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE));

DROP POLICY IF EXISTS "schedules_owner_or_admin" ON "TeacherSchedule";
CREATE POLICY "schedules_owner_or_admin" ON "TeacherSchedule" FOR ALL TO authenticated
USING ("authorId" = auth.uid() OR EXISTS (SELECT 1 FROM "profiles" admin WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE))
WITH CHECK ("authorId" = auth.uid() OR EXISTS (SELECT 1 FROM "profiles" admin WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE));

DROP POLICY IF EXISTS "sessions_owner_or_admin" ON "Session";
CREATE POLICY "sessions_owner_or_admin" ON "Session" FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "ClassPlan" plan
    WHERE plan."id" = "Session"."planId"
      AND (plan."authorId" = auth.uid() OR EXISTS (SELECT 1 FROM "profiles" admin WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "ClassPlan" plan
    WHERE plan."id" = "Session"."planId"
      AND (plan."authorId" = auth.uid() OR EXISTS (SELECT 1 FROM "profiles" admin WHERE admin."id" = auth.uid() AND admin."role" = 'ADMIN' AND admin."active" = TRUE))
  )
);
