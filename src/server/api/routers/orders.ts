import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { captureServerEvent } from "src/lib/posthog-server";
import { TRACKING_CARRIER_IDS } from "src/lib/orders";
import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";
import { orders } from "src/server/db/schema";
import { fulfillOrder, resendShippingEmail } from "src/server/fulfillment";

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
        trackingCarrier: z.enum(TRACKING_CARRIER_IDS).nullable().optional(),
        trackingNumber: z.string().trim().max(128).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.fulfillmentStatus === "fulfilled") {
        const result = await fulfillOrder({
          id: input.id,
          trackingCarrier: input.trackingCarrier ?? null,
          trackingNumber: input.trackingNumber ?? null,
        });
        if (!result) throw new TRPCError({ code: "NOT_FOUND" });
        captureServerEvent(ctx.userId, "order_fulfillment_updated", {
          order_id: result.order.id,
          fulfillment_status: result.order.fulfillmentStatus,
          item_type: result.order.itemType,
          tracking_provided: Boolean(result.order.trackingNumber),
          shipping_email: result.shippingEmail,
        });
        return result;
      }

      const [row] = await ctx.db
        .update(orders)
        .set({ fulfillmentStatus: input.fulfillmentStatus })
        .where(eq(orders.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      captureServerEvent(ctx.userId, "order_fulfillment_updated", {
        order_id: row.id,
        fulfillment_status: row.fulfillmentStatus,
        item_type: row.itemType,
        tracking_provided: Boolean(row.trackingNumber),
        shipping_email: "not_applicable",
      });
      return { order: row, shippingEmail: "not_applicable" as const };
    }),

  resendShippingEmail: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const result = await resendShippingEmail(input.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),
});
