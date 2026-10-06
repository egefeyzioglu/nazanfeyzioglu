import "server-only";

import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "src/server/db";
import { orders } from "src/server/db/schema";

/**
 * Copies of each print already sold online (non-refunded order quantities).
 * Prints with no sales are absent from the map. Used with
 * `prints.soldElsewhere` against `prints.editionSize` to stop overselling;
 * prints with a null editionSize are never limited.
 */
export async function getSoldPrintQuantities(
  printIds: number[],
): Promise<Map<number, number>> {
  if (printIds.length === 0) return new Map();
  const rows = await db
    .select({
      printId: orders.printId,
      sold: sql<number>`sum(${orders.quantity})::int`,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.printId, printIds),
        ne(orders.paymentStatus, "refunded"),
      ),
    )
    .groupBy(orders.printId);
  return new Map(
    rows.flatMap((r) =>
      r.printId === null ? [] : [[r.printId, r.sold] as const],
    ),
  );
}

/**
 * Remaining purchasable copies of a print, or null when unlimited. `sold`
 * counts online orders; `soldElsewhere` counts copies allocated offline.
 */
export function remainingCopies(
  editionSize: number | null,
  sold: number,
  soldElsewhere: number,
): number | null {
  if (editionSize === null) return null;
  return Math.max(0, editionSize - sold - soldElsewhere);
}

/** Paid originals only: digital sales of the same work do not affect stock. */
export async function getSoldOriginalIds(
  workIds: number[],
): Promise<Set<number>> {
  if (workIds.length === 0) return new Set();
  const rows = await db
    .select({ workId: orders.workId })
    .from(orders)
    .where(
      and(
        inArray(orders.workId, workIds),
        eq(orders.itemType, "original"),
        ne(orders.paymentStatus, "refunded"),
      ),
    );
  return new Set(
    rows.flatMap((row) => (row.workId === null ? [] : [row.workId])),
  );
}
