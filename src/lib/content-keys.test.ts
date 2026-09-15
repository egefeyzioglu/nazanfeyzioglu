import assert from "node:assert/strict";
import { test } from "node:test";

import { CONTENT_FIELDS, paragraphs, POLICY_FIELDS } from "./content-keys";

void test("content keys are unique", () => {
  const keys = CONTENT_FIELDS.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
});

void test("policy copy is editable and covers shipping, returns and damaged orders", () => {
  const keys = new Set(CONTENT_FIELDS.map((f) => f.key));
  for (const field of POLICY_FIELDS) {
    assert.ok(keys.has(field.key), `${field.key} missing from CONTENT_FIELDS`);
    assert.equal(field.group, "Policies");
    assert.ok(field.default.trim().length > 0, `${field.key} has empty copy`);
  }
  for (const key of [
    "policies.shipping.prints",
    "policies.returns.body",
    "policies.damaged.checklist",
    "policies.important.body",
    "nav.policies",
    "prints.modal.policiesLink",
  ]) {
    assert.ok(keys.has(key), `${key} is not an editable field`);
  }
});

void test("the damaged-order checklist stores one item per paragraph", () => {
  const checklist = POLICY_FIELDS.find(
    (f) => f.key === "policies.damaged.checklist",
  );
  assert.ok(checklist);
  assert.equal(paragraphs(checklist.default).length, 4);
});
