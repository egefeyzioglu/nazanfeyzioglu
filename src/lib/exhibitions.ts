/** Exhibition sections, in the order they appear on the Exhibitions page. */
export const EXHIBITION_CATEGORIES = ["solo", "fair", "group"] as const;

export type ExhibitionCategory = (typeof EXHIBITION_CATEGORIES)[number];

export const EXHIBITION_CATEGORY_LABELS: Record<ExhibitionCategory, string> = {
  solo: "Solo Exhibitions",
  fair: "Art Fairs",
  group: "Group Exhibitions",
};
