/**
 * Read-side data access for the public pages (server components). The admin
 * panel mutates through tRPC; these queries always reflect the latest rows, so
 * public pages render dynamically.
 *
 * Each helper is wrapped in React cache() so identical calls within one
 * request are deduped — e.g. the page and the Sidebar both call getContent().
 */
import "server-only";

import { cache } from "react";

import { CONTENT_DEFAULTS } from "src/lib/content-keys";
import { groupExhibitions } from "src/lib/exhibitions";
import { db } from "src/server/db";
import { siteContent } from "src/server/db/schema";

export const getAllSeries = cache(() =>
  db.query.series.findMany({
    orderBy: (s, { asc }) => [asc(s.position)],
    with: { works: { orderBy: (w, { asc }) => [asc(w.position)] } },
  }),
);

export const getSeriesBySlug = cache((slug: string) =>
  db.query.series.findFirst({
    where: (s, { eq }) => eq(s.slug, slug),
    with: { works: { orderBy: (w, { asc }) => [asc(w.position)] } },
  }),
);

/** Series (in rail order) with their prints; series without prints are skipped. */
export const getPrintGroups = cache(async () => {
  const rows = await db.query.series.findMany({
    orderBy: (s, { asc }) => [asc(s.position)],
    with: { prints: { orderBy: (p, { asc }) => [asc(p.position)] } },
  });
  return rows.filter((s) => s.prints.length > 0);
});

/** Exhibitions grouped into their page sections; empty sections are skipped. */
export const getExhibitionGroups = cache(async () => {
  const rows = await db.query.exhibitions.findMany({
    orderBy: (e, { asc }) => [asc(e.position)],
  });
  return groupExhibitions(rows);
});

/** All site copy, with defaults filled in for any keys missing from the DB. */
export const getContent = cache(
  async (): Promise<Record<string, string>> => {
    const rows = await db.select().from(siteContent);
    const content: Record<string, string> = { ...CONTENT_DEFAULTS };
    for (const row of rows) content[row.key] = row.value;
    return content;
  },
);
