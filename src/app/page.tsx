import Link from "next/link";

import { HealthPing } from "@/components/health-ping";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Vercel + Bun",
    description: "Next.js App Router with Bun, ready for edge where it makes sense.",
  },
  {
    title: "Supabase",
    description: "Auth, Postgres, storage. Drizzle for schema + migrations.",
  },
  {
    title: "tRPC API",
    description: "End-to-end types with React Query hydration built in.",
  },
  {
    title: "Polar billing",
    description: "Subscriptions/entitlements; meter usage in the database.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
              <span className="text-lg font-semibold">AI</span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-blue-200/70">Avatar Studio</p>
              <p className="text-sm text-blue-100/60">Vercel + Supabase + GCP</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link href="https://github.com" target="_blank" rel="noreferrer">
                GitHub
              </Link>
            </Button>
            <Button asChild>
              <Link href="https://vercel.com/new" target="_blank" rel="noreferrer">
                Deploy to Vercel
              </Link>
            </Button>
          </div>
        </header>

        <main className="grid gap-10 lg:grid-cols-[1.7fr_1.1fr]">
          <section className="space-y-8 rounded-3xl border border-white/5 bg-white/5 p-10 shadow-xl shadow-blue-950/30 backdrop-blur">
            <div className="space-y-4">
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">
                AI avatar SaaS
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Spin up avatars, render UGC-ready videos, and ship fast.
              </h1>
              <p className="text-lg text-slate-200/80">
                Bun + Next.js, shadcn/ui, Supabase, tRPC, Drizzle, and Polar billing. Cloud Run handles the heavy GCP
                video jobs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/api/trpc/health.ping">Check API route</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="https://supabase.com" target="_blank" rel="noreferrer">
                  Supabase dashboard
                </Link>
              </Button>
              <HealthPing />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-blue-400/40"
                >
                  <p className="text-sm font-semibold text-blue-100">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-200/80">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4 rounded-3xl border border-white/5 bg-slate-950/80 p-8 shadow-xl shadow-slate-950/50">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Local quickstart</p>
            <ol className="space-y-3 text-sm text-slate-200/80">
              <li>
                1) Copy <code className="rounded bg-slate-900 px-2 py-1">.env.example</code> to{" "}
                <code className="rounded bg-slate-900 px-2 py-1">.env.local</code> and fill in Supabase + DB + Polar
                vars.
              </li>
              <li>
                2) Run <code className="rounded bg-slate-900 px-2 py-1">bun dev</code>
              </li>
              <li>
                3) Drizzle migrations: update <code className="rounded bg-slate-900 px-2 py-1">src/server/db/schema.ts</code>, then{" "}
                <code className="rounded bg-slate-900 px-2 py-1">bun run db:generate</code> and{" "}
                <code className="rounded bg-slate-900 px-2 py-1">bun run db:push</code>.
              </li>
            </ol>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-blue-100">Stack wiring done</p>
              <p className="mt-2 text-sm text-slate-200/80">
                tRPC endpoint is live, Supabase helpers are in <code className="rounded bg-slate-900 px-1.5">src/lib/supabase</code>, and
                Drizzle config is ready.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
