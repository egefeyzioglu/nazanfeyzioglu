import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addLine,
  cartCount,
  cartShippingCents,
  cartSubtotalCents,
  parseStoredCart,
  removeLine,
  serializeCart,
  setLineQuantity,
  type CartLine,
} from "./cart";
import {
  MAX_CART_LINES,
  MAX_PRINT_QUANTITY,
  PRINT_SHIPPING_CENTS,
} from "./orders";

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    itemType: "print",
    id: 1,
    quantity: 1,
    title: "Family",
    detail: "Giclée print · 24 × 36 in",
    image: "/design-assets/family.jpg",
    imageWidth: 1000,
    imageHeight: 1000,
    unitPriceCents: 25000,
    href: "/prints",
    ...overrides,
  };
}

void test("merges repeated adds of the same item and caps print quantity", () => {
  let lines = addLine([], line({ quantity: 4 }));
  lines = addLine(lines, line({ quantity: 4 }));
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.quantity, 8);
  lines = addLine(lines, line({ quantity: 4 }));
  assert.equal(lines[0]?.quantity, MAX_PRINT_QUANTITY);
});

void test("originals and digital editions never exceed one copy", () => {
  for (const itemType of ["original", "digital"] as const) {
    let lines = addLine([], line({ itemType, id: 7, quantity: 3 }));
    assert.equal(lines[0]?.quantity, 1);
    lines = addLine(lines, line({ itemType, id: 7 }));
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.quantity, 1);
    lines = setLineQuantity(lines, { itemType, id: 7 }, 5);
    assert.equal(lines[0]?.quantity, 1);
  }
});

void test("keeps a digital edition and the original of the same work as distinct lines", () => {
  let lines = addLine([], line({ itemType: "original", id: 7 }));
  lines = addLine(lines, line({ itemType: "digital", id: 7 }));
  assert.equal(lines.length, 2);
});

void test("refuses new lines once the cart is full but still merges existing ones", () => {
  let lines: CartLine[] = [];
  for (let id = 1; id <= MAX_CART_LINES; id++) {
    lines = addLine(lines, line({ id }));
  }
  const full = addLine(lines, line({ id: MAX_CART_LINES + 1 }));
  assert.equal(full, lines);
  const merged = addLine(lines, line({ id: 1, quantity: 2 }));
  assert.equal(merged.length, MAX_CART_LINES);
  assert.equal(merged[0]?.quantity, 3);
});

void test("setting a quantity to zero removes the line", () => {
  let lines = addLine([], line({ quantity: 2 }));
  lines = setLineQuantity(lines, { itemType: "print", id: 1 }, 0);
  assert.deepEqual(lines, []);
  lines = removeLine(addLine([], line()), { itemType: "print", id: 1 });
  assert.deepEqual(lines, []);
});

void test("totals count copies, and shipping is flat only when a print is included", () => {
  const digitalOnly = [
    line({ itemType: "digital", id: 3, unitPriceCents: 5000 }),
  ];
  assert.equal(cartShippingCents(digitalOnly), 0);
  const originalOnly = [
    line({ itemType: "original", id: 3, unitPriceCents: 190000 }),
  ];
  assert.equal(cartShippingCents(originalOnly), 0);
  const mixed = [...originalOnly, line({ quantity: 3 })];
  assert.equal(cartShippingCents(mixed), PRINT_SHIPPING_CENTS);
  assert.equal(cartCount(mixed), 4);
  assert.equal(cartSubtotalCents(mixed), 190000 + 3 * 25000);
});

void test("round-trips through storage and drops malformed carts", () => {
  const lines = [line({ quantity: 2 }), line({ itemType: "digital", id: 9 })];
  assert.deepEqual(parseStoredCart(serializeCart(lines)), lines);
  assert.deepEqual(parseStoredCart(null), []);
  assert.deepEqual(parseStoredCart("not json"), []);
  assert.deepEqual(parseStoredCart('{"lines":[{"itemType":"print"}]}'), []);
  const protocolRelativeHref = serializeCart([line({ href: "//evil" })]);
  assert.deepEqual(parseStoredCart(protocolRelativeHref), []);
});

void test("re-clamps stored quantities and merges duplicate stored lines", () => {
  const stored = serializeCart([
    line({ quantity: 50 }),
    line({ quantity: 2 }),
    line({ itemType: "original", id: 4, quantity: 3 }),
  ]);
  const lines = parseStoredCart(stored);
  assert.equal(lines.length, 2);
  assert.equal(lines[0]?.quantity, MAX_PRINT_QUANTITY);
  assert.equal(lines[1]?.quantity, 1);
});
