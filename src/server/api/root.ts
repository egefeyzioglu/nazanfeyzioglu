import { contentRouter } from "src/server/api/routers/content";
import { exhibitionsRouter } from "src/server/api/routers/exhibitions";
import { printsRouter } from "src/server/api/routers/prints";
import { seriesRouter } from "src/server/api/routers/series";
import { worksRouter } from "src/server/api/routers/works";
import { createCallerFactory, createTRPCRouter } from "src/server/api/trpc";

/**
 * The primary router — all CMS procedures used by the admin panel.
 */
export const appRouter = createTRPCRouter({
  series: seriesRouter,
  works: worksRouter,
  prints: printsRouter,
  exhibitions: exhibitionsRouter,
  content: contentRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API, e.g.
 * const trpc = createCaller(await createTRPCContext({ headers: new Headers() }));
 */
export const createCaller = createCallerFactory(appRouter);
