import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

/** Values built inside the VM have a foreign Object prototype; compare their plain shape. */
const plain = (value) => JSON.parse(JSON.stringify(value));

// Exercise the real route handlers with in-memory database and Stripe
// boundaries. These tests do not simulate PostgreSQL locking or contact
// payment services.
function load(path, dependencies = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  vm.runInNewContext(outputText, {
    exports,
    console,
    URL,
    crypto,
    require: (id) =>
      Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
  });
  return exports;
}

/** Column reference, so predicates can tell a join from a literal comparison. */
const ref = (table, column) => ({ table, column });
const isRef = (value) =>
  typeof value === "object" && value !== null && "table" in value;

function makeTable(name, columns) {
  return Object.fromEntries([
    ["__table", name],
    ...columns.map((column) => [column, ref(name, column)]),
  ]);
}

function setup() {
  const state = {
    orders: [],
    orderItems: [],
    prints: [
      {
        id: 1,
        title: "Print",
        spec: "Giclee",
        imageWidthInches: 24,
        imageHeightInches: 18,
        edition: "Limited",
        image: "/art.jpg",
        priceCents: 10000,
        editionSize: 3,
      },
      {
        id: 2,
        title: "Open print",
        spec: "Giclee",
        imageWidthInches: 10,
        imageHeightInches: 10,
        edition: "Open",
        image: "/art2.jpg",
        priceCents: 5000,
        editionSize: null,
      },
    ],
    works: [
      {
        id: 1,
        title: "Painting",
        medium: "Acrylic",
        image: "/art.jpg",
        digital: false,
        originalPriceCents: 190000,
        originalUnavailable: false,
        digitalPriceCents: 5000,
      },
      {
        id: 2,
        title: "Digital work",
        medium: "Acrylic",
        image: "/art3.jpg",
        digital: true,
        originalPriceCents: null,
        originalUnavailable: false,
        digitalPriceCents: 7000,
      },
    ],
    /** Stripe sessions by id: the create params plus derived line items. */
    stripeSessions: new Map(),
    createParams: [],
    locks: [],
    analytics: [],
    event: null,
  };

  const schema = {
    orders: makeTable("orders", [
      "id",
      "stripeCheckoutSessionId",
      "stripePaymentIntentId",
      "paymentStatus",
      "fulfillmentStatus",
    ]),
    orderItems: makeTable("orderItems", [
      "id",
      "orderId",
      "itemType",
      "printId",
      "workId",
      "quantity",
    ]),
    prints: makeTable("prints", ["id", "title", "editionSize"]),
    works: makeTable("works", ["id", "title"]),
  };
  const rowsOf = (table) => state[table.__table];

  // Predicates run against a context of { tableName: row } so joins work.
  const read = (ctx, value) =>
    isRef(value) ? ctx[value.table][value.column] : value;
  const orm = {
    eq: (a, b) => (ctx) => read(ctx, a) === read(ctx, b),
    ne: (a, b) => (ctx) => read(ctx, a) !== read(ctx, b),
    inArray: (a, values) => (ctx) => values.includes(read(ctx, a)),
    and:
      (...conditions) =>
      (ctx) =>
        conditions.every((condition) => condition(ctx)),
    sql: Object.assign((strings, ...values) => ({ strings, values }), {
      join: () => ({}),
    }),
  };

  function project(projection, rows) {
    return Object.fromEntries(
      Object.entries(projection).map(([key, field]) => {
        if (isRef(field)) return [key, read(rows[0], field)];
        // Only aggregate used: sum(<column>)::int, possibly coalesced.
        const column = field.values.find(isRef);
        return [key, rows.reduce((n, ctx) => n + read(ctx, column), 0)];
      }),
    );
  }

  function select(projection) {
    const query = {
      _rows: [],
      _group: null,
      from(table) {
        query._rows = rowsOf(table).map((row) => ({ [table.__table]: row }));
        return query;
      },
      innerJoin(table, predicate) {
        query._rows = query._rows.flatMap((ctx) =>
          rowsOf(table)
            .map((row) => ({ ...ctx, [table.__table]: row }))
            .filter(predicate),
        );
        return query;
      },
      where(predicate) {
        query._rows = query._rows.filter(predicate);
        return query;
      },
      groupBy(field) {
        query._group = field;
        return query;
      },
      then(resolve, reject) {
        try {
          const aggregate = Object.values(projection).some((f) => !isRef(f));
          let result;
          if (query._group) {
            const groups = new Map();
            for (const ctx of query._rows) {
              const key = read(ctx, query._group);
              groups.set(key, [...(groups.get(key) ?? []), ctx]);
            }
            result = [...groups.values()].map((rows) =>
              project(projection, rows),
            );
          } else if (aggregate) {
            result = [project(projection, query._rows)];
          } else {
            result = query._rows.map((ctx) => project(projection, [ctx]));
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
    };
    return query;
  }

  const db = {
    query: {
      prints: {
        findMany: async ({ where }) =>
          state.prints.filter((row) =>
            where(schema.prints, orm)({ prints: row }),
          ),
      },
      works: {
        findMany: async ({ where }) =>
          state.works.filter((row) => where(schema.works, orm)({ works: row })),
      },
    },
    select,
    transaction: async (callback) => callback(db),
    execute: async (statement) => {
      state.locks.push(statement);
    },
    insert: (table) => ({
      values: (values) => {
        const insertAll = (list) =>
          list.map((entry) => {
            const rows = rowsOf(table);
            const row = { id: rows.length + 1, ...entry };
            rows.push(row);
            return row;
          });
        return {
          // Awaited directly for line inserts.
          then: (resolve) => resolve(insertAll([].concat(values))),
          onConflictDoNothing: () => ({
            returning: async () => {
              if (
                state.orders.some(
                  (row) =>
                    row.stripeCheckoutSessionId ===
                    values.stripeCheckoutSessionId,
                )
              )
                return [];
              const [row] = insertAll([
                {
                  paymentStatus: "paid",
                  fulfillmentStatus: "pending",
                  ...values,
                },
              ]);
              return [{ id: row.id }];
            },
          }),
        };
      },
    }),
    update: (table) => ({
      set: (values) => ({
        where: (predicate) => {
          const matched = rowsOf(table).filter((row) =>
            predicate({ [table.__table]: row }),
          );
          matched.forEach((row) => Object.assign(row, values));
          const result = Promise.resolve();
          result.returning = async (projection) =>
            matched.map((row) =>
              project(projection, [{ [table.__table]: row }]),
            );
          return result;
        },
      }),
    }),
  };

  /** Builds what Stripe would return for a session created from `params`. */
  function stripeSession(id, params) {
    const lineItems = params.line_items.map((line, index) => ({
      id: `li_${id}_${index}`,
      quantity: line.quantity,
      description: line.price_data.product_data.name,
      amount_subtotal: line.quantity * line.price_data.unit_amount,
      amount_total: line.quantity * line.price_data.unit_amount,
      price: {
        unit_amount: line.price_data.unit_amount,
        product: {
          id: `prod_${id}_${index}`,
          metadata: { ...line.price_data.product_data.metadata },
        },
      },
    }));
    const subtotal = lineItems.reduce((n, l) => n + l.amount_total, 0);
    const shipping =
      params.shipping_options?.[0]?.shipping_rate_data.fixed_amount.amount ?? 0;
    return {
      session: {
        id,
        metadata: { ...params.metadata },
        payment_intent: `pi_${id}`,
        currency: "cad",
        amount_subtotal: subtotal,
        amount_total: subtotal + shipping,
        shipping_cost: params.shipping_options
          ? { amount_total: shipping }
          : null,
        customer_details: { email: "buyer@example.com", name: "Buyer" },
        collected_information: params.shipping_address_collection
          ? {
              shipping_details: {
                name: "Buyer",
                address: { country: "CA", line1: "123 Test St" },
              },
            }
          : null,
      },
      lineItems,
    };
  }

  const stripe = {
    checkout: {
      sessions: {
        create: async (params) => {
          state.createParams.push(params);
          const id = `cs_${state.createParams.length}`;
          state.stripeSessions.set(id, stripeSession(id, params));
          return { id, url: "https://checkout.stripe.com/test" };
        },
        retrieve: async (id) => state.stripeSessions.get(id).session,
        listLineItems: (id) => ({
          autoPagingToArray: async () => state.stripeSessions.get(id).lineItems,
        }),
      },
    },
    webhooks: { constructEvent: () => state.event },
  };

  const orders = load("src/lib/orders.ts");
  const dependencies = {
    "server-only": {},
    "drizzle-orm": orm,
    "next/server": {
      NextResponse: {
        json: (body, options) => ({ body, status: options?.status ?? 200 }),
      },
    },
    "src/env": { env: { NODE_ENV: "test", STRIPE_WEBHOOK_SECRET: "test" } },
    "./orders": orders,
    "src/lib/orders": orders,
    "src/lib/prints": load("src/lib/prints.ts"),
    "src/server/db": { db },
    "src/server/db/schema": schema,
    "src/server/stripe": {
      getStripe: () => stripe,
      stripeConfigured: () => true,
    },
    "src/lib/posthog-server": {
      captureServerEvent: (distinctId, event, properties) => {
        state.analytics.push({ distinctId, event, properties });
      },
      captureServerException: () => {},
    },
  };
  dependencies["src/lib/cart"] = load("src/lib/cart.ts", dependencies);
  dependencies["src/lib/checkout-metadata"] = load(
    "src/lib/checkout-metadata.ts",
    dependencies,
  );
  dependencies["src/server/orders"] = load(
    "src/server/orders.ts",
    dependencies,
  );
  dependencies["src/server/checkout-lines"] = load(
    "src/server/checkout-lines.ts",
    dependencies,
  );
  const checkout = load("src/app/api/checkout/route.ts", dependencies);
  const webhook = load("src/app/api/stripe/webhook/route.ts", dependencies);

  const deliver = (event) => {
    state.event = event;
    return webhook.POST({
      headers: new Headers({ "stripe-signature": "test" }),
      text: async () => "test",
    });
  };

  return {
    state,
    inventory: dependencies["src/server/orders"],
    lines: dependencies["src/server/checkout-lines"],
    checkout: (items, extra = {}) =>
      checkout.POST({
        url: "http://localhost:3000/api/checkout",
        headers: new Headers({ "x-posthog-distinct-id": "visitor_1" }),
        json: async () => ({ items, ...extra }),
      }),
    /** Creates a session for `items` and delivers its paid webhook. */
    buy: async (items) => {
      const res = await checkout.POST({
        url: "http://localhost:3000/api/checkout",
        headers: new Headers({ "x-posthog-distinct-id": "visitor_1" }),
        json: async () => ({ items }),
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const id = `cs_${state.createParams.length}`;
      return { id, res: await deliver(paidEvent(id)) };
    },
    pay: (id) => deliver(paidEvent(id)),
    refund: (id, amount) =>
      deliver({
        id: `evt_refund_${id}_${amount}`,
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: `pi_${id}`,
            amount: 190000,
            amount_refunded: amount,
            currency: "cad",
          },
        },
      }),
  };
}

const paidEvent = (id) => ({
  id: `evt_${id}`,
  type: "checkout.session.completed",
  data: { object: { id, payment_status: "paid" } },
});

const PRINT = { itemType: "print", id: 1, quantity: 2 };
const ORIGINAL = { itemType: "original", id: 1, quantity: 1 };
const DIGITAL = { itemType: "digital", id: 2, quantity: 1 };

test("a mixed cart becomes one session with fixed quantities, DB prices and flat print shipping", async () => {
  const app = setup();
  const res = await app.checkout([
    { ...PRINT, price: 1 },
    { ...ORIGINAL, unitPriceCents: 1 },
  ]);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const params = app.state.createParams[0];
  assert.equal(params.line_items.length, 2);
  const [print, original] = params.line_items;
  assert.equal(print.quantity, 2);
  assert.equal(print.adjustable_quantity, undefined);
  assert.equal(print.price_data.unit_amount, 10000);
  assert.match(print.price_data.product_data.description, /24 .* 18 in/);
  assert.deepEqual(plain(print.price_data.product_data.metadata), {
    itemType: "print",
    itemId: "1",
  });
  assert.equal(original.quantity, 1);
  assert.equal(original.price_data.unit_amount, 190000);
  assert.equal(params.metadata.cart, "1");
  assert.equal(params.metadata.items, "print:1:2,original:1:1");
  assert.equal(params.metadata.posthogDistinctId, "visitor_1");
  assert.equal(
    params.shipping_options[0].shipping_rate_data.fixed_amount.amount,
    3000,
  );
  assert.equal(
    params.shipping_address_collection.allowed_countries.join(),
    "CA",
  );
  assert.equal(params.cancel_url, "http://localhost:3000/cart");
});

test("originals ship free and digital-only carts collect no address", async () => {
  const app = setup();
  await app.checkout([ORIGINAL]);
  const originals = app.state.createParams[0];
  assert.equal(
    originals.shipping_options[0].shipping_rate_data.fixed_amount.amount,
    0,
  );
  assert.equal(
    originals.shipping_address_collection.allowed_countries.join(),
    "CA",
  );
  await app.checkout([DIGITAL]);
  const digital = app.state.createParams[1];
  assert.equal(digital.shipping_options, undefined);
  assert.equal(digital.shipping_address_collection, undefined);
});

test("malformed carts are rejected before touching Stripe", async () => {
  const app = setup();
  assert.equal((await app.checkout([])).status, 400);
  assert.equal((await app.checkout([PRINT, PRINT])).status, 400);
  assert.equal((await app.checkout([{ ...PRINT, quantity: 0 }])).status, 400);
  assert.equal(
    (await app.checkout([ORIGINAL], { cancelPath: "//evil.example" })).status,
    400,
  );
  const tooMany = Array.from({ length: 21 }, (_, i) => ({
    itemType: "print",
    id: i + 1,
    quantity: 1,
  }));
  assert.equal((await app.checkout(tooMany)).status, 400);
  assert.equal(app.state.createParams.length, 0);
});

test("unavailable lines and excess quantities come back so the cart can fix itself", async () => {
  const app = setup();
  const res = await app.checkout([
    { itemType: "print", id: 1, quantity: 5 },
    { itemType: "print", id: 99, quantity: 1 },
    { itemType: "original", id: 2, quantity: 1 },
    { itemType: "digital", id: 1, quantity: 1 },
    { itemType: "original", id: 1, quantity: 2 },
  ]);
  assert.equal(res.status, 409);
  assert.deepEqual(plain(res.body.adjustments), [
    { itemType: "print", id: 1, quantity: 3 },
    { itemType: "original", id: 1, quantity: 1 },
  ]);
  assert.deepEqual(plain(res.body.unavailable), [
    { itemType: "print", id: 99 },
    { itemType: "original", id: 2 },
    { itemType: "digital", id: 1 },
  ]);
  assert.match(res.body.error, /Only 3 copies of Print/);
  assert.equal(app.state.createParams.length, 0);

  for (const override of [
    { originalPriceCents: null },
    { digital: true },
    { originalUnavailable: true },
  ]) {
    const variant = setup();
    Object.assign(variant.state.works[0], override);
    assert.equal((await variant.checkout([ORIGINAL])).status, 409);
  }
  const unpriced = setup();
  unpriced.state.prints[0].priceCents = null;
  assert.equal((await unpriced.checkout([PRINT])).status, 409);
});

test("open editions are capped per checkout; limited editions by what is left", async () => {
  const app = setup();
  const open = await app.checkout([{ itemType: "print", id: 2, quantity: 11 }]);
  assert.equal(open.status, 409);
  assert.deepEqual(plain(open.body.adjustments), [
    { itemType: "print", id: 2, quantity: 10 },
  ]);
  await app.buy([PRINT]);
  const left = await app.checkout([PRINT]);
  assert.equal(left.status, 409);
  assert.deepEqual(plain(left.body.adjustments), [
    { itemType: "print", id: 1, quantity: 1 },
  ]);
  await app.buy([{ ...PRINT, quantity: 1 }]);
  const soldOut = await app.checkout([{ ...PRINT, quantity: 1 }]);
  assert.equal(soldOut.status, 409);
  assert.deepEqual(plain(soldOut.body.unavailable), [
    { itemType: "print", id: 1 },
  ]);
});

test("a paid mixed cart is recorded once as one order with a line per item", async () => {
  const app = setup();
  const { id, res } = await app.buy([PRINT, ORIGINAL, DIGITAL]);
  assert.equal(res.status, 200);
  await app.pay(id);
  assert.equal(app.state.orders.length, 1);
  const order = app.state.orders[0];
  assert.equal(order.stripeCheckoutSessionId, id);
  assert.equal(order.amountSubtotal, 20000 + 190000 + 7000);
  assert.equal(order.amountShipping, 3000);
  assert.equal(order.amountTotal, 20000 + 190000 + 7000 + 3000);
  assert.equal(order.fulfillmentStatus, "pending");
  assert.equal(order.customerEmail, "buyer@example.com");
  assert.equal(order.shippingAddress.address.country, "CA");
  assert.deepEqual(
    app.state.orderItems.map((i) => [
      i.itemType,
      i.printId,
      i.workId,
      i.quantity,
      i.amountTotal,
    ]),
    [
      ["print", 1, null, 2, 20000],
      ["original", null, 1, 1, 190000],
      ["digital", null, 2, 1, 7000],
    ],
  );
  assert.deepEqual(
    app.state.locks.map((lock) => lock.values),
    [
      ["nazanfeyzioglu_original", 1],
      ["nazanfeyzioglu_print", 1],
    ],
  );
});

test("concurrent buyers past the availability check are flagged oversold", async () => {
  const app = setup();
  // Both sessions were created before either paid.
  const first = await app.checkout([ORIGINAL]);
  const second = await app.checkout([ORIGINAL, DIGITAL]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  await app.pay("cs_1");
  await app.pay("cs_2");
  assert.equal(app.state.orders[0].fulfillmentStatus, "pending");
  assert.equal(app.state.orders[1].fulfillmentStatus, "oversold");
  assert.equal((await app.checkout([ORIGINAL])).status, 409);
});

test("legacy single-item sessions and deleted products are still recorded", async () => {
  const app = setup();
  app.state.stripeSessions.set("cs_legacy", {
    session: {
      id: "cs_legacy",
      metadata: { itemType: "original", itemId: "1" },
      payment_intent: "pi_cs_legacy",
      currency: "cad",
      amount_subtotal: 190000,
      amount_total: 190000,
      customer_details: { email: "buyer@example.com", name: "Buyer" },
    },
    lineItems: [
      {
        id: "li_legacy",
        quantity: 1,
        description: "Painting — original",
        amount_subtotal: 190000,
        amount_total: 190000,
        price: { unit_amount: 190000, product: "prod_deleted" },
      },
    ],
  });
  assert.equal((await app.pay("cs_legacy")).status, 200);
  assert.deepEqual(
    app.state.orderItems.map((i) => [i.itemType, i.workId]),
    [["original", 1]],
  );

  // A cart session whose ad hoc Product was deleted before the webhook ran
  // falls back to the session's own item list.
  await app.checkout([PRINT, DIGITAL]);
  const stored = app.state.stripeSessions.get("cs_1");
  stored.lineItems[0].price.product = { id: "prod_gone", deleted: true };
  assert.equal((await app.pay("cs_1")).status, 200);
  assert.deepEqual(
    app.state.orderItems.slice(1).map((i) => [i.itemType, i.printId, i.workId]),
    [
      ["print", 1, null],
      ["digital", null, 2],
    ],
  );
});

test("unidentifiable cart lines fail the webhook so Stripe retries; foreign sessions are ignored", async () => {
  const app = setup();
  await app.checkout([PRINT]);
  const stored = app.state.stripeSessions.get("cs_1");
  stored.lineItems[0].price.product = { id: "prod_gone", deleted: true };
  delete stored.session.metadata.items;
  await assert.rejects(app.pay("cs_1"), app.lines.UnidentifiedLineItemError);
  assert.equal(app.state.orders.length, 0);

  app.state.stripeSessions.set("cs_foreign", {
    session: { id: "cs_foreign", metadata: {}, currency: "cad" },
    lineItems: [
      { id: "li_x", quantity: 1, amount_subtotal: 1, amount_total: 1 },
    ],
  });
  assert.equal((await app.pay("cs_foreign")).status, 200);
  assert.equal(app.state.orders.length, 0);
});

test("digital sales never consume original stock; only full refunds restore it", async () => {
  const app = setup();
  await app.buy([DIGITAL]);
  assert.equal((await app.inventory.getSoldOriginalIds([1])).size, 0);
  const { id } = await app.buy([ORIGINAL]);
  assert.equal((await app.inventory.getSoldOriginalIds([1])).has(1), true);
  await app.refund(id, 100);
  assert.equal(app.state.orders[1].paymentStatus, "paid");
  assert.equal((await app.inventory.getSoldOriginalIds([1])).has(1), true);
  await app.refund(id, 190000);
  assert.equal(app.state.orders[1].paymentStatus, "refunded");
  assert.equal((await app.inventory.getSoldOriginalIds([1])).size, 0);
  assert.equal((await app.checkout([ORIGINAL])).status, 200);
  app.state.works[0].originalUnavailable = true;
  assert.equal((await app.checkout([ORIGINAL])).status, 409);
});

test("refunded print quantities free up the edition", async () => {
  const app = setup();
  const { id } = await app.buy([PRINT]);
  assert.deepEqual(
    plain([...(await app.inventory.getSoldPrintQuantities([1, 2]))]),
    [[1, 2]],
  );
  await app.refund(id, 190000);
  assert.equal((await app.inventory.getSoldPrintQuantities([1])).size, 0);
});

test("fully refunded orders no longer read as pending in the admin", async () => {
  const app = setup();
  const { effectiveFulfillment } = load("src/lib/orders.ts");
  const { id } = await app.buy([ORIGINAL]);
  const order = app.state.orders[0];
  assert.equal(effectiveFulfillment(order), "pending");
  await app.refund(id, 100);
  assert.equal(effectiveFulfillment(order), "pending");
  await app.refund(id, 190000);
  assert.equal(effectiveFulfillment(order), "no_action");
  assert.equal(
    effectiveFulfillment({
      paymentStatus: "refunded",
      fulfillmentStatus: "oversold",
    }),
    "no_action",
  );
  assert.equal(
    effectiveFulfillment({
      paymentStatus: "refunded",
      fulfillmentStatus: "fulfilled",
    }),
    "fulfilled",
  );
});

test("checkout funnel events describe the whole cart and follow the buyer's PostHog id", async () => {
  const app = setup();
  const { id } = await app.buy([PRINT, ORIGINAL]);
  await app.refund(id, 190000);
  const events = app.state.analytics.map((e) => [e.distinctId, e.event]);
  assert.deepEqual(events, [
    ["visitor_1", "checkout_session_created"],
    ["visitor_1", "checkout_completed"],
    [`order:${app.state.orders[0].id}`, "order_refunded"],
  ]);
  const [created, completed, refunded] = app.state.analytics.map(
    (e) => e.properties,
  );
  assert.deepEqual(plain(created.items), [
    { item_type: "print", item_id: 1, quantity: 2 },
    { item_type: "original", item_id: 1, quantity: 1 },
  ]);
  assert.equal(created.line_count, 2);
  assert.equal(created.unit_count, 3);
  assert.deepEqual(plain(completed.item_types), ["print", "original"]);
  assert.equal(completed.amount, 20000 + 190000 + 3000);
  assert.equal(completed.$insert_id, id);
  assert.deepEqual(plain(refunded.item_types), ["print", "original"]);
});
