export type EditableSession = {
  id?: string;
  sessionNumber: number;
  learningResults: string;
  resources: string;
  startActivity: string;
  developmentActivity: string;
  closingActivity: string;
};

export type EditablePlanInput = {
  id: string;
  versionNumber: number;
  area: string;
  subject: string;
  grade: string;
  unitTitle: string;
  learningObjective: string;
  essentialQuestions: string;
  pblCompetence: string;
  knowledge: string;
  skills: string;
  performanceTask: string;
  otherEvidences: string;
  alignmentReflection: string;
  curricularAdjustments: string;
  classEvaluation: string;
  otherObservations: string;
  teacherName: string;
  coordinatorName: string;
  completedSessions: number;
  status: "DRAFT" | "IN_PROGRESS" | "CHANGES_REQUESTED" | "CORRECTED";
  sessions: EditableSession[];
};
