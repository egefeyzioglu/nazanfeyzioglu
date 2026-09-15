import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { captureServerEvent } from "src/lib/posthog-server";
import { TRACKING_CARRIER_IDS } from "src/lib/orders";
import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";
import { db } from "src/server/db";
import {
  fulfillOrder,
  resendShippingEmail,
  revertFulfillment,
} from "src/server/fulfillment";

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

      const row = await revertFulfillment(input.id);
      if (!row) {
        // The UI only offers "Mark pending" on fulfilled orders; a direct
        // call for anything else is rejected rather than silently applied.
        const exists = await db.query.orders.findFirst({
          where: (o, { eq }) => eq(o.id, input.id),
          columns: { id: true },
        });
        throw new TRPCError(
          exists
            ? {
                code: "CONFLICT",
                message: "Only fulfilled orders can be marked pending",
              }
            : { code: "NOT_FOUND" },
        );
      }
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
