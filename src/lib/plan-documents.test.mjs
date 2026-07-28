import assert from "node:assert/strict";
import test from "node:test";
import { groupSessionsIntoDocuments } from "./plan-documents.ts";

test("divide doce sesiones en seis documentos de dos", () => {
  const sessions = Array.from({ length: 12 }, (_, index) => index + 1);
  const documents = groupSessionsIntoDocuments(sessions);

  assert.equal(documents.length, 6);
  assert.deepEqual(documents[0], [1, 2]);
  assert.deepEqual(documents[5], [11, 12]);
  assert.deepEqual(documents.flat(), sessions);
});

test("conserva una última sesión impar en su propio documento", () => {
  const sessions = Array.from({ length: 13 }, (_, index) => index + 1);
  const documents = groupSessionsIntoDocuments(sessions);

  assert.equal(documents.length, 7);
  assert.deepEqual(documents[6], [13]);
});

test("rechaza tamaños de documento inválidos", () => {
  assert.throws(() => groupSessionsIntoDocuments([1, 2], 0));
});
