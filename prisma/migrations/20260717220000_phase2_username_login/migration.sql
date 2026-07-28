-- Acceso temporal por nombre de usuario, sin solicitar correo al docente.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "username" TEXT;

UPDATE "profiles"
SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9._-]', '-', 'g'))
WHERE "username" IS NULL;

ALTER TABLE "profiles" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_key" ON "profiles"("username");

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles ("id", "email", "username", "fullName", "role", "updatedAt")
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    lower(COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'username', ''), split_part(COALESCE(NEW.email, ''), '@', 1))),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.raw_user_meta_data ->> 'username', 'Docente'),
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'ADMIN'::public."UserRole" ELSE 'TEACHER'::public."UserRole" END,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("id") DO NOTHING;
  RETURN NEW;
END;
$$;
