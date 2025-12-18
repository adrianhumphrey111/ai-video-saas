import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export function createTRPCContext(opts: { headers: Headers }) {
  return { headers: opts.headers };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;
