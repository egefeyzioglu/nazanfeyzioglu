import { TRPCError } from "@trpc/server";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { formatPrintSpec } from "src/lib/prints";

import { captureServerEvent } from "src/lib/posthog-server";
import {
  adminProcedure,
  createTRPCRouter,
  uniqueIds,
} from "src/server/api/trpc";
import { prints } from "src/server/db/schema";
import { getSoldPrintQuantities, remainingCopies } from "src/server/orders";

const printFields = {
  title: z.string().min(1).max(256),
  image: z.string().min(1),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  imageWidthInches: z.number().finite().positive().nullable(),
  imageHeightInches: z.number().finite().positive().nullable(),
  edition: z.string().min(1),
  priceCents: z.number().int().positive().nullish(),
  editionSize: z.number().int().positive().nullish(),
};

export const printsRouter = createTRPCRouter({
  /**
   * All series (in rail order) with their prints, for the grouped admin view.
   * Each print carries `remaining` — purchasable copies left, or null when the
   * edition size is not enforced — so previews match the public prints page.
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.series.findMany({
      orderBy: (s, { asc }) => [asc(s.position)],
      columns: { id: true, title: true, slug: true },
      with: { prints: { orderBy: (p, { asc }) => [asc(p.position)] } },
    });
    const sold = await getSoldPrintQuantities(
      rows.flatMap((s) => s.prints.map((p) => p.id)),
    );
    return rows.map((s) => ({
      ...s,
      prints: s.prints.map((p) => ({
        ...p,
        remaining: remainingCopies(p.editionSize, sold.get(p.id) ?? 0),
      })),
    }));
  }),

  create: adminProcedure
    .input(
      z
        .object({
          seriesId: z.number().int(),
          parentPrintId: z.number().int().positive().optional(),
          ...printFields,
        })
        .refine(
          (p) =>
            (p.imageWidthInches === null) === (p.imageHeightInches === null),
          "Enter both image dimensions or leave both blank",
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const [{ max }] = (await ctx.db
        .select({ max: sql<number>`coalesce(max(${prints.position}), -1)` })
        .from(prints)
        .where(eq(prints.seriesId, input.seriesId))) as [{ max: number }];
      const row = await ctx.db.transaction(async (tx) => {
        if (input.parentPrintId !== undefined) {
          const [parent] = await tx
            .select()
            .from(prints)
            .where(eq(prints.id, input.parentPrintId))
            .for("update");
          if (
            parent?.parentPrintId !== null ||
            parent.seriesId !== input.seriesId
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Choose a print in this series for the new size.",
            });
          }
          const siblings = await tx
            .select()
            .from(prints)
            .where(
              or(eq(prints.id, parent.id), eq(prints.parentPrintId, parent.id)),
            );
          validateVariantSize(input, siblings);
        }
        const [created] = await tx
          .insert(prints)
          .values({ ...input, spec: formatPrintSpec(input), position: max + 1 })
          .returning();
        return created;
      });
      if (row) {
        captureServerEvent(ctx.userId, "print_created", {
          print_id: row.id,
          series_id: row.seriesId,
          has_price: row.priceCents != null,
          has_edition_limit: row.editionSize != null,
        });
      }
      return row;
    }),

  update: adminProcedure
    .input(
      z
        .object({ id: z.number().int(), ...printFields })
        .refine(
          (p) =>
            (p.imageWidthInches === null) === (p.imageHeightInches === null),
          "Enter both image dimensions or leave both blank",
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const row = await ctx.db.transaction(async (tx) => {
        const existing = await tx.query.prints.findFirst({
          where: eq(prints.id, id),
        });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const rootId = existing.parentPrintId ?? id;
        await tx
          .select({ id: prints.id })
          .from(prints)
          .where(eq(prints.id, rootId))
          .for("update");
        const siblings = await tx
          .select()
          .from(prints)
          .where(or(eq(prints.id, rootId), eq(prints.parentPrintId, rootId)));
        if (siblings.length > 1)
          validateVariantSize(
            values,
            siblings.filter((p) => p.id !== id),
          );
        const [updated] = await tx
          .update(prints)
          .set({ ...values, spec: formatPrintSpec(values) })
          .where(eq(prints.id, id))
          .returning();
        return updated;
      });
      if (row) {
        captureServerEvent(ctx.userId, "print_updated", {
          print_id: row.id,
          series_id: row.seriesId,
          has_price: row.priceCents != null,
          has_edition_limit: row.editionSize != null,
        });
      }
      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const child = await ctx.db.query.prints.findFirst({
        where: eq(prints.parentPrintId, input.id),
      });
      if (child)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Delete the additional sizes before deleting this print.",
        });
      const [row] = await ctx.db
        .delete(prints)
        .where(eq(prints.id, input.id))
        .returning({ id: prints.id, seriesId: prints.seriesId });
      if (row) {
        captureServerEvent(ctx.userId, "print_deleted", {
          print_id: row.id,
          series_id: row.seriesId,
        });
      }
    }),

  reorder: adminProcedure
    .input(z.object({ seriesId: z.number().int(), ids: uniqueIds }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const [position, id] of input.ids.entries()) {
          await tx
            .update(prints)
            .set({ position })
            .where(and(eq(prints.id, id), eq(prints.seriesId, input.seriesId)));
        }
      });
    }),
});

function validateVariantSize(
  size: { imageWidthInches: number | null; imageHeightInches: number | null },
  siblings: {
    imageWidthInches: number | null;
    imageHeightInches: number | null;
  }[],
) {
  if (
    size.imageWidthInches === null ||
    size.imageHeightInches === null ||
    siblings.some(
      (p) => p.imageWidthInches === null || p.imageHeightInches === null,
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter both dimensions for every size before adding variants.",
    });
  }
  if (
    siblings.some(
      (p) =>
        p.imageWidthInches === size.imageWidthInches &&
        p.imageHeightInches === size.imageHeightInches,
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Each variant must have a different size.",
    });
  }
}
