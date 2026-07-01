/**
 * Mock data for the Prints page: signed limited-edition giclée prints grouped
 * by series. Sizes and pricing are still being finalised, so `price` is a
 * placeholder em dash for now.
 */

export type Print = {
  title: string;
  image: string;
  /** e.g. "Giclée print · 37 × 49 in" or "Giclée print · size TBD". */
  spec: string;
  /** e.g. "Edition of 20 · 1:1 scale" or "Edition of 20". */
  edition: string;
};

export type PrintGroup = {
  series: string;
  count: string;
  prints: Print[];
};

const E20_11 = "Edition of 20 · 1:1 scale";
const E20 = "Edition of 20";

export const printGroups: PrintGroup[] = [
  {
    series: "Inner Worlds",
    count: "3 prints",
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
    series: "Family",
    count: "4 prints",
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
    series: "Dreamers",
    count: "2 prints",
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
    series: "Carnival",
    count: "3 prints",
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
    series: "Party",
    count: "2 prints",
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
    series: "Creature",
    count: "4 prints",
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
    series: "Blue Reveries",
    count: "3 prints",
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
