import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";
import { orders } from "src/server/db/schema";

export const ordersRouter = createTRPCRouter({
  /** All orders, newest first. Money is managed in Stripe; this is fulfillment. */
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.query.orders.findMany({
      orderBy: (o, { desc }) => [desc(o.createdAt)],
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
      return row;
    }),
});
