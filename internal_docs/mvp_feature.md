# AI Avatar UGC MVP — Feature/Schema Blueprint

This doc captures a fast-ship MVP for an AI avatar + UGC video tool (Arcads/HeyGen style) with a Supabase + tRPC + Cloud Run worker stack. It includes core user stories, feature list, flows, and a first-pass data model.

## Goals
- Let marketers/founders create short UGC-style ads with AI avatars.
- Provide a library of stock actors and user-created actors.
- Support prompt/script entry, voice selection, and video generation jobs with cloud workers.
- Gate usage by credits/billing (Polar) and basic team workspaces.

## Primary User Stories
1) As a user, I sign up/login and land in a workspace with a credit balance and project list.
2) I browse/select a stock actor or generate/upload my own (photo/prompt → avatar card).
3) I create a “video job” by picking an actor, entering a script/prompt, choosing voice and aspect ratio, and hitting Generate.
4) I see job status (queued/running/succeeded/failed), can preview/download the final video, and consume credits per job.
5) I can organize generated assets into projects/folders and mark favorites.
6) I can purchase credits/subscription via Polar; billing state maps to entitlements (limits per month, max duration, features like custom actors).
7) (Team optional for v1.5) I can invite teammates to the workspace and share assets.

## MVP Feature Set
- Auth & workspace: Supabase Auth; single-user workspace by default; optional org/team later.
- Actor library:
  - Stock actors (seeded entries).
  - User actors: generated from prompt + optional reference image, or uploaded photo to “talking head”.
  - Filters/tags (gender, age bucket, category, vibe).
- Script & config:
  - Text script input; optional prompt for visuals; aspect ratios (9:16, 1:1, 16:9).
  - Voice selection (stock voices; future: voice clone upload).
  - “Mode” presets: Talking actor / B-roll / Scene (roadmap).
- Video job:
  - Create job row → enqueue to worker (Cloud Run / PubSub).
  - Status updates pushed back via webhook; front polls tRPC.
  - Outputs stored (URL + thumbnail + duration).
- Credits/billing:
  - Polar subscription + one-time credit packs.
  - Entitlements: max duration per job, jobs/month, custom actors allowed, watermark on/off.
  - Credit ledger and usage metering.
- Asset library:
  - Projects/folders; list/paginate videos; favorite; download.
- Basic notifications:
  - In-app toasts + optional email when job completes (webhook triggers email later).

## Non-goals (post-MVP)
- Multi-actor scenes, gestures, timeline editor.
- Full template marketplace.
- Advanced voice cloning pipeline.
- Team roles/permissions with granular ACL.

## High-Level Flows
### Onboarding
1) Sign up → create default workspace (org) → seed free credits → show “New project” CTA.

### Actor creation/browse
1) Library view: stock + user actors with filters/search.
2) Create actor: prompt + (optional) image upload → create actor_job → status → card appears on success.
3) Actor detail shows thumbnail, tags, and allowed uses (duration cap).

### Video generation
1) Choose actor → enter script (text) + select voice + aspect ratio + duration cap check.
2) Create video_job (queued); decrement credits (or hold) based on plan.
3) Worker generates, writes output_url + thumb + duration; emits job_event.
4) UI polls or receives webhook → status updates → preview/download.

### Billing/credits
1) User buys subscription via Polar → webhook updates plan/entitlements on workspace.
2) Each job records credit_charge rows; block if insufficient credits.

### Library/projects
1) Projects list; each project holds videos (and can later hold actors/templates).
2) Favorites and downloads tracked for quick access.

## Data Model (Supabase/Drizzle draft)
Use UUID primary keys; timestamps default now(); soft-delete optional.

- users (Supabase auth handles identity)
  - id (uuid, pk)
  - email, name

- workspaces
  - id (uuid, pk)
  - owner_user_id (uuid)
  - name
  - plan_tier (free|starter|pro|team|enterprise)
  - plan_renews_at (timestamptz)
  - credits_balance (int)
  - watermark_enabled (bool)

- workspace_members (for future teams)
  - workspace_id (fk)
  - user_id (fk)
  - role (owner|admin|editor|viewer)

- actors
  - id (uuid)
  - workspace_id (fk, nullable for stock)
  - name
  - kind (stock|user_generated|uploaded)
  - gender (enum), age_bucket (enum), tags (text[])
  - thumb_url
  - status (ready|processing|failed)
  - source_prompt (text)
  - reference_asset_id (fk to assets, optional)

- actor_jobs (for generation of actors)
  - id, workspace_id, actor_id (nullable until success), status, error, created_by

- voices (lookup)
  - id, name, provider, gender, locale, premium (bool)

- projects
  - id, workspace_id, name, description

- videos
  - id, workspace_id
  - project_id (fk, nullable)
  - title
  - actor_id (fk)
  - voice_id (fk)
  - script (text)
  - prompt (text)
  - aspect_ratio (enum: 9_16|1_1|16_9)
  - duration_seconds (int)
  - output_url (text)
  - thumb_url (text)
  - status (ready|processing|failed)
  - watermark_applied (bool)

- video_jobs
  - id, workspace_id, video_id (nullable until success)
  - actor_id, voice_id
  - script, prompt
  - aspect_ratio, target_duration_seconds
  - status, error, created_by
  - output_url, thumb_url, duration_seconds
  - credit_cost (int)

- job_events
  - id, job_id, type (queued|started|progress|completed|failed), payload (jsonb)

- assets (generic uploads, images/audio/video)
  - id, workspace_id, kind (image|audio|video|other)
  - url, mime_type, size_bytes
  - used_in (jsonb optional)

- credit_ledger
  - id, workspace_id
  - delta (int, negative for spends)
  - reason (job, grant, refund)
  - reference_id (job/payment)

- plans (lookup)
  - code, name, monthly_price_cents, entitlements (jsonb: max_duration, jobs_per_month, custom_actors_allowed, watermark_off)

- payments
  - id, workspace_id
  - provider (polar)
  - provider_customer_id, provider_subscription_id
  - status, current_period_end

- favorites
  - id, workspace_id, user_id, target_type (video|actor), target_id

## MVP Screens (text mockups)
- Home/Dashboard:
  - Header: credits balance, “Buy credits”, user menu.
  - CTA buttons: “New video”, “New actor”, “Browse actors”.
  - Recent videos list with status badges.
- Actors Library:
  - Filters sidebar (gender, age, tags, stock/user).
  - Grid of actor cards (thumb, tags, status).
  - “Create actor” modal: prompt + image upload + aspect + Generate.
- New Video (wizard/card):
  - Select actor dropdown (with thumbs), voice select, aspect ratio pills.
  - Script textarea with live char count; “Generate” button shows credit cost.
  - Status banner on submit.
- Jobs/Status:
  - Table of jobs with status, created_at, duration, actor, actions (view video).
- Video Detail:
  - Player with download, copy link, add to project, favorite.
  - Metadata: actor, voice, duration, prompt/script.
- Billing:
  - Plan card (from Polar), “Manage subscription”, credit balance & ledger.

## API/Worker Notes
- tRPC endpoints:
  - actors.list/create/status
  - videos.list/create/status
  - jobs.list/status
  - billing.getPlan/updateFromWebhook
  - credits.ledger/balance
- Worker (Cloud Run):
  - Consumes video_jobs; calls model provider; uploads output to storage; calls webhook → updates job/video rows.
  - Optional: actor_jobs processor.

## Entitlement/Guardrails
- Before enqueue: check credits_balance and plan entitlements (max duration, custom actor allowed).
- On completion: finalize credit_ledger entry and deduct balance (or hold/release).
- Watermark toggle by plan_tier or watermark_enabled flag.

## Next Steps
- Refine entitlements JSON structure.
- Define provider adapters (GCP video gen, TTS).
- Add audit columns (created_at/by, updated_at/by) to tables.
- Sketch UI components for library cards and job rows in Figma or simple wireframes.
