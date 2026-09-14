import "server-only";

import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "src/server/db";
import { orderItems, orders } from "src/server/db/schema";

/**
 * Copies of each print already sold (line quantities on non-refunded
 * orders). Prints with no sales are absent from the map. Used against
 * `prints.editionSize` to stop overselling; prints with a null editionSize
 * are never limited.
 */
export async function getSoldPrintQuantities(
  printIds: number[],
): Promise<Map<number, number>> {
  if (printIds.length === 0) return new Map();
  const rows = await db
    .select({
      printId: orderItems.printId,
      sold: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        inArray(orderItems.printId, printIds),
        ne(orders.paymentStatus, "refunded"),
      ),
    )
    .groupBy(orderItems.printId);
  return new Map(
    rows.flatMap((r) =>
      r.printId === null ? [] : [[r.printId, r.sold] as const],
    ),
  );
}

/** Remaining purchasable copies of a print, or null when unlimited. */
export function remainingCopies(
  editionSize: number | null,
  sold: number,
): number | null {
  if (editionSize === null) return null;
  return Math.max(0, editionSize - sold);
}

/** Paid originals only: digital sales of the same work do not affect stock. */
export async function getSoldOriginalIds(
  workIds: number[],
): Promise<Set<number>> {
  if (workIds.length === 0) return new Set();
  const rows = await db
    .select({ workId: orderItems.workId })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        inArray(orderItems.workId, workIds),
        eq(orderItems.itemType, "original"),
        ne(orders.paymentStatus, "refunded"),
      ),
    );
  return new Set(
    rows.flatMap((row) => (row.workId === null ? [] : [row.workId])),
  );
}
