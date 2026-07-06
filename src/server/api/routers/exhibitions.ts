import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  uniqueIds,
} from "src/server/api/trpc";
import { EXHIBITION_CATEGORIES, exhibitions } from "src/server/db/schema";

const exhibitionFields = {
  category: z.enum(EXHIBITION_CATEGORIES),
  name: z.string().min(1).max(256),
  location: z.string().min(1).max(256),
  date: z.string().min(1).max(128),
};

export const exhibitionsRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.query.exhibitions.findMany({
      orderBy: (e, { asc }) => [asc(e.position)],
    }),
  ),

  create: adminProcedure
    .input(z.object(exhibitionFields))
    .mutation(async ({ ctx, input }) => {
      const [{ max }] = (await ctx.db
        .select({
          max: sql<number>`coalesce(max(${exhibitions.position}), -1)`,
        })
        .from(exhibitions)) as [{ max: number }];
      const [row] = await ctx.db
        .insert(exhibitions)
        .values({ ...input, position: max + 1 })
        .returning();
      return row;
    }),

  update: adminProcedure
    .input(z.object({ id: z.number().int(), ...exhibitionFields }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const [row] = await ctx.db
        .update(exhibitions)
        .set(values)
        .where(eq(exhibitions.id, id))
        .returning();
      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) =>
      ctx.db.delete(exhibitions).where(eq(exhibitions.id, input.id)),
    ),

  reorder: adminProcedure
    .input(z.object({ ids: uniqueIds }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const [position, id] of input.ids.entries()) {
          await tx
            .update(exhibitions)
            .set({ position })
            .where(eq(exhibitions.id, id));
        }
      });
    }),
});
