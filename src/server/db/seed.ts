/**
 * Seeds the database with the site's launch content (previously hardcoded in
 * src/app/_data). Run with `pnpm db:seed`; it refuses to touch a database that
 * already has series unless called with `--force`, which wipes and reseeds all
 * CMS tables.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { CONTENT_FIELDS } from "../../lib/content-keys";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./db.sqlite";
const db = drizzle(createClient({ url }), { schema });

/** Intrinsic pixel dimensions of the launch assets, to avoid layout shift. */
const DIMS: Record<string, { w: number; h: number }> = {
  "/design-assets/blue-peace.jpg": { w: 3440, h: 1980 },
  "/design-assets/carnival-1.jpg": { w: 5906, h: 3937 },
  "/design-assets/carnival-2.jpg": { w: 5906, h: 3937 },
  "/design-assets/creature-1.jpg": { w: 2454, h: 3329 },
  "/design-assets/creature-2.jpg": { w: 2167, h: 2932 },
  "/design-assets/creature-3.jpg": { w: 4724, h: 7087 },
  "/design-assets/family-1.jpg": { w: 3070, h: 2265 },
  "/design-assets/family-2.jpg": { w: 2925, h: 2328 },
  "/design-assets/family-4.jpg": { w: 3078, h: 2295 },
  "/design-assets/family.jpg": { w: 2870, h: 2140 },
  "/design-assets/fun-world.jpg": { w: 3564, h: 2371 },
  "/design-assets/inside-my-mind.jpg": { w: 763, h: 1024 },
  "/design-assets/observer-one-v2.jpg": { w: 2008, h: 2686 },
  "/design-assets/party-1.jpg": { w: 4762, h: 3476 },
  "/design-assets/party-2.jpg": { w: 4762, h: 3476 },
  "/design-assets/summer-joy.jpg": { w: 3616, h: 2412 },
  "/design-assets/the-dreamer.jpg": { w: 2372, h: 3593 },
  "/design-assets/the-watcher.jpg": { w: 2369, h: 3574 },
  "/design-assets/thoughts-2.jpg": { w: 4829, h: 8326 },
  "/design-assets/thoughts.jpg": { w: 2458, h: 3666 },
  "/design-assets/wavy-dream.jpg": { w: 2975, h: 2267 },
};

const dim = (image: string) => {
  const d = DIMS[image];
  if (!d) throw new Error(`No dimensions recorded for ${image}`);
  return { imageWidth: d.w, imageHeight: d.h };
};

const DIGITAL_NOTE = (size: string) =>
  `Available now as a signed ${size} digital edition — or commission the original on cradled panel.`;

type SeedWork = {
  title: string;
  image: string;
  medium: string;
  price?: string;
  digital?: boolean;
  note?: string;
};

type SeedPrint = { title: string; image: string; spec: string; edition: string };

type SeedSeries = {
  slug: string;
  title: string;
  cover: string;
  statusNote?: string;
  works: SeedWork[];
  prints: SeedPrint[];
};

const E20_11 = "Edition of 20 · 1:1 scale";
const E20 = "Edition of 20";

const SERIES: SeedSeries[] = [
  {
    slug: "inner",
    title: "Inner Worlds",
    cover: "/design-assets/inside-my-mind.jpg",
    works: [
      {
        title: "Inside My Mind",
        image: "/design-assets/inside-my-mind.jpg",
        medium:
          "Acrylic on MDF · 37 × 49 in · 2023 · Black floating frame included",
        price: "3,800 CAD",
      },
      {
        title: "Thoughts 1",
        image: "/design-assets/thoughts.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in · 2026",
        price: "1,900 CAD",
      },
      {
        title: "Thoughts 2",
        image: "/design-assets/thoughts-2.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in",
        digital: true,
        note: DIGITAL_NOTE("24 × 36 in"),
      },
    ],
    prints: [
      {
        title: "Inside My Mind",
        image: "/design-assets/inside-my-mind.jpg",
        spec: "Giclée print · 37 × 49 in",
        edition: E20_11,
      },
      {
        title: "Thoughts 1",
        image: "/design-assets/thoughts.jpg",
        spec: "Giclée print · 24 × 36 in",
        edition: E20_11,
      },
      {
        title: "Thoughts 2",
        image: "/design-assets/thoughts-2.jpg",
        spec: "Giclée print · size TBD",
        edition: E20,
      },
    ],
  },
  {
    slug: "family",
    title: "Family",
    cover: "/design-assets/family.jpg",
    works: [
      {
        title: "Family 1",
        image: "/design-assets/family-1.jpg",
        medium: "Acrylic on cradled panel · 24 × 18 in · 2025",
        price: "1,200 CAD",
      },
      {
        title: "Family 2",
        image: "/design-assets/family-2.jpg",
        medium: "Acrylic on cradled panel · 20 × 16 in · 2025",
        price: "1,000 CAD",
      },
      {
        title: "Family 3",
        image: "/design-assets/family.jpg",
        medium: "Acrylic on cradled panel · 24 × 18 in · 2026",
        price: "1,200 CAD",
      },
      {
        title: "Family 4",
        image: "/design-assets/family-4.jpg",
        medium: "Acrylic on cradled panel · 24 × 18 in · 2025",
        price: "1,200 CAD",
      },
    ],
    prints: [
      {
        title: "Family 1",
        image: "/design-assets/family-1.jpg",
        spec: "Giclée print · 24 × 18 in",
        edition: E20_11,
      },
      {
        title: "Family 2",
        image: "/design-assets/family-2.jpg",
        spec: "Giclée print · 20 × 16 in",
        edition: E20_11,
      },
      {
        title: "Family 3",
        image: "/design-assets/family.jpg",
        spec: "Giclée print · 24 × 18 in",
        edition: E20_11,
      },
      {
        title: "Family 4",
        image: "/design-assets/family-4.jpg",
        spec: "Giclée print · 24 × 18 in",
        edition: E20_11,
      },
    ],
  },
  {
    slug: "watchers",
    title: "Dreamers",
    cover: "/design-assets/the-dreamer.jpg",
    works: [
      {
        title: "The Dreamer",
        image: "/design-assets/the-dreamer.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in · 2026",
        price: "2,000 CAD",
      },
      {
        title: "The Watchers",
        image: "/design-assets/the-watcher.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in · 2026",
        price: "2,000 CAD",
      },
    ],
    prints: [
      {
        title: "The Dreamer",
        image: "/design-assets/the-dreamer.jpg",
        spec: "Giclée print · 24 × 36 in",
        edition: E20_11,
      },
      {
        title: "The Watchers",
        image: "/design-assets/the-watcher.jpg",
        spec: "Giclée print · 24 × 36 in",
        edition: E20_11,
      },
    ],
  },
  {
    slug: "carnival",
    title: "Carnival",
    cover: "/design-assets/carnival-1.jpg",
    works: [
      {
        title: "Fun World",
        image: "/design-assets/fun-world.jpg",
        medium: "Acrylic on cradled panel · 36 × 24 in · 2026",
        price: "1,900 CAD",
      },
      {
        title: "Carnival 1",
        image: "/design-assets/carnival-1.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in",
        digital: true,
        note: DIGITAL_NOTE("24 × 36 in"),
      },
      {
        title: "Carnival 2",
        image: "/design-assets/carnival-2.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in",
        digital: true,
        note: DIGITAL_NOTE("24 × 36 in"),
      },
    ],
    prints: [
      {
        title: "Carnival 1",
        image: "/design-assets/carnival-1.jpg",
        spec: "Giclée print · size TBD",
        edition: E20,
      },
      {
        title: "Carnival 2",
        image: "/design-assets/carnival-2.jpg",
        spec: "Giclée print · size TBD",
        edition: E20,
      },
      {
        title: "Fun World",
        image: "/design-assets/fun-world.jpg",
        spec: "Giclée print · 36 × 24 in",
        edition: E20_11,
      },
    ],
  },
  {
    slug: "revels",
    title: "Party",
    cover: "/design-assets/party-1.jpg",
    works: [
      {
        title: "Party 1",
        image: "/design-assets/party-1.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in",
        digital: true,
        note: DIGITAL_NOTE("24 × 36 in"),
      },
      {
        title: "Party 2",
        image: "/design-assets/party-2.jpg",
        medium: "Acrylic on cradled panel · 24 × 36 in",
        digital: true,
        note: DIGITAL_NOTE("24 × 36 in"),
      },
    ],
    prints: [
      {
        title: "Party 1",
        image: "/design-assets/party-1.jpg",
        spec: "Giclée print · size TBD",
        edition: E20,
      },
      {
        title: "Party 2",
        image: "/design-assets/party-2.jpg",
        spec: "Giclée print · size TBD",
        edition: E20,
      },
    ],
  },
  {
    slug: "creatures",
    title: "Creature",
    cover: "/design-assets/creature-3.jpg",
    statusNote: "in progress",
    works: [
      {
        title: "Observer / One",
        image: "/design-assets/observer-one-v2.jpg",
        medium: "Acrylic on cradled panel · 9 × 12 in",
        price: "500 CAD",
      },
      {
        title: "Creature 1",
        image: "/design-assets/creature-1.jpg",
        medium: "Acrylic on cradled panel · 12 × 16 in · 2026",
        price: "650 CAD",
      },
      {
        title: "Creature 2",
        image: "/design-assets/creature-2.jpg",
        medium: "Acrylic on cradled panel · 12 × 16 in · 2026",
        price: "650 CAD",
      },
      {
        title: "Creature 3",
        image: "/design-assets/creature-3.jpg",
        medium: "Acrylic on cradled panel · 12 × 16 in",
        digital: true,
        note: DIGITAL_NOTE("12 × 16 in"),
      },
    ],
    prints: [
      {
        title: "Observer / One",
        image: "/design-assets/observer-one-v2.jpg",
        spec: "Giclée print · 9 × 12 in",
        edition: E20_11,
      },
      {
        title: "Creature 1",
        image: "/design-assets/creature-1.jpg",
        spec: "Giclée print · 12 × 16 in",
        edition: E20_11,
      },
      {
        title: "Creature 2",
        image: "/design-assets/creature-2.jpg",
        spec: "Giclée print · 12 × 16 in",
        edition: E20_11,
      },
      {
        title: "Creature 3",
        image: "/design-assets/creature-3.jpg",
        spec: "Giclée print · 9 × 12 in",
        edition: E20_11,
      },
    ],
  },
  {
    slug: "reveries",
    title: "Blue Reveries",
    cover: "/design-assets/blue-peace.jpg",
    works: [
      {
        title: "Blue Peace",
        image: "/design-assets/blue-peace.jpg",
        medium:
          "Acrylic on MDF · 49 × 30 in · 2023 · Black floating frame included",
        price: "2,800 CAD",
      },
      {
        title: "Summer Joy",
        image: "/design-assets/summer-joy.jpg",
        medium: "Acrylic on canvas · 36 × 24 in · 2025",
        price: "1,700 CAD",
      },
      {
        title: "Wavy Dream",
        image: "/design-assets/wavy-dream.jpg",
        medium: "Acrylic on cradled panel · 24 × 18 in · 2025",
        price: "1,200 CAD",
      },
    ],
    prints: [
      {
        title: "Blue Peace",
        image: "/design-assets/blue-peace.jpg",
        spec: "Giclée print · 49 × 30 in",
        edition: E20_11,
      },
      {
        title: "Summer Joy",
        image: "/design-assets/summer-joy.jpg",
        spec: "Giclée print · 36 × 24 in",
        edition: E20_11,
      },
      {
        title: "Wavy Dream",
        image: "/design-assets/wavy-dream.jpg",
        spec: "Giclée print · 24 × 18 in",
        edition: E20_11,
      },
    ],
  },
];

const EXHIBITIONS: {
  category: schema.ExhibitionCategory;
  name: string;
  location: string;
  date: string;
}[] = [
  {
    category: "solo",
    name: "FK Gallery",
    location: "Ankara, Türkiye",
    date: "September 2023",
  },
  {
    category: "solo",
    name: "Deppo29",
    location: "Ankara, Türkiye",
    date: "May 2023",
  },
  {
    category: "fair",
    name: "Riverdale ArtWalk",
    location: "Toronto, Canada",
    date: "June 2026",
  },
  {
    category: "fair",
    name: "Brussels Art Fair",
    location: "with Monat Gallery · Brussels, Belgium",
    date: "November 2023",
  },
  {
    category: "fair",
    name: "ArtAnkara International Contemporary Art Fair",
    location: "Ankara, Türkiye",
    date: "March 2023",
  },
  {
    category: "group",
    name: "White Noise",
    location: "Monat Gallery · Madrid, Spain",
    date: "January 2024",
  },
];

async function main() {
  const force = process.argv.includes("--force");
  const existing = await db.select().from(schema.series).limit(1);
  if (existing.length > 0) {
    if (!force) {
      console.log("Database already has series — pass --force to reseed.");
      return;
    }
    // --force intentionally wipes every CMS table before reseeding.
    /* eslint-disable drizzle/enforce-delete-with-where */
    await db.delete(schema.prints);
    await db.delete(schema.works);
    await db.delete(schema.series);
    await db.delete(schema.exhibitions);
    await db.delete(schema.siteContent);
    /* eslint-enable drizzle/enforce-delete-with-where */
    console.log("Cleared existing CMS rows.");
  }

  for (const [i, s] of SERIES.entries()) {
    const [row] = await db
      .insert(schema.series)
      .values({
        slug: s.slug,
        title: s.title,
        coverImage: s.cover,
        coverWidth: dim(s.cover).imageWidth,
        coverHeight: dim(s.cover).imageHeight,
        statusNote: s.statusNote,
        position: i,
      })
      .returning();
    if (!row) throw new Error(`Failed to insert series ${s.slug}`);

    if (s.works.length > 0) {
      await db.insert(schema.works).values(
        s.works.map((w, j) => ({
          seriesId: row.id,
          title: w.title,
          image: w.image,
          ...dim(w.image),
          medium: w.medium,
          price: w.price,
          digital: w.digital ?? false,
          note: w.note,
          position: j,
        })),
      );
    }
    if (s.prints.length > 0) {
      await db.insert(schema.prints).values(
        s.prints.map((p, j) => ({
          seriesId: row.id,
          title: p.title,
          image: p.image,
          ...dim(p.image),
          spec: p.spec,
          edition: p.edition,
          position: j,
        })),
      );
    }
  }

  await db.insert(schema.exhibitions).values(
    EXHIBITIONS.map((e, i) => ({ ...e, position: i })),
  );

  await db.insert(schema.siteContent).values(
    CONTENT_FIELDS.map((f) => ({ key: f.key, value: f.default })),
  );

  console.log(
    `Seeded ${SERIES.length} series, ${SERIES.reduce((n, s) => n + s.works.length, 0)} works, ${SERIES.reduce((n, s) => n + s.prints.length, 0)} prints, ${EXHIBITIONS.length} exhibitions, ${CONTENT_FIELDS.length} content fields.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
