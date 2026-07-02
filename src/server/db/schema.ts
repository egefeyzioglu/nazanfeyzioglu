import { relations, sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

// Relative import so drizzle-kit and the tsx-run seed script resolve it
// without tsconfig path aliases.
import {
  EXHIBITION_CATEGORIES,
  type ExhibitionCategory,
} from "../../lib/exhibitions";

export { EXHIBITION_CATEGORIES, type ExhibitionCategory };

/**
 * Multi-project schema prefix so the same SQLite database could host other
 * projects. All tables are named `nazanfeyzioglu_*`.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator(
  (name) => `nazanfeyzioglu_${name}`,
);

/** A body of work shown as one card on the home rail and one detail page. */
export const series = createTable("series", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  slug: d.text({ length: 128 }).notNull().unique(),
  title: d.text({ length: 256 }).notNull(),
  /** Cover image used on the home rail. */
  coverImage: d.text().notNull(),
  coverWidth: d.integer().notNull().default(1000),
  coverHeight: d.integer().notNull().default(1000),
  /** Optional status suffix in the series-page eyebrow, e.g. "in progress". */
  statusNote: d.text({ length: 256 }),
  /** Order on the home rail and everywhere series are listed. */
  position: d.integer().notNull().default(0),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

/** An individual painting inside a series. */
export const works = createTable(
  "work",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    seriesId: d
      .integer()
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    title: d.text({ length: 256 }).notNull(),
    image: d.text().notNull(),
    imageWidth: d.integer().notNull().default(1000),
    imageHeight: d.integer().notNull().default(1000),
    /** Full medium / dimensions / year line, e.g. "Acrylic on cradled panel · 24 × 36 in · 2026". */
    medium: d.text().notNull(),
    /** Price for an available original, e.g. "1,900 CAD". Null for digital-only works. */
    price: d.text({ length: 128 }),
    /** When true, the original is in preparation and the work is sold as a digital edition. */
    digital: d.integer({ mode: "boolean" }).notNull().default(false),
    /** Optional blurb shown for digital editions. */
    note: d.text(),
    /** Order within the series page. */
    position: d.integer().notNull().default(0),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("work_series_idx").on(t.seriesId)],
);

/** A giclée edition listed on the Prints page, grouped by series. */
export const prints = createTable(
  "print",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    seriesId: d
      .integer()
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    title: d.text({ length: 256 }).notNull(),
    image: d.text().notNull(),
    imageWidth: d.integer().notNull().default(1000),
    imageHeight: d.integer().notNull().default(1000),
    /** e.g. "Giclée print · 37 × 49 in" or "Giclée print · size TBD". */
    spec: d.text().notNull(),
    /** e.g. "Edition of 20 · 1:1 scale" or "Edition of 20". */
    edition: d.text().notNull(),
    /** Display price, e.g. "180 CAD". Null renders as an em dash while pricing is finalised. */
    price: d.text({ length: 128 }),
    /** Order within the series group on the Prints page. */
    position: d.integer().notNull().default(0),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("print_series_idx").on(t.seriesId)],
);

/** An entry on the Exhibitions page, grouped by category. */
export const exhibitions = createTable("exhibition", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  /** One of EXHIBITION_CATEGORIES; controls which section the entry appears in. */
  category: d.text({ length: 32 }).$type<ExhibitionCategory>().notNull(),
  name: d.text({ length: 256 }).notNull(),
  /** e.g. "Monat Gallery · Madrid, Spain". */
  location: d.text({ length: 256 }).notNull(),
  /** Display date, e.g. "September 2023". */
  date: d.text({ length: 128 }).notNull(),
  /** Order within the category section. */
  position: d.integer().notNull().default(0),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
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
 * Free-form site copy (About bio, Contact details, page intros…), keyed by a
 * stable identifier. Multi-paragraph values separate paragraphs with a blank
 * line. The set of known keys lives in src/lib/content-keys.ts.
 */
export const siteContent = createTable("site_content", (d) => ({
  key: d.text({ length: 128 }).primaryKey(),
  value: d.text().notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));
