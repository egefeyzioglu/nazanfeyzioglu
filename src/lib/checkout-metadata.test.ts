import assert from "node:assert/strict";
import { test } from "node:test";

import { decodeCheckoutItems, encodeCheckoutItems } from "./checkout-metadata";
import { MAX_CART_LINES } from "./orders";

void test("round-trips items in order", () => {
  const items = [
    { itemType: "print" as const, id: 5, quantity: 2 },
    { itemType: "original" as const, id: 7, quantity: 1 },
    { itemType: "digital" as const, id: 7, quantity: 1 },
  ];
  assert.deepEqual(decodeCheckoutItems(encodeCheckoutItems(items)), items);
});

void test("the largest cart fits Stripe's 500-character metadata limit", () => {
  const items = Array.from({ length: MAX_CART_LINES }, () => ({
    itemType: "original" as const,
    id: 2147483647,
    quantity: 10,
  }));
  assert.ok(encodeCheckoutItems(items).length <= 500);
});

void test("rejects missing or malformed values", () => {
  assert.equal(decodeCheckoutItems(undefined), null);
  assert.equal(decodeCheckoutItems(""), null);
  assert.equal(decodeCheckoutItems("print:5"), null);
  assert.equal(decodeCheckoutItems("poster:5:1"), null);
  assert.equal(decodeCheckoutItems("print:0:1"), null);
  assert.equal(decodeCheckoutItems("print:5:0"), null);
  assert.equal(decodeCheckoutItems("print:5:1,"), null);
});
