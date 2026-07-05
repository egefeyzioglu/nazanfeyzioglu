/** Exhibition sections, in the order they appear on the Exhibitions page. */
export const EXHIBITION_CATEGORIES = ["solo", "fair", "group"] as const;

export type ExhibitionCategory = (typeof EXHIBITION_CATEGORIES)[number];

export const EXHIBITION_CATEGORY_LABELS: Record<ExhibitionCategory, string> = {
  solo: "Solo Exhibitions",
  fair: "Art Fairs",
  group: "Group Exhibitions",
};

/** Groups exhibition rows into their page sections; empty sections are skipped. */
export function groupExhibitions<T extends { category: ExhibitionCategory }>(
  rows: T[],
) {
  return EXHIBITION_CATEGORIES.map((category) => ({
    category,
    heading: EXHIBITION_CATEGORY_LABELS[category],
    entries: rows.filter((e) => e.category === category),
  })).filter((g) => g.entries.length > 0);
}
