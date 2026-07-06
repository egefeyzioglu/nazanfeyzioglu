import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  uniqueIds,
} from "src/server/api/trpc";
import { works } from "src/server/db/schema";

const workFields = {
  title: z.string().min(1).max(256),
  image: z.string().min(1),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  medium: z.string().min(1),
  price: z.string().max(128).nullish(),
  digital: z.boolean(),
  note: z.string().nullish(),
};

export const worksRouter = createTRPCRouter({
  create: adminProcedure
    .input(z.object({ seriesId: z.number().int(), ...workFields }))
    .mutation(async ({ ctx, input }) => {
      const [{ max }] = (await ctx.db
        .select({ max: sql<number>`coalesce(max(${works.position}), -1)` })
        .from(works)
        .where(eq(works.seriesId, input.seriesId))) as [{ max: number }];
      const [row] = await ctx.db
        .insert(works)
        .values({ ...input, position: max + 1 })
        .returning();
      return row;
    }),

  update: adminProcedure
    .input(z.object({ id: z.number().int(), ...workFields }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const [row] = await ctx.db
        .update(works)
        .set(values)
        .where(eq(works.id, id))
        .returning();
      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) =>
      ctx.db.delete(works).where(eq(works.id, input.id)),
    ),

  reorder: adminProcedure
    .input(z.object({ seriesId: z.number().int(), ids: uniqueIds }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const [position, id] of input.ids.entries()) {
          await tx
            .update(works)
            .set({ position })
            .where(and(eq(works.id, id), eq(works.seriesId, input.seriesId)));
        }
      });
    }),
});
