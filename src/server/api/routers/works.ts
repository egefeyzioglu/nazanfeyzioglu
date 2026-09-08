import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  uniqueIds,
} from "src/server/api/trpc";
import { getSoldOriginalIds } from "src/server/orders";
import { works } from "src/server/db/schema";

const workFields = {
  title: z.string().min(1).max(256),
  image: z.string().min(1),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  medium: z.string().min(1),
  price: z.string().max(128).nullish(),
  digital: z.boolean(),
  digitalPriceCents: z.number().int().positive().nullish(),
  note: z.string().nullish(),
};

export const worksRouter = createTRPCRouter({
  originals: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.series.findMany({
      orderBy: (s, { asc }) => [asc(s.position)],
      with: {
        works: {
          where: (w, { eq }) => eq(w.digital, false),
          orderBy: (w, { asc }) => [asc(w.position)],
        },
      },
    });
    const sold = await getSoldOriginalIds(
      rows.flatMap((s) => s.works.map((w) => w.id)),
    );
    return rows
      .filter((s) => s.works.length > 0)
      .map((s) => ({
        ...s,
        works: s.works.map((w) => ({ ...w, originalSold: sold.has(w.id) })),
      }));
  }),

  setOriginalSale: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        originalPriceCents: z
          .number()
          .int()
          .positive()
          .max(99999999)
          .nullable(),
        originalUnavailable: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const [row] = await ctx.db
        .update(works)
        .set(values)
        .where(and(eq(works.id, id), eq(works.digital, false)))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Original not found. Refresh the page and try again.",
        });
      return row;
    }),

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
