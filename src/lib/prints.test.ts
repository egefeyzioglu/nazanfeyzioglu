import assert from "node:assert/strict";
import { test } from "node:test";

import { formatPrintSpec, getPrintSizes } from "./prints";

void test("adds the two-inch border to both sides of each image dimension", () => {
  assert.deepEqual(
    getPrintSizes({ imageWidthInches: 24, imageHeightInches: 36 }),
    {
      image: "24 × 36 in",
      paper: "28 × 40 in",
    },
  );
  assert.deepEqual(
    getPrintSizes({ imageWidthInches: 36, imageHeightInches: 24 }),
    {
      image: "36 × 24 in",
      paper: "40 × 28 in",
    },
  );
});

void test("supports decimal inches", () => {
  assert.deepEqual(
    getPrintSizes({ imageWidthInches: 9.5, imageHeightInches: 12.5 }),
    {
      image: "9.5 × 12.5 in",
      paper: "13.5 × 16.5 in",
    },
  );
});

void test("does not invent dimensions for unknown or invalid values", () => {
  for (const value of [null, 0, -24, Infinity, NaN]) {
    assert.equal(
      getPrintSizes({ imageWidthInches: value, imageHeightInches: 36 }),
      null,
    );
    assert.equal(
      getPrintSizes({ imageWidthInches: 24, imageHeightInches: value }),
      null,
    );
  }
});

void test("generates the description from dimensions and handles unknown sizes", () => {
  assert.equal(
    formatPrintSpec({ imageWidthInches: 24, imageHeightInches: 36 }),
    "Giclée print · 24 × 36 in",
  );
  assert.equal(
    formatPrintSpec({ imageWidthInches: null, imageHeightInches: null }),
    "Giclée print · size TBD",
  );
});
