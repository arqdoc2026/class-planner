import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionPlan, validateReviewReadiness } from "./plan-workflow.ts";

test("permite únicamente transiciones institucionales declaradas", () => {
  assert.equal(canTransitionPlan("DRAFT", "READY_FOR_REVIEW"), true);
  assert.equal(canTransitionPlan("READY_FOR_REVIEW", "IN_REVIEW"), true);
  assert.equal(canTransitionPlan("IN_REVIEW", "APPROVED"), true);
  assert.equal(canTransitionPlan("APPROVED", "DRAFT"), false);
  assert.equal(canTransitionPlan("DRAFT", "APPROVED"), false);
});

test("detecta campos obligatorios antes del envío", () => {
  const pending = validateReviewReadiness({
    unitTitle: "",
    learningObjective: "",
    sessions: [{ learningResults: "", startActivity: "", developmentActivity: "", closingActivity: "" }],
  }, ["unitTitle", "learningObjectives", "sessions", "sessionLearningResults", "sessionStart", "sessionDevelopment", "sessionClosing"]);
  assert.equal(pending.length, 6);
  assert.ok(pending.includes("Título de la unidad"));
  assert.ok(pending.includes("Cierre de la sesión 1"));
});

test("acepta una planeación mínima coherente para revisión", () => {
  const pending = validateReviewReadiness({
    unitTitle: "Ecosistemas",
    learningObjective: "Explicar relaciones ecológicas.",
    sessions: [{
      learningResults: "Identifica relaciones.",
      startActivity: "Exploración.",
      developmentActivity: "Análisis de casos.",
      closingActivity: "Reflexión.",
    }],
  });
  assert.deepEqual(pending, []);
});
