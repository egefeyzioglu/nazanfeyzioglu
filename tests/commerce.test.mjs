import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
// Exercise the real route handlers with in-memory database and Stripe boundaries.
// These tests do not simulate PostgreSQL locking or contact payment services.
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
    Error,
    URL,
    require: (id) =>
      Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
  });
  return exports;
}

function setup() {
  const state = {
    rows: [],
    sessions: [],
    locks: [],
    reports: [],
    event: null,
    session: null,
    retrieveSession: async () => state.session,
    work: {
      id: 1,
      title: "Painting",
      medium: "Acrylic",
      image: "/art.jpg",
      digital: false,
      originalPriceCents: 190000,
      originalUnavailable: false,
      digitalPriceCents: 5000,
    },
    print: {
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
  };
  const fields = (names) =>
    Object.fromEntries(names.map((name) => [name, name]));
  const schema = {
    orders: fields([
      "id",
      "workId",
      "printId",
      "itemType",
      "quantity",
      "paymentStatus",
      "stripeCheckoutSessionId",
      "stripePaymentIntentId",
    ]),
    works: fields(["id", "title"]),
    prints: fields(["id", "title", "editionSize"]),
  };
  const orm = {
    eq: (key, value) => (row) => row[key] === value,
    ne: (key, value) => (row) => row[key] !== value,
    inArray: (key, values) => (row) => values.includes(row[key]),
    and:
      (...conditions) =>
      (row) =>
        conditions.every((condition) => condition(row)),
    sql: (strings, ...values) => ({ strings, values }),
  };
  const db = {
    query: {
      works: { findFirst: async () => state.work },
      prints: { findFirst: async () => state.print },
    },
    select: (projection) => ({
      from: (table) => ({
        where: (predicate) => {
          const rows =
            table === schema.orders
              ? state.rows.filter(predicate)
              : [table === schema.works ? state.work : state.print]
                  .filter(Boolean)
                  .filter(predicate);
          if (projection.sold)
            return Promise.resolve([
              { sold: rows.reduce((n, row) => n + row.quantity, 0) },
            ]);
          return Promise.resolve(
            rows.map((row) =>
              Object.fromEntries(
                Object.entries(projection).map(([key, field]) => [
                  key,
                  row[field],
                ]),
              ),
            ),
          );
        },
      }),
    }),
    transaction: async (callback) => callback(db),
    execute: async (statement) => {
      state.locks.push(statement);
    },
    insert: () => ({
      values: (values) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (
              state.rows.some(
                (row) =>
                  row.stripeCheckoutSessionId ===
                  values.stripeCheckoutSessionId,
              )
            )
              return [];
            const row = {
              id: state.rows.length + 1,
              paymentStatus: "paid",
              fulfillmentStatus: "pending",
              ...values,
            };
            state.rows.push(row);
            return [{ id: row.id }];
          },
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: (predicate) => {
          const rows = state.rows.filter(predicate);
          rows.forEach((row) => Object.assign(row, values));
          return {
            returning: async () => rows.map((row) => ({ id: row.id })),
            then: (resolve, reject) =>
              Promise.resolve(undefined).then(resolve, reject),
          };
        },
      }),
    }),
  };
  const stripe = {
    checkout: {
      sessions: {
        create: async (params) => {
          state.sessions.push(params);
          return { url: "https://checkout.stripe.com/test" };
        },
        retrieve: async () => state.retrieveSession(),
      },
    },
    webhooks: { constructEvent: () => state.event },
  };
  const dependencies = {
    "server-only": {},
    "drizzle-orm": orm,
    "next/server": {
      NextResponse: {
        json: (body, options) => ({ body, status: options?.status ?? 200 }),
      },
    },
    "src/env": {
      env: {
        NODE_ENV: "test",
        STRIPE_WEBHOOK_SECRET: "test",
        STRIPE_SHIPPING_RATE_ID: "legacy",
      },
    },
    "src/lib/orders": load("src/lib/orders.ts"),
    "src/lib/prints": load("src/lib/prints.ts"),
    "src/server/db": { db },
    "src/server/db/schema": schema,
    "src/server/observability": {
      deploymentEnvironment: () => "development",
      reportWebhookFailure: (err, ctx, level = "error") =>
        state.reports.push({
          message: err instanceof Error ? err.message : String(err),
          level,
          ...ctx,
        }),
    },
    "src/server/stripe": {
      getStripe: () => stripe,
      stripeConfigured: () => true,
    },
  };
  const inventory = load("src/server/orders.ts", dependencies);
  dependencies["src/server/orders"] = {
    ...inventory,
    getSoldPrintQuantities: async () => new Map(),
  };
  const checkout = load("src/app/api/checkout/route.ts", dependencies);
  const webhook = load("src/app/api/stripe/webhook/route.ts", dependencies);
  return {
    state,
    inventory,
    checkout: (itemType, extra = {}) =>
      checkout.POST({
        url: "http://localhost:3000/api/checkout",
        json: async () => ({ itemType, id: 1, ...extra }),
      }),
    pay: async (itemType, id = "cs_1", sessionOverrides = {}) => {
      state.session = {
        id,
        metadata: { itemType, itemId: "1" },
        payment_intent: `pi_${id}`,
        currency: "cad",
        amount_total: 190000,
        amount_subtotal: 190000,
        line_items: { data: [{ quantity: 1, price: { unit_amount: 190000 } }] },
        customer_details: { email: "buyer@example.com", name: "Buyer" },
        collected_information: {
          shipping_details: {
            name: "Buyer",
            address: { country: "CA", line1: "123 Test St" },
          },
        },
        ...sessionOverrides,
      };
      state.event = {
        id: `evt_${id}`,
        livemode: false,
        type: "checkout.session.completed",
        data: { object: { id, payment_status: "paid" } },
      };
      return webhook.POST({
        headers: new Headers({ "stripe-signature": "test" }),
        text: async () => "test",
      });
    },
    refund: async (id, amount) => {
      state.event = {
        id: `evt_refund_${id}`,
        livemode: false,
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: `pi_${id}`,
            amount: 190000,
            amount_refunded: amount,
          },
        },
      };
      return webhook.POST({
        headers: new Headers({ "stripe-signature": "test" }),
        text: async () => "test",
      });
    },
  };
}

test("original checkout uses stored price, quantity one and free Canadian shipping", async () => {
  const app = setup();
  assert.equal(
    (await app.checkout("original", { quantity: 10, price: 1 })).status,
    200,
  );
  const params = app.state.sessions[0];
  assert.equal(params.line_items[0].quantity, 1);
  assert.equal(params.line_items[0].adjustable_quantity, undefined);
  assert.equal(params.line_items[0].price_data.unit_amount, 190000);
  assert.equal(params.metadata.itemType, "original");
  assert.equal(
    params.shipping_options[0].shipping_rate_data.fixed_amount.amount,
    0,
  );
  assert.equal(
    params.shipping_options[0].shipping_rate_data.fixed_amount.currency,
    "cad",
  );
  assert.equal(
    params.shipping_address_collection.allowed_countries.join(),
    "CA",
  );
});

test("unpriced, digital-only, unavailable, missing and sold originals cannot checkout", async () => {
  for (const override of [
    { originalPriceCents: null },
    { digital: true },
    { originalUnavailable: true },
  ]) {
    const app = setup();
    Object.assign(app.state.work, override);
    assert.equal((await app.checkout("original")).status, 409);
    assert.equal(app.state.sessions.length, 0);
  }
  const app = setup();
  app.state.work = null;
  assert.equal((await app.checkout("original")).status, 404);
  const sold = setup();
  await sold.pay("original");
  assert.equal((await sold.checkout("original")).status, 409);
});

test("print shipping remains a single 30 CAD rate; digital checkout has no shipping", async () => {
  const app = setup();
  await app.checkout("print");
  const print = app.state.sessions[0];
  assert.equal(print.shipping_options.length, 1);
  assert.match(
    print.line_items[0].price_data.product_data.description,
    /24 .* 18 in/,
  );
  assert.equal(
    print.shipping_options[0].shipping_rate_data.fixed_amount.amount,
    3000,
  );
  assert.equal(print.shipping_options[0].shipping_rate, undefined);
  assert.equal(print.line_items[0].adjustable_quantity.maximum, 3);
  app.state.work.digital = true;
  await app.checkout("digital");
  assert.equal(app.state.sessions[1].shipping_options, undefined);
  assert.equal(app.state.sessions[1].shipping_address_collection, undefined);
});

test("original payment records fulfillment details once; excess sale is flagged", async () => {
  const app = setup();
  await app.pay("original");
  await app.pay("original");
  assert.equal(app.state.rows.length, 1);
  const row = app.state.rows[0];
  assert.equal(row.workId, 1);
  assert.equal(row.printId, null);
  assert.equal(row.fulfillmentStatus, "pending");
  assert.equal(row.customerEmail, "buyer@example.com");
  assert.equal(row.shippingAddress.address.country, "CA");
  await app.pay("original", "cs_2");
  assert.equal(app.state.rows[1].fulfillmentStatus, "oversold");
  assert.equal(app.state.locks.length, 2);
  assert.equal(app.state.locks[0].values[0], "nazanfeyzioglu_original");
});

test("digital sales do not consume original stock; full refunds restore it", async () => {
  const app = setup();
  await app.pay("digital", "cs_digital");
  assert.equal((await app.inventory.getSoldOriginalIds([1])).size, 0);
  await app.pay("original");
  assert.equal(app.state.rows[1].fulfillmentStatus, "pending");
  await app.refund("cs_1", 100);
  assert.equal((await app.inventory.getSoldOriginalIds([1])).has(1), true);
  await app.refund("cs_1", 190000);
  assert.equal((await app.inventory.getSoldOriginalIds([1])).size, 0);
  assert.equal((await app.checkout("original")).status, 200);
  app.state.work.originalUnavailable = true;
  assert.equal((await app.checkout("original")).status, 409);
});

test("webhook handler failure is reported with event context and returns 500", async () => {
  const app = setup();
  app.state.retrieveSession = async () => {
    throw new Error("Stripe retrieve failed");
  };
  const res = await app.pay("print", "cs_fails");
  assert.equal(res.status, 500);
  assert.deepEqual(app.state.reports.at(-1), {
    message: "Stripe retrieve failed",
    level: "error",
    stage: "handler",
    environment: "development",
    livemode: false,
    eventId: "evt_cs_fails",
    eventType: "checkout.session.completed",
    checkoutSessionId: "cs_fails",
  });
});

test("refund for an unknown order is reported as a warning", async () => {
  const app = setup();
  const res = await app.refund("cs_missing", 190000);
  assert.equal(res.status, 200);
  assert.deepEqual(app.state.reports.at(-1), {
    message: "Refund for unknown order",
    level: "warning",
    stage: "persist",
    environment: "development",
    livemode: false,
    eventId: "evt_refund_cs_missing",
    eventType: "charge.refunded",
    paymentIntentId: "pi_cs_missing",
  });
});

test("session without item metadata is acknowledged and reported", async () => {
  const app = setup();
  const res = await app.pay("print", "cs_no_metadata", { metadata: {} });
  assert.equal(res.status, 200);
  assert.deepEqual(app.state.reports.at(-1), {
    message: "Checkout session has no item metadata",
    level: "warning",
    stage: "handler",
    environment: "development",
    livemode: false,
    eventId: "evt_cs_no_metadata",
    eventType: "checkout.session.completed",
    checkoutSessionId: "cs_no_metadata",
    paymentIntentId: "pi_cs_no_metadata",
  });
});

test("webhook telemetry redacts secrets and customer emails and bounds length", () => {
  const scrub = load("src/lib/telemetry-scrub.ts");
  const { message, code } = scrub.describeError(
    Object.assign(
      new Error(
        "buyer@example.com paid with sk_live_abc123 via postgres://user:pw@host/db " +
          "x".repeat(400),
      ),
      { code: "resource_missing" },
    ),
  );
  assert.equal(code, "resource_missing");
  assert.doesNotMatch(message, /example\.com|sk_live|pw@host/);
  assert.match(message, /\[email\] paid with \[redacted-key\] via \[redacted-dsn\]/);
  assert.ok(message.length <= 301);
  assert.equal(scrub.scrubText("session cs_test_123 evt_1 pi_2"), "session cs_test_123 evt_1 pi_2");

  const event = scrub.scrubSentryEvent({
    message: "whsec_secret",
    request: { data: "raw", headers: { "stripe-signature": "t" }, url: "/x" },
    user: { email: "a@b.co" },
    exception: { values: [{ value: "No such session for buyer@example.com" }] },
    breadcrumbs: [{ message: "Bearer abc.def" }],
  });
  assert.deepEqual(event, {
    message: "[redacted-key]",
    request: { url: "/x" },
    exception: { values: [{ value: "No such session for [email]" }] },
    breadcrumbs: [{ message: "[redacted-auth]" }],
  });
});
