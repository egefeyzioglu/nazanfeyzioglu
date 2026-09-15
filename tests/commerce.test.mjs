import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import Stripe from "stripe";

const require = createRequire(import.meta.url);
/**
 * Load real TypeScript modules with isolated database and service boundaries.
 * These tests do not simulate PostgreSQL locking or contact payment services.
 */
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
    Buffer,
    URL,
    crypto,
    require: (id) =>
      Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
  });
  return exports;
}

/** Create isolated commerce fixtures, optionally using local Stripe signature verification. */
function setup({ verifySignatures = false } = {}) {
  const state = {
    stripeConfigured: true,
    retrievedSessions: [],
    rows: [],
    sessions: [],
    locks: [],
    analytics: [],
    emails: [],
    reports: [],
    /** When set, the mocked Resend client throws or returns this error. */
    emailFailure: null,
    /** When set, the mocked Resend client rejects sends to this address. */
    rejectTo: null,
    /** CMS content overrides applied on top of the defaults. */
    content: {},
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
      "itemTitle",
      "unitAmount",
      "amountTotal",
      "customerEmail",
      "customerName",
      "shippingAddress",
      "fulfillmentStatus",
      "confirmationEmailSentAt",
      "notificationEmailSentAt",
    ]),
    works: fields(["id", "title"]),
    prints: fields(["id", "title", "editionSize"]),
  };
  const orm = {
    eq: (key, value) => (row) => row[key] === value,
    ne: (key, value) => (row) => row[key] !== value,
    isNull: (key) => (row) => row[key] == null,
    or:
      (...conditions) =>
      (row) =>
        conditions.some((condition) => condition(row)),
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
          if (projection.sold) {
            const sum = (group) =>
              group.reduce((n, row) => n + row[projection.sold.values[0]], 0);
            const result = Promise.resolve([{ sold: sum(rows) }]);
            result.groupBy = async (field) => {
              const groups = new Map();
              for (const row of rows) {
                const group = groups.get(row[field]) ?? [];
                group.push(row);
                groups.set(row[field], group);
              }
              return [...groups.values()].map((group) =>
                Object.fromEntries(
                  Object.entries(projection).map(([key, column]) => [
                    key,
                    key === "sold" ? sum(group) : group[0][column],
                  ]),
                ),
              );
            };
            return result;
          }
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
          const matched = state.rows.filter(predicate);
          matched.forEach((row) => Object.assign(row, values));
          // Awaitable directly, or chained with .returning() for a projection.
          const result = Promise.resolve();
          result.returning = async (projection) =>
            matched.map((row) =>
              Object.fromEntries(
                Object.entries(projection).map(([key, field]) => [
                  key,
                  row[field],
                ]),
              ),
            );
          return result;
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
        retrieve: async (id) => {
          state.retrievedSessions.push(id);
          return state.retrieveSession();
        },
      },
    },
    webhooks: verifySignatures
      ? new Stripe("sk_test_local_only").webhooks
      : { constructEvent: () => state.event },
  };
  const orders = load("src/lib/orders.ts");
  // content-keys imports its sibling relatively so the seed script can load it.
  const contentKeys = load("src/lib/content-keys.ts", { "./orders": orders });
  const dependencies = {
    "server-only": {},
    "drizzle-orm": orm,
    resend: {
      Resend: class {
        emails = {
          send: async (payload, options) => {
            if (state.emailFailure instanceof Error) throw state.emailFailure;
            if (payload.to === state.rejectTo) {
              return {
                data: null,
                error: { name: "validation_error", message: "rejected" },
              };
            }
            state.emails.push({ ...payload, ...options });
            return {
              data: state.emailFailure ? null : { id: "email_1" },
              error: state.emailFailure,
            };
          },
        };
      },
    },
    "src/lib/content-keys": contentKeys,
    "src/server/queries": {
      getContent: async () => ({
        ...contentKeys.CONTENT_DEFAULTS,
        ...state.content,
      }),
    },
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
        RESEND_API_KEY: "re_test",
        ORDER_EMAIL_FROM: "Shop <orders@example.com>",
        SITE_URL: "https://example.com/",
      },
    },
    "src/lib/orders": orders,
    "src/lib/prints": load("src/lib/prints.ts"),
    "src/server/db": { db },
    "src/server/db/schema": schema,
    "src/server/stripe": {
      getStripe: () => stripe,
      stripeConfigured: () => state.stripeConfigured,
    },
    "src/server/observability": {
      deploymentEnvironment: () => "development",
      reportWebhookFailure: (err, ctx, level = "error") =>
        state.reports.push({
          message: err instanceof Error ? err.message : String(err),
          level,
          ...ctx,
        }),
    },
    "src/lib/posthog-server": {
      captureServerEvent: (distinctId, event, properties) => {
        state.analytics.push({ distinctId, event, properties });
      },
      captureServerException: () => {},
    },
  };
  const inventory = load("src/server/orders.ts", dependencies);
  dependencies["src/server/orders"] = inventory;
  dependencies["src/server/email"] = load("src/server/email.ts", dependencies);
  const checkout = load("src/app/api/checkout/route.ts", dependencies);
  const webhook = load("src/app/api/stripe/webhook/route.ts", dependencies);
  const dispatch = (payload = "test", signature = "test") =>
    webhook.POST({
      headers: new Headers(
        signature === null ? {} : { "stripe-signature": signature },
      ),
      text: async () => payload,
    });
  const dispatchEvent = () => {
    if (!verifySignatures) return dispatch();
    const payload = JSON.stringify(state.event);
    return dispatch(
      payload,
      stripe.webhooks.generateTestHeaderString({
        payload,
        secret: dependencies["src/env"].env.STRIPE_WEBHOOK_SECRET,
      }),
    );
  };
  return {
    state,
    inventory,
    dispatch,
    dispatchEvent,
    env: dependencies["src/env"].env,
    checkout: (itemType, extra = {}) =>
      checkout.POST({
        url: "http://localhost:3000/api/checkout",
        headers: new Headers({ "x-posthog-distinct-id": "visitor_1" }),
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
      return dispatchEvent();
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
      return dispatchEvent();
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

test("print shipping defaults to a single 30 CAD rate; digital checkout has no shipping", async () => {
  const app = setup();
  await app.checkout("print");
  const print = app.state.sessions[0];
  assert.equal(print.shipping_options.length, 1);
  assert.match(
    print.line_items[0].price_data.product_data.description,
    /18 .* 24 in/,
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

test("print shipping charges the admin-set rate; a malformed rate falls back to the default", async () => {
  const app = setup();
  const shipping = (i) =>
    app.state.sessions[i].shipping_options[0].shipping_rate_data.fixed_amount
      .amount;
  app.state.content["prints.shipping.price"] = "12.50";
  await app.checkout("print");
  assert.equal(shipping(0), 1250);
  app.state.content["prints.shipping.price"] = "0";
  await app.checkout("print");
  assert.equal(shipping(1), 0);
  app.state.content["prints.shipping.price"] = "free";
  await app.checkout("print");
  assert.equal(shipping(2), 3000);
  app.state.content["prints.shipping.price"] = "9".repeat(400);
  await app.checkout("print");
  assert.equal(shipping(3), 3000);
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

test("fully refunded orders no longer read as pending in the admin", async () => {
  const app = setup();
  const { effectiveFulfillment } = load("src/lib/orders.ts");
  await app.pay("original");
  const order = app.state.rows[0];
  assert.equal(effectiveFulfillment(order), "pending");
  await app.refund("cs_1", 100);
  assert.equal(effectiveFulfillment(order), "pending");
  await app.refund("cs_1", 190000);
  assert.equal(order.paymentStatus, "refunded");
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

test("checkout funnel events are attributed to the buyer's PostHog id", async () => {
  const app = setup();
  await app.checkout("original");
  await app.pay("original");
  await app.refund("cs_1", 190000);
  const events = app.state.analytics.map((e) => [e.distinctId, e.event]);
  assert.deepEqual(events, [
    ["visitor_1", "checkout_session_created"],
    ["checkout:cs_1", "checkout_completed"],
    [`order:${app.state.rows[0].id}`, "order_refunded"],
  ]);
  assert.equal(app.state.sessions[0].metadata.posthogDistinctId, "visitor_1");
});

test("a paid order emails the buyer a confirmation and the seller a notification, once", async () => {
  const app = setup();
  await app.pay("original");
  await app.pay("original"); // Stripe retry: already recorded, nothing resent
  assert.equal(app.state.emails.length, 2);
  const [confirmation, notification] = app.state.emails;

  assert.equal(confirmation.from, "Shop <orders@example.com>");
  assert.equal(confirmation.to, "buyer@example.com");
  assert.equal(confirmation.replyTo, "nazanfeyzioglu@yahoo.com");
  assert.equal(confirmation.idempotencyKey, "order-confirmation/cs_1");
  assert.match(confirmation.subject, /Painting \(original\)/);
  assert.match(confirmation.text, /Dear Buyer,/);
  assert.match(confirmation.text, /Total: 1,900 CAD/);
  assert.match(confirmation.text, /Shipping: Free/);
  assert.match(confirmation.text, /123 Test St/);
  assert.match(confirmation.html, /123 Test St/);
  assert.doesNotMatch(confirmation.text, /3–7 business days/);

  assert.equal(notification.to, "nazanfeyzioglu@yahoo.com");
  assert.equal(notification.replyTo, "buyer@example.com");
  assert.equal(notification.idempotencyKey, "order-notification/cs_1");
  assert.equal(notification.subject, "New order #1: Painting (original)");
  assert.match(notification.text, /Customer: Buyer — buyer@example.com/);
  assert.match(notification.text, /https:\/\/example\.com\/admin\/orders/);
  assert.doesNotMatch(notification.text, /OVERSOLD/);
  assert.ok(app.state.rows[0].confirmationEmailSentAt !== undefined);
  assert.ok(app.state.rows[0].notificationEmailSentAt !== undefined);
});

test("a webhook retry delivers emails still owed to an already-recorded order", async () => {
  // Simulate a crash after the order committed but before Resend accepted
  // anything: the row exists with no emailsSentAt.
  const crashed = setup();
  crashed.state.emailFailure = new Error("process died");
  assert.equal((await crashed.pay("original")).status, 500);
  assert.equal(crashed.state.rows[0].confirmationEmailSentAt, undefined);
  assert.equal(crashed.state.rows[0].notificationEmailSentAt, undefined);
  crashed.state.emailFailure = null;
  assert.equal((await crashed.pay("original")).status, 200); // Stripe retry
  assert.equal(crashed.state.rows.length, 1);
  assert.equal(crashed.state.emails.length, 2);
  assert.equal(crashed.state.emails[0].to, "buyer@example.com");
  assert.ok(crashed.state.rows[0].confirmationEmailSentAt !== undefined);
  assert.ok(crashed.state.rows[0].notificationEmailSentAt !== undefined);
  await crashed.pay("original"); // a further retry sends nothing more
  assert.equal(crashed.state.emails.length, 2);

  // The retry rebuilds the emails from the stored snapshot, including the
  // oversold flag the transaction set.
  const oversold = setup();
  oversold.state.print.editionSize = 1;
  await oversold.pay("print", "cs_a");
  oversold.state.emailFailure = new Error("process died");
  await oversold.pay("print", "cs_b");
  oversold.state.emailFailure = null;
  oversold.state.emails.length = 0;
  await oversold.pay("print", "cs_b");
  assert.match(oversold.state.emails[1].subject, /^OVERSOLD/);
  assert.match(oversold.state.emails[0].text, /sold out moments before/);

  // One rejected message keeps only that message owed: the retry resends
  // the seller notification without repeating the buyer confirmation.
  const partial = setup();
  partial.state.rejectTo = "nazanfeyzioglu@yahoo.com";
  assert.equal((await partial.pay("original")).status, 500);
  assert.equal(partial.state.emails.length, 1);
  assert.ok(partial.state.rows[0].confirmationEmailSentAt !== undefined);
  assert.equal(partial.state.rows[0].notificationEmailSentAt, undefined);
  partial.state.rejectTo = null;
  assert.equal((await partial.pay("original")).status, 200);
  assert.equal(partial.state.emails.length, 2);
  assert.equal(partial.state.emails[1].to, "nazanfeyzioglu@yahoo.com");
  assert.ok(partial.state.rows[0].notificationEmailSentAt !== undefined);
});

test("print confirmations carry the CMS preparation copy; oversold orders warn the seller", async () => {
  const app = setup();
  app.env.ORDER_NOTIFICATION_EMAIL = "artist@example.com";
  await app.pay("print");
  const [confirmation, notification] = app.state.emails;
  assert.equal(confirmation.replyTo, "artist@example.com");
  assert.equal(notification.to, "artist@example.com");
  assert.match(confirmation.text, /3–7 business days/);
  assert.match(confirmation.html, /3–7 business days/);
  assert.match(confirmation.text, /Shipping: 30 CAD|Shipping: Free/);

  app.state.work.digital = true;
  await app.pay("digital", "cs_2");
  assert.equal(app.state.emails.length, 4);
  assert.doesNotMatch(app.state.emails[2].text, /Shipping:/);
  assert.match(app.state.emails[2].text, /digital edition/);

  app.state.print.editionSize = 1;
  await app.pay("print", "cs_3");
  assert.equal(app.state.rows[2].fulfillmentStatus, "oversold");
  assert.match(app.state.emails[5].subject, /^OVERSOLD — New order #3/);
  assert.match(app.state.emails[5].text, /Refund it in the Stripe Dashboard/);
});

test("failed delivery records the order but asks Stripe to retry; unconfigured email acks", async () => {
  const thrown = setup();
  thrown.state.emailFailure = new Error("network down");
  assert.equal((await thrown.pay("original")).status, 500);
  assert.equal(thrown.state.rows.length, 1);

  const rejected = setup();
  rejected.state.emailFailure = {
    name: "validation_error",
    message: "bad from",
    statusCode: 422,
  };
  assert.equal((await rejected.pay("original")).status, 500);
  assert.equal(rejected.state.rows.length, 1);

  // Unconfigured email is settled as "never sent" rather than left owed, so
  // replaying the event after Resend is configured does not email a stale
  // order.
  const unconfigured = setup();
  unconfigured.env.RESEND_API_KEY = undefined;
  assert.equal((await unconfigured.pay("original")).status, 200);
  assert.equal(unconfigured.state.emails.length, 0);
  assert.equal(unconfigured.state.rows.length, 1);
  assert.ok(unconfigured.state.rows[0].confirmationEmailSentAt !== undefined);
  assert.ok(unconfigured.state.rows[0].notificationEmailSentAt !== undefined);
  unconfigured.env.RESEND_API_KEY = "re_test";
  assert.equal((await unconfigured.pay("original")).status, 200);
  assert.equal(unconfigured.state.emails.length, 0);

  // Session without a customer email: the seller is still notified.
  const anonymous = setup();
  const anonymousResponse = await anonymous.pay("original", "cs_anon", {
    customer_details: { email: null, name: null },
  });
  assert.equal(anonymousResponse.status, 200);
  assert.equal(anonymous.state.emails.length, 1);
  // Nothing can ever be sent to the buyer, so that side is settled at once.
  assert.ok(anonymous.state.rows[0].confirmationEmailSentAt !== undefined);

  // No seller address anywhere: the notification stays owed (and the
  // webhook asks for a retry) until one is configured, rather than being
  // silently dropped.
  const noSeller = setup();
  noSeller.state.content["contact.email"] = "";
  assert.equal((await noSeller.pay("original")).status, 500);
  assert.equal(noSeller.state.emails.length, 1);
  assert.ok(noSeller.state.rows[0].confirmationEmailSentAt !== undefined);
  assert.equal(noSeller.state.rows[0].notificationEmailSentAt, undefined);
  noSeller.env.ORDER_NOTIFICATION_EMAIL = "artist@example.com";
  assert.equal((await noSeller.pay("original")).status, 200);
  assert.equal(noSeller.state.emails.length, 2);
  assert.equal(noSeller.state.emails[1].to, "artist@example.com");
  assert.equal(anonymous.state.emails[0].to, "nazanfeyzioglu@yahoo.com");
  assert.equal(anonymous.state.emails[0].replyTo, undefined);
  assert.match(anonymous.state.emails[0].text, /Customer: unknown/);
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

test("owed order emails are reported as a warning alongside the retry", async () => {
  const app = setup();
  app.state.emailFailure = new Error("network down");
  assert.equal((await app.pay("original")).status, 500);
  const report = app.state.reports.at(-1);
  assert.equal(report.message, "Order email delivery pending retry");
  assert.equal(report.level, "warning");
  assert.equal(report.stage, "persist");
  assert.equal(report.checkoutSessionId, "cs_1");
  assert.equal(report.itemType, "original");
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
  const res = await app.pay("print", "cs_no_metadata", {
    metadata: { itemType: "gift-card", itemId: "1.5" },
  });
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
  assert.match(
    message,
    /\[email\] paid with \[redacted-key\] via \[redacted-dsn\]/,
  );
  assert.ok(message.length <= 301);
  assert.equal(
    scrub.scrubText("session cs_test_123 evt_1 pi_2"),
    "session cs_test_123 evt_1 pi_2",
  );

  const event = scrub.scrubSentryEvent({
    message: "whsec_secret",
    request: {
      data: "raw",
      headers: { "stripe-signature": "t" },
      url: "/x?token=abc#frag",
    },
    user: { email: "a@b.co" },
    exception: { values: [{ value: "No such session for buyer@example.com" }] },
    breadcrumbs: [{ message: "bearer abc.def" }, { message: "Basic Zm9v" }],
  });
  assert.deepEqual(event, {
    message: "[redacted-key]",
    request: { url: "/x" },
    exception: { values: [{ value: "No such session for [email]" }] },
    breadcrumbs: [
      { message: "[redacted-auth]" },
      { message: "[redacted-auth]" },
    ],
  });
});

test("sentry test route is open outside production and token-gated in production", () => {
  const { sentryTestAllowed } = load("src/lib/sentry-test-guard.ts");
  const token = "0123456789abcdef";
  assert.equal(
    sentryTestAllowed({
      environment: "preview",
      token: undefined,
      provided: null,
    }),
    true,
  );
  assert.equal(
    sentryTestAllowed({
      environment: "production",
      token: undefined,
      provided: token,
    }),
    false,
  );
  assert.equal(
    sentryTestAllowed({ environment: "production", token, provided: null }),
    false,
  );
  assert.equal(
    sentryTestAllowed({
      environment: "production",
      token,
      provided: token + "x",
    }),
    false,
  );
  assert.equal(
    sentryTestAllowed({ environment: "production", token, provided: token }),
    true,
  );
});

// Signature fixtures are generated and verified locally by the Stripe SDK.
// Session retrieval remains mocked, even when verification is real.
test("a correctly signed paid webhook records the order", async () => {
  const app = setup({ verifySignatures: true });
  assert.equal((await app.pay("print")).status, 200);
  assert.equal(app.state.rows.length, 1);
  assert.equal(app.state.emails.length, 2);
  assert.deepEqual(app.state.retrievedSessions, ["cs_1"]);
});

test("invalid or missing signatures reject paid events before any order side effects", async () => {
  const payload = JSON.stringify({
    id: "evt_signature",
    livemode: false,
    type: "checkout.session.completed",
    data: { object: { id: "cs_signature", payment_status: "paid" } },
  });
  const header = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "test",
  });
  for (const [body, signature] of [
    [payload.replace("cs_signature", "cs_tampered"), header],
    [
      payload,
      Stripe.webhooks.generateTestHeaderString({ payload, secret: "wrong" }),
    ],
    [payload, "not-a-signature"],
    [payload, null],
  ]) {
    const app = setup({ verifySignatures: true });
    assert.equal((await app.dispatch(body, signature)).status, 400);
    assert.deepEqual(app.state.retrievedSessions, []);
    assert.deepEqual(app.state.rows, []);
    assert.deepEqual(app.state.emails, []);
    assert.deepEqual(app.state.analytics, []);
    assert.equal(app.state.reports.at(-1).stage, "signature");
  }
});

test("missing Stripe configuration rejects checkout and webhook without side effects", async () => {
  const app = setup();
  app.state.stripeConfigured = false;
  assert.equal((await app.checkout("print")).status, 503);
  assert.equal((await app.dispatch()).status, 503);
  app.state.stripeConfigured = true;
  app.env.STRIPE_WEBHOOK_SECRET = undefined;
  assert.equal((await app.dispatch()).status, 503);
  assert.deepEqual(app.state.sessions, []);
  assert.deepEqual(app.state.retrievedSessions, []);
  assert.deepEqual(app.state.rows, []);
  assert.deepEqual(app.state.emails, []);
  assert.deepEqual(app.state.analytics, []);
  assert.ok(app.state.reports.every((report) => report.stage === "config"));
});

test("print inventory sums quantities by requested print and excludes full refunds", async () => {
  const app = setup();
  app.state.rows.push(
    { printId: 1, quantity: 2, paymentStatus: "paid" },
    { printId: 1, quantity: 3, paymentStatus: "paid" },
    { printId: 1, quantity: 7, paymentStatus: "refunded" },
    { printId: 2, quantity: 4, paymentStatus: "paid" },
    { printId: 3, quantity: 9, paymentStatus: "paid" },
    { printId: null, quantity: 6, paymentStatus: "paid" },
  );
  assert.deepEqual(
    Array.from(
      await app.inventory.getSoldPrintQuantities([1, 2, 4]),
      ([id, sold]) => [id, sold],
    ),
    [
      [1, 5],
      [2, 4],
    ],
  );
  assert.equal((await app.inventory.getSoldPrintQuantities([])).size, 0);
  assert.equal((await app.inventory.getSoldPrintQuantities([4])).size, 0);
  for (const [edition, sold, expected] of [
    [3, 0, 3],
    [3, 2, 1],
    [3, 3, 0],
    [3, 5, 0],
    [0, 0, 0],
    [null, 0, null],
    [null, 1000, null],
  ]) {
    assert.equal(app.inventory.remainingCopies(edition, sold), expected);
  }
});

test("print checkout limits quantity to remaining stock or ten for open editions", async () => {
  for (const [editionSize, sold, maximum] of [
    [5, 2, 3],
    [20, 2, 10],
    [null, 100, 10],
    [3, 2, null],
  ]) {
    const app = setup();
    app.state.print.editionSize = editionSize;
    app.state.rows.push({ printId: 1, quantity: sold, paymentStatus: "paid" });
    assert.equal(
      (await app.checkout("print", { quantity: 999, price: 1 })).status,
      200,
    );
    const line = app.state.sessions[0].line_items[0];
    assert.equal(line.quantity, 1);
    assert.equal(line.price_data.unit_amount, 10000);
    if (maximum === null) {
      assert.equal(line.adjustable_quantity, undefined);
    } else {
      assert.equal(line.adjustable_quantity.enabled, true);
      assert.equal(line.adjustable_quantity.minimum, 1);
      assert.equal(line.adjustable_quantity.maximum, maximum);
    }
  }
  for (const sold of [3, 4]) {
    const app = setup();
    app.state.rows.push({ printId: 1, quantity: sold, paymentStatus: "paid" });
    assert.equal((await app.checkout("print")).status, 409);
    assert.equal(app.state.sessions.length, 0);
  }
});

/** Build consistent Stripe line-item and amount fixtures for multi-copy print purchases. */
function printSession(quantity) {
  return {
    amount_total: quantity * 10000,
    amount_subtotal: quantity * 10000,
    line_items: { data: [{ quantity, price: { unit_amount: 10000 } }] },
  };
}

test("sequential multi-copy print orders fill the edition exactly then flag excess", async () => {
  const app = setup();
  app.state.print.editionSize = 5;
  assert.equal(
    (await app.pay("print", "cs_first", printSession(2))).status,
    200,
  );
  assert.equal(
    (await app.pay("print", "cs_exact", printSession(3))).status,
    200,
  );
  assert.equal(
    (await app.pay("print", "cs_excess", printSession(2))).status,
    200,
  );
  assert.deepEqual(
    app.state.rows.map((row) => [row.quantity, row.fulfillmentStatus]),
    [
      [2, "pending"],
      [3, "pending"],
      [2, "oversold"],
    ],
  );
  assert.equal((await app.inventory.getSoldPrintQuantities([1])).get(1), 7);
  assert.equal((await app.checkout("print")).status, 409);
  assert.match(app.state.emails.at(-1).subject, /^OVERSOLD/);
  assert.equal(
    (await app.pay("print", "cs_excess", printSession(2))).status,
    200,
  );
  assert.equal(app.state.rows.length, 3);
  assert.equal(app.state.emails.length, 6);
});

test("partial print refunds keep stock consumed; full refunds and their replay restore it once", async () => {
  const app = setup();
  assert.equal(
    (await app.pay("print", "cs_print", printSession(3))).status,
    200,
  );
  assert.equal((await app.checkout("print")).status, 409);
  const refund = async (amount) => {
    app.state.event = {
      id: amount === 30000 ? "evt_full_print" : "evt_partial_print",
      livemode: false,
      type: "charge.refunded",
      data: {
        object: {
          payment_intent: "pi_cs_print",
          amount: 30000,
          amount_refunded: amount,
          currency: "cad",
        },
      },
    };
    return app.dispatchEvent();
  };
  assert.equal((await refund(10000)).status, 200);
  assert.equal(app.state.rows[0].paymentStatus, "paid");
  assert.equal((await app.inventory.getSoldPrintQuantities([1])).get(1), 3);
  assert.equal((await app.checkout("print")).status, 409);
  assert.equal(
    app.state.analytics.filter((event) => event.event === "order_refunded")
      .length,
    0,
  );
  for (let delivery = 0; delivery < 2; delivery++) {
    assert.equal((await refund(30000)).status, 200);
    assert.equal(app.state.rows[0].paymentStatus, "refunded");
    assert.equal((await app.inventory.getSoldPrintQuantities([1])).size, 0);
    assert.equal((await app.checkout("print")).status, 200);
    assert.equal(
      app.state.sessions.at(-1).line_items[0].adjustable_quantity.maximum,
      3,
    );
  }
  assert.equal(
    (await app.pay("print", "cs_print", printSession(3))).status,
    200,
  );
  assert.equal(app.state.rows.length, 1);
  assert.equal(app.state.rows[0].paymentStatus, "refunded");
  assert.equal(app.state.emails.length, 2);
  const events = app.state.analytics.filter(
    (event) => event.event === "order_refunded",
  );
  assert.ok(events.length > 0);
  assert.ok(
    events.every((event) => event.properties.$insert_id === "evt_full_print"),
  );
});

test("unpaid completion waits for async success and paid event replays settle once", async () => {
  const app = setup();
  app.state.event = {
    id: "evt_unpaid",
    livemode: false,
    type: "checkout.session.completed",
    data: { object: { id: "cs_delayed", payment_status: "unpaid" } },
  };
  assert.equal((await app.dispatchEvent()).status, 200);
  assert.deepEqual(app.state.retrievedSessions, []);
  assert.deepEqual(app.state.rows, []);
  assert.deepEqual(app.state.emails, []);
  assert.deepEqual(app.state.analytics, []);
  app.state.session = {
    id: "cs_delayed",
    metadata: { itemType: "print", itemId: "1" },
    payment_intent: "pi_cs_delayed",
    currency: "cad",
    customer_details: { email: "buyer@example.com", name: "Buyer" },
    ...printSession(2),
  };
  app.state.event = {
    id: "evt_async",
    livemode: false,
    type: "checkout.session.async_payment_succeeded",
    data: { object: { id: "cs_delayed", payment_status: "paid" } },
  };
  assert.equal((await app.dispatchEvent()).status, 200);
  assert.equal((await app.dispatchEvent()).status, 200);
  assert.equal(
    (await app.pay("print", "cs_delayed", printSession(2))).status,
    200,
  );
  assert.equal(app.state.rows.length, 1);
  assert.equal(app.state.rows[0].quantity, 2);
  assert.equal(app.state.emails.length, 2);
  assert.equal((await app.inventory.getSoldPrintQuantities([1])).get(1), 2);
  assert.ok(app.state.analytics.length > 0);
  assert.ok(
    app.state.analytics.every(
      (event) => event.properties.$insert_id === "cs_delayed",
    ),
  );
});

test("digital works link to their print edition by title, else fall back to Contact", () => {
  const { findMatchingPrint, printHref, printAnchorId } = load(
    "src/lib/prints.ts",
  );
  const prints = [
    { id: 7, title: "Carnival 1" },
    { id: 8, title: " carnival  2 " },
    { id: 9, title: "Fun World" },
  ];

  assert.equal(findMatchingPrint("Carnival 1", prints)?.id, 7);
  assert.equal(findMatchingPrint("CARNIVAL 2", prints)?.id, 8);
  assert.equal(findMatchingPrint("Carnival 3", prints), null);
  assert.equal(findMatchingPrint("Carnival 1", []), null);
  assert.equal(printAnchorId(7), "print-7");
  assert.equal(printHref(7), "/prints#print-7");
});
