# Architecture and setup

[Deutsche Fassung](ARCHITEKTUR.de.md)

## Components

```
┌──────────────── workspace (files, Git) ───────────────────────┐
│ research runs → verify → decisions.json → curated files       │
│ kampagnen/<name>/kampagne.yaml, beitraege/*.md                │
└───────────────────────────────┬───────────────────────────────┘
                                │ agentic-marketing campaign (figure guard)
                                ▼
┌──────────────── Supabase, schema marketing ───────────────────┐
│ campaigns · findings · posts · post_findings · events         │
│ metrics · reports · view plan                                 │
│ triggers: approval refused for unbacked figures, scheduling,  │
│           reports to the Cockpit                              │
│ functions: start_campaign, pause_campaign, remind_due         │
│ pg_cron: remind_due every hour at minute 23                   │
└───────┬───────────────────────────────┬───────────────────────┘
        │ signed-in operator            │ cockpit.notify_safe
        ▼                               ▼
┌── App (PWA) ──────────────┐   ┌── RepoCity Cockpit ───────────────┐
│ Preact, Vite, Cloudflare  │   │ "Beitrag zur Freigabe"            │
│ campaigns, planner,       │   │ "Jetzt posten"                    │
│ approve, start, record    │   │ "Veröffentlicht"                  │
└─────────────┬─────────────┘   └───────────────────────────────────┘
              │ copy the text, post it from the company account
              ▼
   blog, LinkedIn, X, XING, Instagram, Facebook, Threads, YouTube,
   TikTok, Reddit, forum, press, newsletter → "Als gepostet markieren"
```

Nothing is published by a machine. The database decides when a post is due; the person posts it
by hand and marks it as posted.

## Package modules

| Module | Responsibility |
|---|---|
| `verify`, `sources` | look every figure up in the source it names, across spellings; snapshot and digest each source |
| `judge` | second pass through a forced tool call that must quote the passage it relies on |
| `review`, `compact` | build the decision page, write the curated file from run and decisions alone |
| `pack`, `freshness` | measure the session context, report curated points that are due again |
| `campaign` | read a campaign folder, collect the findings of its runs with verdict and decision, figure guard, hand-over to the database |
| `cockpit` | thin client for the REST interface of schema `marketing`, with timeouts and retries on transient errors |

## Data model

| Table or view | Content | Key |
|---|---|---|
| `campaigns` | goal, audience, duration, time of day, goals, status, start and end | `slug` |
| `findings` | findings of the campaign with figures, source, verdict, quoted sentence | `(campaign_id, key)` |
| `posts` | channel, text, offset, date chosen in the planner, status, unbacked figures, free figures, moment, version | `(campaign_id, channel, slug)` |
| `post_findings` | which findings a post cites | `(post_id, finding_id)` |
| `events` | history: who did what when | |
| `metrics` | impressions, clicks, inquiries per post and day, with their source | `(post_id, day, source)` |
| `reports` | weekly reports | `(campaign_id, period_end)` |
| `plan` (view) | every post of the real campaigns with the moment it appears on the calendar | |
| `hits` | raw counts of the former blog counter; no longer filled | |

Channels: blog, LinkedIn, X, XING, Instagram, Facebook, Threads, YouTube, TikTok, Reddit, forum,
press, newsletter. Posts that belong to no campaign live in the standing campaign `laufend`.
Every write is repeatable: the hand-over writes through unique keys and creates no duplicates on
a second run.

## Security

| Rule | Implementation |
|---|---|
| only the administrator decides | row level security: everyone signed in reads, only `public.is_admin()` writes; start and pause refuse other accounts; sign-ups off |
| no figure without a source | guard on hand-over, while typing in the app, and in a database trigger that refuses approval even with the service key |
| service key never in a browser | only in the local `.env` of the operator |
| no automatic posting | every channel is posted by hand from the company account and marked in the app |
| a failing message never blocks a post | the Cockpit is called through `cockpit.notify_safe`, which turns any error into a warning |

## Design decisions

| Decision | Rejected alternative | Reason |
|---|---|---|
| every channel posted by hand from the planner | publishing jobs that push to a blog repository | one way for thirteen channels instead of a special path for the blog; no publishing key in a scheduled job |
| reminder in the database (pg_cron) | a scheduler outside the database | the moment of a post already lives in the database; the reminder runs where the data is |
| messages through the Cockpit | e-mail per post | approvals and due posts land where the other RepoCity apps report too |
| date chosen in the planner wins over the offset | only start day plus offset | daily posts outside a campaign need a date of their own |
| guard in the database too | Python and app only | a rule only clients enforce is bypassed by any other client |
| marketing tables in the shared Supabase project | own Supabase project | the free tier allows two projects; the own schema keeps the data apart |

## Setting up from scratch

1. **Supabase:** in a project that already holds `public.is_admin()` (RadarAuditor
   `005_roles.sql`) and `cockpit.notify_safe()` (RepoCity Cockpit), with the `pg_cron` extension
   switched on, run `supabase/migrations/001_marketing.sql` to `006_planer.sql` in order in the SQL
   editor. Under Authentication switch sign-ups off, create the operator account and add the app
   address as redirect URL under **URL Configuration**
   (`https://app.agenticmarketing.speedofthespirit.dev/**`).
2. **App:** connect a Cloudflare Pages project to this repository, root `app`, build
   `npm ci && npm run build`, output `dist`, variables `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=22`, and add the custom domain
   `app.agenticmarketing.speedofthespirit.dev`.
3. **Project page:** a second Cloudflare Pages project on the same repository, no build command,
   output folder `web`, custom domain `agenticmarketing.speedofthespirit.dev`.
4. **Operator PC:** `.env` from `.env.example` with `AGENTIC_MARKETING_WORKSPACE`,
   `AGENTIC_MARKETING_SUPABASE_URL` and `AGENTIC_MARKETING_SUPABASE_SERVICE_KEY` for
   `agentic-marketing campaign`.

## Developing locally

```bash
uv sync
uv run ruff check && uv run ruff format --check && uv run mypy src tests && uv run pytest

cd app
npm ci
cp .env.example .env.local     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
npm run check && npm test
```
