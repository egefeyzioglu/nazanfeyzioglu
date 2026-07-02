import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";
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
      const rows = await ctx.db.select().from(exhibitions);
      const max = rows.reduce((m, r) => Math.max(m, r.position), -1);
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
    .input(z.object({ ids: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.ids.map((id, position) =>
          ctx.db
            .update(exhibitions)
            .set({ position })
            .where(eq(exhibitions.id, id)),
        ),
      );
    }),
});
