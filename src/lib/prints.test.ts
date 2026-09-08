import assert from "node:assert/strict";
import { test } from "node:test";

import { getPrintSizes } from "./prints";

void test("adds the two-inch border to both sides of each image dimension", () => {
  assert.deepEqual(getPrintSizes("Giclée print · 24 × 36 in"), {
    image: "24 × 36 in",
    paper: "28 × 40 in",
  });
  assert.deepEqual(getPrintSizes("Giclée print · 36 × 24 in"), {
    image: "36 × 24 in",
    paper: "40 × 28 in",
  });
});

void test("supports decimal inches and an ASCII dimension separator", () => {
  assert.deepEqual(getPrintSizes("9.5 x 12.5 in"), {
    image: "9.5 × 12.5 in",
    paper: "13.5 × 16.5 in",
  });
});

void test("does not invent dimensions for unknown, invalid, or non-inch sizes", () => {
  for (const spec of [
    "Giclée print · size TBD",
    "",
    "Giclée print · 24 × 36 cm",
    "Giclée print · -24 × 36 in",
    "Giclée print · 0 × 36 in",
    "Giclée print · 1/2 × 36 in",
  ]) {
    assert.equal(getPrintSizes(spec), null, spec);
  }
});
