import { relations, sql } from "drizzle-orm";
import { check, index, pgTableCreator } from "drizzle-orm/pg-core";

// Relative import so drizzle-kit and the tsx-run seed script resolve it
// without tsconfig path aliases.
import {
  EXHIBITION_CATEGORIES,
  type ExhibitionCategory,
} from "../../lib/exhibitions";
import {
  type FulfillmentStatus,
  type OrderItemType,
  type PaymentStatus,
  type ShippingDetails,
} from "../../lib/orders";

export { EXHIBITION_CATEGORIES, type ExhibitionCategory };

/**
 * Multi-project schema prefix so the same Postgres database could host other
 * projects. All tables are named `nazanfeyzioglu_*`.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `nazanfeyzioglu_${name}`);

/** A body of work shown as one card on the home rail and one detail page. */
export const series = createTable("series", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
  slug: d.varchar({ length: 128 }).notNull().unique(),
  title: d.varchar({ length: 256 }).notNull(),
  /** Cover image used on the home rail. */
  coverImage: d.text().notNull(),
  coverWidth: d.integer().notNull().default(1000),
  coverHeight: d.integer().notNull().default(1000),
  /** Optional status suffix in the series-page eyebrow, e.g. "in progress". */
  statusNote: d.varchar({ length: 256 }),
  /** Order on the home rail and everywhere series are listed. */
  position: d.integer().notNull().default(0),
  createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

/** An individual painting inside a series. */
export const works = createTable(
  "work",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    seriesId: d
      .integer()
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    title: d.varchar({ length: 256 }).notNull(),
    image: d.text().notNull(),
    imageWidth: d.integer().notNull().default(1000),
    imageHeight: d.integer().notNull().default(1000),
    /** Full medium / dimensions / year line, e.g. "Acrylic on cradled panel · 24 × 36 in · 2026". */
    medium: d.text().notNull(),
    /**
     * Display price for an available original, e.g. "1,900 CAD". Originals are
     * inquiry-based (no self-serve checkout), so this stays free text.
     * Null for digital-only works.
     */
    price: d.varchar({ length: 128 }),
    /** When true, the original is in preparation and the work is sold as a digital edition. */
    digital: d.boolean().notNull().default(false),
    /**
     * Digital-edition price in cents (CAD), purchasable via Stripe Checkout.
     * Null hides the buy button and falls back to a contact link.
     */
    digitalPriceCents: d.integer(),
    /** Optional blurb shown for digital editions. */
    note: d.text(),
    /** Order within the series page. */
    position: d.integer().notNull().default(0),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("work_series_idx").on(t.seriesId),
    check("work_digital_price_cents_positive", sql`"digitalPriceCents" > 0`),
  ],
);

/** A giclée edition listed on the Prints page, grouped by series. */
export const prints = createTable(
  "print",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    seriesId: d
      .integer()
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    title: d.varchar({ length: 256 }).notNull(),
    image: d.text().notNull(),
    imageWidth: d.integer().notNull().default(1000),
    imageHeight: d.integer().notNull().default(1000),
    /** e.g. "Giclée print · 37 × 49 in" or "Giclée print · size TBD". */
    spec: d.text().notNull(),
    /** e.g. "Edition of 20 · 1:1 scale" or "Edition of 20". */
    edition: d.text().notNull(),
    /**
     * Price in cents (CAD), purchasable via Stripe Checkout. Null renders as
     * an em dash and hides the buy button while pricing is finalised.
     */
    priceCents: d.integer(),
    /**
     * Number of copies in the edition, used to stop overselling. Null means
     * availability is not enforced. Independent of the display `edition` text.
     */
    editionSize: d.integer(),
    /** Order within the series group on the Prints page. */
    position: d.integer().notNull().default(0),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("print_series_idx").on(t.seriesId),
    check("print_price_cents_positive", sql`"priceCents" > 0`),
    check("print_edition_size_positive", sql`"editionSize" > 0`),
  ],
);

/** An entry on the Exhibitions page, grouped by category. */
export const exhibitions = createTable("exhibition", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
  /** One of EXHIBITION_CATEGORIES; controls which section the entry appears in. */
  category: d.varchar({ length: 32 }).$type<ExhibitionCategory>().notNull(),
  name: d.varchar({ length: 256 }).notNull(),
  /** e.g. "Monat Gallery · Madrid, Spain". */
  location: d.varchar({ length: 256 }).notNull(),
  /** Display date, e.g. "September 2023". */
  date: d.varchar({ length: 128 }).notNull(),
  /** Order within the category section. */
  position: d.integer().notNull().default(0),
  createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  works: many(works),
  prints: many(prints),
}));

export const worksRelations = relations(works, ({ one }) => ({
  series: one(series, {
    fields: [works.seriesId],
    references: [series.id],
  }),
}));

export const printsRelations = relations(prints, ({ one }) => ({
  series: one(series, {
    fields: [prints.seriesId],
    references: [series.id],
  }),
}));

/**
 * A completed Stripe Checkout purchase (print or digital edition). Rows are
 * inserted by the Stripe webhook only once payment succeeds — abandoned
 * sessions never appear. Stripe stays the source of truth for money (refunds
 * happen in the Stripe Dashboard); this table owns fulfillment state.
 */
export const orders = createTable(
  "order",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    /** Idempotency key — Stripe retries webhook deliveries. */
    stripeCheckoutSessionId: d.varchar({ length: 256 }).notNull().unique(),
    stripePaymentIntentId: d.varchar({ length: 256 }),
    itemType: d.varchar({ length: 16 }).$type<OrderItemType>().notNull(),
    /** FK kept for joins; null once the item is deleted from the CMS. */
    printId: d.integer().references(() => prints.id, { onDelete: "set null" }),
    workId: d.integer().references(() => works.id, { onDelete: "set null" }),
    /** Snapshot of the item title at purchase time; survives item deletion. */
    itemTitle: d.varchar({ length: 256 }).notNull(),
    quantity: d.integer().notNull(),
    /** Per-unit price in cents at purchase time. */
    unitAmount: d.integer().notNull(),
    /** Total charged in cents, including shipping, from the Stripe session. */
    amountTotal: d.integer().notNull(),
    currency: d.varchar({ length: 3 }).notNull(),
    customerEmail: d.varchar({ length: 256 }),
    customerName: d.varchar({ length: 256 }),
    /** Stripe shipping details (name + address); null for digital editions. */
    shippingAddress: d.jsonb().$type<ShippingDetails>(),
    paymentStatus: d
      .varchar({ length: 16 })
      .$type<PaymentStatus>()
      .notNull()
      .default("paid"),
    fulfillmentStatus: d
      .varchar({ length: 16 })
      .$type<FulfillmentStatus>()
      .notNull()
      .default("pending"),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("order_print_idx").on(t.printId),
    index("order_work_idx").on(t.workId),
    index("order_payment_intent_idx").on(t.stripePaymentIntentId),
    index("order_created_idx").on(t.createdAt),
    check("order_quantity_positive", sql`quantity > 0`),
    check("order_unit_amount_nonnegative", sql`"unitAmount" >= 0`),
    check("order_amount_total_nonnegative", sql`"amountTotal" >= 0`),
    check("order_item_type_valid", sql`"itemType" in ('print', 'digital')`),
    check(
      "order_payment_status_valid",
      sql`"paymentStatus" in ('paid', 'refunded')`,
    ),
    check(
      "order_fulfillment_status_valid",
      sql`"fulfillmentStatus" in ('pending', 'fulfilled', 'oversold')`,
    ),
    // At most one of printId/workId — not exactly one, because both FKs are
    // set null when the referenced item is deleted from the CMS.
    check(
      "order_single_item",
      sql`not ("printId" is not null and "workId" is not null)`,
    ),
  ],
);

export const ordersRelations = relations(orders, ({ one }) => ({
  print: one(prints, {
    fields: [orders.printId],
    references: [prints.id],
  }),
  work: one(works, {
    fields: [orders.workId],
    references: [works.id],
  }),
}));

/**
 * Free-form site copy (About bio, Contact details, page intros…), keyed by a
 * stable identifier. Multi-paragraph values separate paragraphs with a blank
 * line. The set of known keys lives in src/lib/content-keys.ts.
 */
export const siteContent = createTable("site_content", (d) => ({
  key: d.varchar({ length: 128 }).primaryKey(),
  value: d.text().notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));
