/** Physical artwork dimensions in inches, excluding the white border. */
export type PrintDimensions = {
  imageWidthInches: number | null;
  imageHeightInches: number | null;
};

/** Formats image and paper sizes from physical dimensions, with a 2-inch border. */
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
    image: `${width} × ${height} in`,
    paper: `${Number((width + 4).toFixed(6))} × ${Number((height + 4).toFixed(6))} in`,
  };
}

/** Generates the compact catalogue and checkout description from dimensions. */
export function formatPrintSpec(dimensions: PrintDimensions) {
  return `Giclée print · ${getPrintSizes(dimensions)?.image ?? "size TBD"}`;
}
