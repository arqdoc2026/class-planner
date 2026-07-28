export const DEFAULT_FORMAT_CONFIGURATION = {
  header: {
    fields: ["formatCode", "area", "subject", "dateFrom", "dateTo", "sessionCount", "grade", "period", "elaborationDate", "plannedSessions", "completedSessions", "version", "institution", "campus", "teachers"],
  },
  stages: [
    {
      key: "expected-results",
      name: "Etapa 1: Resultados esperados",
      fields: [
        "unitTitle", "learningObjectives", "essentialQuestions", "pblQuestions", "pblCompetence",
        "knowledge", "skills", "institutionalCompetencies", "learningResults",
        "enduringUnderstandings", "curricularStandards", "achievementIndicators",
      ],
    },
    {
      key: "assessment-evidence",
      name: "Etapa 2: Evidencias de evaluación",
      fields: [
        "performanceTask", "applicationScenario", "otherEvidence", "formativeAssessments",
        "summativeAssessments", "workSamples", "observations", "questionnaires", "tests",
        "journals", "assessmentCriteria", "assessmentInstruments", "attachments", "rubric",
      ],
    },
    {
      key: "learning-plan",
      name: "Etapa 3: Plan de aprendizaje",
      fields: ["sessions", "activities", "ignatianParadigm", "personalization"],
    },
    {
      key: "reflection",
      name: "Etapa 4: Evaluar y reflexionar",
      fields: [
        "alignment", "contentAdjustments", "instructionAdjustments", "environmentAdjustments",
        "diversityAttention", "whatWorked", "whatDidNotWork", "recommendedChanges",
        "otherObservations", "finalReflection", "preparedBy", "approvedBy", "coordinator", "approvalDate",
      ],
    },
  ],
  requiredFields: ["unitTitle", "learningObjectives", "sessions"],
  signatures: { preparedBy: true, approvedBy: true, coordinator: true },
} as const;

export type StructuredPlanContent = {
  expectedResults: {
    learningObjectives: string[];
    essentialQuestions: string[];
    pblQuestions: string[];
    pblCompetence: string;
    knowledge: string[];
    skills: string[];
    institutionalCompetencies: string[];
    learningResults: string[];
    enduringUnderstandings: string[];
    curricularStandards: string[];
    achievementIndicators: string[];
  };
  evaluationEvidence: {
    performanceTask: string;
    applicationScenario: string;
    otherEvidence: string[];
    formativeAssessments: string[];
    summativeAssessments: string[];
    workSamples: string[];
    observations: string;
    questionnaires: string[];
    tests: string[];
    journals: string[];
    assessmentCriteria: string[];
    assessmentInstruments: string[];
  };
  finalReflection: {
    alignment: string;
    contentAdjustments: string;
    instructionAdjustments: string;
    environmentAdjustments: string;
    diversityAttention: string;
    whatWorked: string;
    whatDidNotWork: string;
    recommendedChanges: string;
    otherObservations: string;
    finalReflection: string;
  };
};

export const EMPTY_STRUCTURED_CONTENT: StructuredPlanContent = {
  expectedResults: {
    learningObjectives: [], essentialQuestions: [], pblQuestions: [], pblCompetence: "",
    knowledge: [], skills: [], institutionalCompetencies: [], learningResults: [],
    enduringUnderstandings: [], curricularStandards: [], achievementIndicators: [],
  },
  evaluationEvidence: {
    performanceTask: "", applicationScenario: "", otherEvidence: [], formativeAssessments: [],
    summativeAssessments: [], workSamples: [], observations: "", questionnaires: [],
    tests: [], journals: [], assessmentCriteria: [], assessmentInstruments: [],
  },
  finalReflection: {
    alignment: "", contentAdjustments: "", instructionAdjustments: "", environmentAdjustments: "",
    diversityAttention: "", whatWorked: "", whatDidNotWork: "", recommendedChanges: "",
    otherObservations: "", finalReflection: "",
  },
};
