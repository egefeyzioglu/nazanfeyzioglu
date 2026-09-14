import { eq } from "drizzle-orm";
import { z } from "zod";

import { captureServerEvent } from "src/lib/posthog-server";
import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";
import { orderItems, orders } from "src/server/db/schema";

export const ordersRouter = createTRPCRouter({
  /** All orders with their lines, newest first. Money is managed in Stripe; this is fulfillment. */
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.query.orders.findMany({
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      with: { items: { orderBy: (i, { asc }) => [asc(i.id)] } },
    }),
  ),

  /**
   * Manual fulfillment toggle. `oversold` is only ever set by the webhook;
   * resolving one (usually by refunding in Stripe) moves it here too.
   */
  setFulfillment: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        fulfillmentStatus: z.enum(["pending", "fulfilled"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(orders)
        .set({ fulfillmentStatus: input.fulfillmentStatus })
        .where(eq(orders.id, input.id))
        .returning();
      if (row) {
        const items = await ctx.db
          .select({ itemType: orderItems.itemType })
          .from(orderItems)
          .where(eq(orderItems.orderId, row.id));
        captureServerEvent(ctx.userId, "order_fulfillment_updated", {
          order_id: row.id,
          fulfillment_status: row.fulfillmentStatus,
          item_types: [...new Set(items.map((i) => i.itemType))],
        });
      }
      return row;
    }),
});
