import assert from "node:assert/strict";
import test from "node:test";
import { analyzePlanCoherence } from "./coherence-review.ts";

test("reporta objetivo, evidencias y cierre pendientes", () => {
  const findings = analyzePlanCoherence({
    learningObjective: "",
    performanceTask: "",
    otherEvidences: "",
    essentialQuestions: "Explica la energía",
    sessions: [{ learningResults: "", resources: "", startActivity: "Inicio", developmentActivity: "Desarrollo", closingActivity: "" }],
  });
  const codes = findings.map((item) => item.code);
  assert.ok(codes.includes("OBJECTIVE_MISSING"));
  assert.ok(codes.includes("EVIDENCE_MISSING"));
  assert.ok(codes.includes("CLOSURE_MISSING"));
  assert.ok(codes.includes("QUESTION_FORMAT"));
});

test("marca como correcta una planeación estructuralmente completa", () => {
  const findings = analyzePlanCoherence({
    learningObjective: "Analizar energía.",
    performanceTask: "Construir un modelo.",
    otherEvidences: "",
    essentialQuestions: "¿Cómo se transforma la energía?",
    sessions: [{ learningResults: "Explica transformaciones.", resources: "Materiales", startActivity: "Inicio", developmentActivity: "Desarrollo", closingActivity: "Reflexión" }],
  });
  assert.equal(findings[0].level, "CORRECT");
});
