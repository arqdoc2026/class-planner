import StructuredPlanEditor from "../../../../components/planner/StructuredPlanEditor";
import { getStructuredPlan } from "../../../../lib/actions/structured-plan-actions";
import { EMPTY_STRUCTURED_CONTENT, type StructuredPlanContent } from "../../../../lib/institutional-format";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { plan } = await getStructuredPlan(id);
  return <StructuredPlanEditor initialPlan={{
    id: plan.id,
    versionNumber: plan.versionNumber,
    unitTitle: plan.unitTitle || "",
    area: plan.area || "",
    subject: plan.subject || "",
    grade: plan.grade || "",
    expectedResults: (plan.expectedResults as StructuredPlanContent["expectedResults"] | null) || EMPTY_STRUCTURED_CONTENT.expectedResults,
    evaluationEvidence: (plan.evaluationEvidence as StructuredPlanContent["evaluationEvidence"] | null) || EMPTY_STRUCTURED_CONTENT.evaluationEvidence,
    finalReflection: (plan.finalReflection as StructuredPlanContent["finalReflection"] | null) || EMPTY_STRUCTURED_CONTENT.finalReflection,
    sessions: plan.sessions.map((session) => ({
      id: session.id,
      plannedDate: session.plannedDate?.toISOString().slice(0, 10) || "",
      status: session.status,
      durationMinutes: session.durationMinutes,
      learningResults: session.learningResults || "",
      resources: session.resources || "",
      observations: session.observations || "",
      responsible: session.responsible || "",
      startActivity: session.startActivity || "",
      developmentActivity: session.developmentActivity || "",
      closingActivity: session.closingActivity || "",
      formativeAssessment: session.formativeAssessment || "",
      differentiation: session.differentiation || "",
      individualWork: session.individualWork || "",
      teamwork: session.teamwork || "",
      wholeClassInstruction: session.wholeClassInstruction || "",
      exchangeOfIdeas: session.exchangeOfIdeas || "",
      commitments: session.commitments || "",
      generatedEvidence: session.generatedEvidence || "",
      ignatianElements: session.ignatianElements,
      personalizationStrategies: session.personalizationStrategies,
      activities: session.activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        classMoment: activity.classMoment,
        estimatedMinutes: activity.estimatedMinutes,
        groupingType: activity.groupingType || "",
        resources: activity.resources || "",
        pedagogicalPurpose: activity.pedagogicalPurpose || "",
        expectedEvidence: activity.expectedEvidence || "",
        assessmentStrategy: activity.assessmentStrategy || "",
        differentiationStrategy: activity.differentiationStrategy || "",
        ignatianElements: activity.ignatianElements,
      })),
    })),
  }} />;
}
