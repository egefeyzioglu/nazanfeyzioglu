import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  uniqueIds,
} from "src/server/api/trpc";
import { prints, series, works } from "src/server/db/schema";

const slugSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, digits and hyphens only");

const seriesFields = {
  title: z.string().min(1).max(256),
  coverImage: z.string().min(1),
  coverWidth: z.number().int().positive(),
  coverHeight: z.number().int().positive(),
  statusNote: z.string().max(256).nullish(),
};

export const seriesRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.series.findMany({
      orderBy: (s, { asc }) => [asc(s.position)],
      with: {
        works: { columns: { id: true } },
        prints: { columns: { id: true } },
      },
    });
    return rows.map(({ works: w, prints: p, ...s }) => ({
      ...s,
      workCount: w.length,
      printCount: p.length,
    }));
  }),

  byId: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ ctx, input }) =>
      ctx.db.query.series.findFirst({
        where: (s, { eq }) => eq(s.id, input.id),
        with: { works: { orderBy: (w, { asc }) => [asc(w.position)] } },
      }),
    ),

  create: adminProcedure
    .input(z.object({ slug: slugSchema, ...seriesFields }))
    .mutation(async ({ ctx, input }) => {
      const [{ max }] = (await ctx.db
        .select({ max: sql<number>`coalesce(max(${series.position}), -1)` })
        .from(series)) as [{ max: number }];
      const [row] = await ctx.db
        .insert(series)
        .values({ ...input, position: max + 1 })
        .returning();
      return row;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        slug: slugSchema,
        ...seriesFields,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const [row] = await ctx.db
        .update(series)
        .set(values)
        .where(eq(series.id, id))
        .returning();
      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      // Postgres would cascade these via the FK, but the explicit deletes
      // keep the full effect of this mutation visible in one place.
      await ctx.db.transaction(async (tx) => {
        await tx.delete(works).where(eq(works.seriesId, input.id));
        await tx.delete(prints).where(eq(prints.seriesId, input.id));
        await tx.delete(series).where(eq(series.id, input.id));
      });
    }),

  reorder: adminProcedure
    .input(z.object({ ids: uniqueIds }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const [position, id] of input.ids.entries()) {
          await tx.update(series).set({ position }).where(eq(series.id, id));
        }
      });
    }),
});
