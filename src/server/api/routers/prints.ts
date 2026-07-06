import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  uniqueIds,
} from "src/server/api/trpc";
import { prints } from "src/server/db/schema";

const printFields = {
  title: z.string().min(1).max(256),
  image: z.string().min(1),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  spec: z.string().min(1),
  edition: z.string().min(1),
  price: z.string().max(128).nullish(),
};

export const printsRouter = createTRPCRouter({
  /** All series (in rail order) with their prints, for the grouped admin view. */
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.query.series.findMany({
      orderBy: (s, { asc }) => [asc(s.position)],
      columns: { id: true, title: true, slug: true },
      with: { prints: { orderBy: (p, { asc }) => [asc(p.position)] } },
    }),
  ),

  create: adminProcedure
    .input(z.object({ seriesId: z.number().int(), ...printFields }))
    .mutation(async ({ ctx, input }) => {
      const [{ max }] = (await ctx.db
        .select({ max: sql<number>`coalesce(max(${prints.position}), -1)` })
        .from(prints)
        .where(eq(prints.seriesId, input.seriesId))) as [{ max: number }];
      const [row] = await ctx.db
        .insert(prints)
        .values({ ...input, position: max + 1 })
        .returning();
      return row;
    }),

  update: adminProcedure
    .input(z.object({ id: z.number().int(), ...printFields }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const [row] = await ctx.db
        .update(prints)
        .set(values)
        .where(eq(prints.id, id))
        .returning();
      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) =>
      ctx.db.delete(prints).where(eq(prints.id, input.id)),
    ),

  reorder: adminProcedure
    .input(z.object({ seriesId: z.number().int(), ids: uniqueIds }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const [position, id] of input.ids.entries()) {
          await tx
            .update(prints)
            .set({ position })
            .where(
              and(eq(prints.id, id), eq(prints.seriesId, input.seriesId)),
            );
        }
      });
    }),
});
