-- Esquema inicial reconstruido para permitir instalaciones desde una base vacía.
-- No contiene datos y usa IF NOT EXISTS para ser compatible con entornos donde
-- el MVP se creó originalmente mediante db push.
CREATE TABLE IF NOT EXISTS "TrimesterConfig" (
  "id" TEXT PRIMARY KEY,
  "grade" TEXT NOT NULL,
  "trimester" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "mainObjective" TEXT NOT NULL,
  "classDay" INTEGER NOT NULL DEFAULT 1,
  "conceptualReferences" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Template" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "formatCode" TEXT NOT NULL DEFAULT 'MGF-03-R05',
  "area" TEXT,
  "subject" TEXT,
  "grade" TEXT,
  "defaultPbl" TEXT,
  "defaultSkills" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ClassPlan" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "classDate" TIMESTAMP(3),
  "elaborationDate" TIMESTAMP(3),
  "approvalDate" TIMESTAMP(3),
  "grade" TEXT,
  "subject" TEXT,
  "unitTitle" TEXT,
  "learningObjective" TEXT,
  "essentialQuestions" TEXT,
  "pblCompetence" TEXT,
  "knowledge" TEXT,
  "skills" TEXT,
  "performanceTask" TEXT,
  "otherEvidences" TEXT,
  "rubricFileUrl" TEXT,
  "alignmentReflection" TEXT,
  "curricularAdjustments" TEXT,
  "classEvaluation" TEXT,
  "otherObservations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "ClassPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sessionNumber" INTEGER NOT NULL,
  "learningResults" TEXT,
  "resources" TEXT,
  "startActivity" TEXT,
  "developmentActivity" TEXT,
  "closingActivity" TEXT
);

CREATE TABLE IF NOT EXISTS "InstitutionalTemplate" (
  "id" TEXT PRIMARY KEY,
  "schoolName" TEXT NOT NULL DEFAULT 'COLEGIO SAN JOSÉ',
  "logoUrl" TEXT,
  "formatName" TEXT NOT NULL DEFAULT 'FORMATO DE PLANEACIÓN DE CLASES',
  "formatCode" TEXT NOT NULL DEFAULT 'MGF-03-R05',
  "version" TEXT NOT NULL DEFAULT '01',
  "processName" TEXT NOT NULL DEFAULT 'GESTIÓN ACADÉMICA Y PEDAGÓGICA',
  "defaultArea" TEXT NOT NULL DEFAULT 'Educación Física',
  "defaultSubject" TEXT NOT NULL DEFAULT 'Educación Física',
  "defaultTeacher" TEXT NOT NULL DEFAULT 'KEVIN PERALTA',
  "defaultCoordinator" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TeacherSchedule" (
  "id" TEXT PRIMARY KEY,
  "teacherName" TEXT NOT NULL UNIQUE,
  "scheduleData" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
