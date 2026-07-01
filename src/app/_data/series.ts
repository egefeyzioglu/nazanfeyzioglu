/**
 * Mock data for the dynamically-generated series pages.
 *
 * Each series lists its works in display order. A work is either an available
 * original (with a `price`) or a forthcoming piece offered as a digital edition
 * while the original is in preparation (`digital: true`).
 */

export type Work = {
  title: string;
  image: string;
  /** Full medium / dimensions / year line, e.g. "Acrylic on cradled panel · 24 × 36 in · 2026". */
  medium: string;
  /** Price for an available original, e.g. "1,900 CAD". Omit for digital-only works. */
  price?: string;
  /** When true, the original is in preparation and the work is sold as a digital edition. */
  digital?: boolean;
  /** Optional blurb shown for digital editions. */
  note?: string;
};

export type Series = {
  slug: string;
  /** Display name, e.g. "Inner Worlds". */
  title: string;
  /** Cover image used on the home rail. */
  cover: string;
  /** Eyebrow suffix on the series page, e.g. "3 works" or "4 works · in progress". */
  meta: string;
  works: Work[];
};

const DIGITAL_NOTE = (size: string) =>
  `Available now as a signed ${size} digital edition — or commission the original on cradled panel.`;

export const series: Series[] = [
  {
    slug: "inner",
    title: "Inner Worlds",
    cover: "/design-assets/inside-my-mind.jpg",
    meta: "3 works",
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
  },
  {
    slug: "family",
    title: "Family",
    cover: "/design-assets/family.jpg",
    meta: "4 works",
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
  },
  {
    slug: "watchers",
    title: "Dreamers",
    cover: "/design-assets/the-dreamer.jpg",
    meta: "2 works",
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
  },
  {
    slug: "carnival",
    title: "Carnival",
    cover: "/design-assets/carnival-1.jpg",
    meta: "3 works",
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
  },
  {
    slug: "revels",
    title: "Party",
    cover: "/design-assets/party-1.jpg",
    meta: "2 works",
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
  },
  {
    slug: "creatures",
    title: "Creature",
    cover: "/design-assets/creature-3.jpg",
    meta: "4 works · in progress",
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
  },
  {
    slug: "reveries",
    title: "Blue Reveries",
    cover: "/design-assets/blue-peace.jpg",
    meta: "3 works",
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
  },
];

/** Order shown on the home rail, with the per-card "N works →" label. */
export const railOrder: { slug: string; workCount: string }[] = [
  { slug: "inner", workCount: "3 works" },
  { slug: "family", workCount: "4 works" },
  { slug: "watchers", workCount: "2 works" },
  { slug: "carnival", workCount: "3 works" },
  { slug: "revels", workCount: "2 works" },
  { slug: "creatures", workCount: "4 works" },
  { slug: "reveries", workCount: "3 works" },
];

export function getSeries(slug: string): Series | undefined {
  return series.find((s) => s.slug === slug);
}
