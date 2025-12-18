import { healthRouter } from "./routers/health";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
});

export const createCaller = createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;
