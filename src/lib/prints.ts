/** Read image dimensions in inches from the CMS print specification. */
export function getPrintSizes(spec: string) {
  const match =
    /(?:^|·)\s*(?:Giclée print\s*·\s*)?(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*in\s*$/i.exec(
      spec,
    );
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return {
    image: `${width} × ${height} in`,
    paper: `${width + 4} × ${height + 4} in`,
  };
}
