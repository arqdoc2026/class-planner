import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "./authorization/permissions.ts";

test("un lector solo puede consultar planeaciones", () => {
  assert.equal(hasPermission("VIEWER", "plans.read"), true);
  assert.equal(hasPermission("VIEWER", "plans.edit"), false);
  assert.equal(hasPermission("VIEWER", "ai.use"), false);
});

test("un profesor no puede aprobar ni administrar miembros", () => {
  assert.equal(hasPermission("TEACHER", "plans.edit"), true);
  assert.equal(hasPermission("TEACHER", "plans.approve"), false);
  assert.equal(hasPermission("TEACHER", "members.manage"), false);
});

test("coordinación puede revisar y aprobar sin administrar la institución", () => {
  assert.equal(hasPermission("COORDINATOR", "plans.review"), true);
  assert.equal(hasPermission("COORDINATOR", "plans.approve"), true);
  assert.equal(hasPermission("COORDINATOR", "institution.manage"), false);
});

test("administración institucional dispone de todas las capacidades declaradas", () => {
  for (const permission of ["institution.manage", "members.manage", "catalog.manage", "templates.manage", "plans.create", "plans.edit", "plans.review", "plans.approve", "plans.read", "ai.use"]) {
    assert.equal(hasPermission("INSTITUTION_ADMIN", permission), true);
  }
});
