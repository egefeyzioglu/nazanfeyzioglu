import { z } from "zod";

import { CONTENT_FIELDS } from "src/lib/content-keys";
import { centsToDollarsString, dollarsStringToCents } from "src/lib/orders";
import { captureServerEvent } from "src/lib/posthog-server";
import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";
import { siteContent } from "src/server/db/schema";

const FIELDS_BY_KEY = new Map(CONTENT_FIELDS.map((f) => [f.key, f]));

export const contentRouter = createTRPCRouter({
  /** Every editable field with its current value (falling back to the default copy). */
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(siteContent);
    const values = new Map(rows.map((r) => [r.key, r.value]));
    return CONTENT_FIELDS.map((f) => ({
      ...f,
      value: values.get(f.key) ?? f.default,
    }));
  }),

  save: adminProcedure
    .input(
      z.object({
        entries: z
          .array(z.object({ key: z.string(), value: z.string() }))
          .min(1)
          .refine(
            (entries) =>
              new Set(entries.map((e) => e.key)).size === entries.length,
            "Duplicate content keys",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entries = input.entries.map((e) => {
        const field = FIELDS_BY_KEY.get(e.key);
        if (!field) throw new Error(`Unknown content key: ${e.key}`);
        if (field.kind !== "price") return e;
        // The price string is normalized by being parsed to an integer number
        // of cents then formatted again
        const value = dollarsStringToCents(e.value);
        if (value === null || !Number.isSafeInteger(value)) {
          throw new Error(
            `${field.label} must be a dollar amount such as 30 or 12.50`,
          );
        }
        return { key: e.key, value: centsToDollarsString(value) };
      });
      await ctx.db.transaction(async (tx) => {
        for (const e of entries) {
          await tx
            .insert(siteContent)
            .values(e)
            .onConflictDoUpdate({
              target: siteContent.key,
              set: { value: e.value, updatedAt: new Date() },
            });
        }
      });
      captureServerEvent(ctx.userId, "content_saved", {
        entry_count: input.entries.length,
      });
    }),
});
