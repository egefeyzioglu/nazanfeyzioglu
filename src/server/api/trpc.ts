/**
 * tRPC bootstrap: context, initialization, and the procedure helpers.
 *
 * The admin panel is the only tRPC consumer — public pages read the database
 * directly in server components (src/server/queries.ts).
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";

import { getAdminStatus } from "src/server/auth";
import { db } from "src/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

/**
 * Ordered id list for the reorder mutations; duplicates would make the final
 * positions depend on write order, so they're rejected up front.
 */
export const uniqueIds = z
  .array(z.number().int())
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate ids");

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

/**
 * Procedure that requires a signed-in Clerk user with the `admin` role in
 * their public metadata. All CMS reads and mutations use this.
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { userId, isAdmin } = await getAdminStatus();
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Admin role required — set { \"role\": \"admin\" } in the user's public metadata in the Clerk dashboard.",
    });
  }
  return next({ ctx: { ...ctx, userId } });
});
