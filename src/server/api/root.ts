import { healthRouter } from "./routers/health";
import { uploadsRouter } from "./routers/uploads";
import { elementsRouter } from "./routers/elements";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
  uploads: uploadsRouter,
  elements: elementsRouter,
});

export const createCaller = createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;
