/** Physical artwork dimensions in inches, excluding the white border. */
export type PrintDimensions = {
  imageWidthInches: number | null;
  imageHeightInches: number | null;
};

/** Formats image and paper sizes as height × width in inches, with a 1-inch border. */
export function getPrintSizes({
  imageWidthInches: width,
  imageHeightInches: height,
}: PrintDimensions) {
  if (
    width === null ||
    height === null ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return {
    image: `${height} × ${width} in`,
    paper: `${Number((height + 2).toFixed(6))} × ${Number((width + 2).toFixed(6))} in`,
  };
}

/** Generates the compact catalogue and checkout description from dimensions. */
export function formatPrintSpec(dimensions: PrintDimensions) {
  return `Giclée print · ${getPrintSizes(dimensions)?.image ?? "size TBD"}`;
}

/** DOM id of a print's row on the Prints page, used for deep links from series pages. */
export function printAnchorId(printId: number) {
  return `print-${printId}`;
}

/** Path to a print's row on the Prints page. */
export function printHref(printId: number) {
  return `/prints#${printAnchorId(printId)}`;
}

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Finds the print edition of a work within the same series, matched by title
 * (case- and whitespace-insensitive). Returns null when the series has no
 * print with that title.
 */
export function findMatchingPrint<T extends { title: string }>(
  workTitle: string,
  prints: readonly T[],
): T | null {
  const wanted = normalizeTitle(workTitle);
  return prints.find((p) => normalizeTitle(p.title) === wanted) ?? null;
}

/** Group independent inventory records into a single catalogue entry. */
export function groupPrintVariants<
  T extends { id: number; parentPrintId?: number | null },
>(prints: readonly T[]) {
  return prints
    .filter((p) => p.parentPrintId == null)
    .map((p) => ({
      ...p,
      variants: [p, ...prints.filter((v) => v.parentPrintId === p.id)],
    }));
}
