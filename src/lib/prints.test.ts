import assert from "node:assert/strict";
import { test } from "node:test";

import { formatPrintSpec, getPrintSizes } from "./prints";

void test("formats height × width and adds the one-inch border to each dimension", () => {
  assert.deepEqual(
    getPrintSizes({ imageWidthInches: 24, imageHeightInches: 36 }),
    {
      image: "36 × 24 in",
      paper: "38 × 26 in",
    },
  );
  assert.deepEqual(
    getPrintSizes({ imageWidthInches: 36, imageHeightInches: 24 }),
    {
      image: "24 × 36 in",
      paper: "26 × 38 in",
    },
  );
});

void test("supports decimal inches", () => {
  assert.deepEqual(
    getPrintSizes({ imageWidthInches: 9.5, imageHeightInches: 12.5 }),
    {
      image: "12.5 × 9.5 in",
      paper: "14.5 × 11.5 in",
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
    "Giclée print · 36 × 24 in",
  );
  assert.equal(
    formatPrintSpec({ imageWidthInches: null, imageHeightInches: null }),
    "Giclée print · size TBD",
  );
});
