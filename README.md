# AI Avatar SaaS scaffold

Next.js App Router on Bun with shadcn/ui, tRPC, Supabase helpers, Drizzle, and Polar billing placeholders. Cloud Run/GCP worker hooks come later.

## Quickstart

```bash
cp .env.example .env.local  # fill Supabase + DATABASE_URL + Polar
bun install
bun dev
```

Visit http://localhost:3000 – the hero page shows a live tRPC health check.

## Drizzle (Postgres/Supabase)

- Edit `src/server/db/schema.ts` with your tables.
- Generate SQL: `bun run db:generate`
- Push to DB: `bun run db:push`

`drizzle.config.ts` expects `DATABASE_URL` (Supabase connection string works).

## Supabase helpers

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## tRPC

- Router: `src/server/api/root.ts` and `src/server/api/routers/*`
- Handler: `src/app/api/trpc/[trpc]/route.ts`
- React Query provider: `src/app/providers.tsx`

Use `api.health.ping` as a reference in `src/components/health-ping.tsx`.

## UI

- Tailwind 3 + shadcn/ui primitives (example button in `src/components/ui/button.tsx`)
- Global tokens set in `src/app/globals.css` and `tailwind.config.ts`

## Billing

Polar env placeholders are in `.env.example`; wire up the API when ready.
