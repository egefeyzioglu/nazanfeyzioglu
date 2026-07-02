import { sql } from "drizzle-orm";
import { z } from "zod";

import { CONTENT_FIELDS } from "src/lib/content-keys";
import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";
import { siteContent } from "src/server/db/schema";

const KNOWN_KEYS = new Set(CONTENT_FIELDS.map((f) => f.key));

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
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unknown = input.entries.find((e) => !KNOWN_KEYS.has(e.key));
      if (unknown) {
        throw new Error(`Unknown content key: ${unknown.key}`);
      }
      await Promise.all(
        input.entries.map((e) =>
          ctx.db
            .insert(siteContent)
            .values(e)
            .onConflictDoUpdate({
              target: siteContent.key,
              set: { value: e.value, updatedAt: sql`(unixepoch())` },
            }),
        ),
      );
    }),
});
