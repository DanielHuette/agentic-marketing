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
│ metrics · reports · hits                                      │
│ triggers: approval refused for unbacked figures, scheduling   │
│ functions: start_campaign, pause_campaign, record_hit         │
└───────┬───────────────────────────────┬───────────────────────┘
        │ signed-in operator            │ service key
        ▼                               ▼
┌── Cockpit (PWA) ──────────┐   ┌── GitHub Actions ─────────────────┐
│ Preact, Vite, Cloudflare  │   │ hourly: publish                   │
│ review, approve,          │   │ daily: metrics, Mondays: report   │
│ start, record             │   └──────────────┬────────────────────┘
└───────────────────────────┘                  │ one commit per run
                                               ▼
                          ┌── target repositories ───────────────────┐
                          │ RepoCity-RadarAuditor: site/blog/        │
                          │ agentic-marketing: web/beispiel-blog/    │
                          │ push → Cloudflare Pages                  │
                          └──────────────┬───────────────────────────┘
                                         │ zaehler.js, public key
                                         ▼
                                  record_hit → hits
```

## Package modules

| Module | Responsibility |
|---|---|
| `campaign` | read a campaign folder, collect the findings of its runs with verdict and decision, figure guard, hand-over to the cockpit |
| `cockpit` | thin client for the REST interface of schema `marketing`, with timeouts and retries on transient errors |
| `blog` | read targets, render post page, index, feed and counter script |
| `github` | write several files in one commit through the Git data interface, retrying when the branch moved |
| `publisher` | publish due blog posts, report due LinkedIn posts, close campaigns whose time is up |
| `metrics` | fold one day of hits into results per post; simulation for example campaigns |
| `campaign_report` | write the weekly report against the goals |
| `example_run` | replay an example campaign with a simulated clock; refuses real campaigns |

The research modules (`verify`, `judge`, `review`, `compact`, `pack`, `freshness`) are unchanged;
campaigns build on their results.

## Data model

| Table | Content | Key |
|---|---|---|
| `campaigns` | goal, audience, target blog, duration, time of day, goals, status, start and end | `slug` |
| `findings` | findings of the campaign with figures, source, verdict, quoted sentence | `(campaign_id, key)` |
| `posts` | channel, text, offset, status, unbacked figures, free figures, moment, version | `(campaign_id, channel, slug)` |
| `post_findings` | which findings a post cites | `(post_id, finding_id)` |
| `events` | history: who did what when | |
| `metrics` | reads, clicks, inquiries per post and day, with their source | `(post_id, day, source)` |
| `reports` | weekly reports | `(campaign_id, period_end)` |
| `hits` | raw counts: day, host, path, campaign parameters | |

Result sources: `counter` (counted), `manual` (entered), `simulated` (example). Every write is
repeatable: hand-over, folding and reports write through unique keys and create no duplicates
on a second run.

## Security

| Rule | Implementation |
|---|---|
| only the operator decides | row level security: signed-in users may do everything, anonymous ones nothing; sign-ups off |
| no figure without a source | guard on hand-over, while editing in the app, and in a database trigger that refuses approval even with the service key |
| service key never in a browser | only as GitHub secret and in the local `.env` |
| public key can only count | the anonymous role may execute `record_hit` and nothing else; the function checks host and field lengths |
| no automatic LinkedIn posts | LinkedIn posts are posted and marked by hand |
| the example never touches real campaigns | `example_run` refuses campaigns without the example flag and publishes for that one campaign only |

## Design decisions

| Decision | Rejected alternative | Reason |
|---|---|---|
| GitHub Actions as scheduler | n8n on Hugging Face, Zapier, Make | reliable, free, versioned and reviewable; the n8n space sleeps after 48 hours, Zapier and Make charge per run and live outside the repository |
| publishing as a commit | writing through a hosting interface | every publication can be traced and reverted, and the site stays static |
| cookie-free counter in Supabase | Cloudflare analytics | the available Cloudflare token cannot read analytics; the own counter needs no further key, no consent, and counts clicks per post |
| LinkedIn by hand | LinkedIn interface | posting on a person's behalf needs a reviewed LinkedIn app, which is out of proportion for three posts a month |
| guard in the database too | Python and app only | a rule only clients enforce is bypassed by any other client |
| moments from start day and offset | fixed dates per post | a campaign can be ready weeks ahead with no date to edit at the start |
| simulated clock for the example | letting the example run for three weeks | a complete run is visible at once and uses the same code as live operation |
| marketing tables in the RadarAuditor project | own Supabase project | the free tier allows two projects; the own schema keeps the data apart |

## Setting up from scratch

1. **Supabase:** create a project (or reuse one), run `supabase/migrations/001_marketing.sql` to
   `004_free_figures.sql` in order in the SQL editor. Under Authentication switch sign-ups off,
   create the operator account and add the app address as redirect URL under **URL
   Configuration** (`https://app.agenticmarketing.speedofthespirit.dev/**`).
2. **Targets:** adapt `config/targets.yaml`, with one template folder per target under
   `config/templates/<name>/` holding `post.html` and `index.html`. The target repository keeps
   the static `blog.css`; index, feed and `zaehler.js` are written by
   `agentic-marketing site <target> --out <checkout>`.
3. **GitHub secrets** of `agentic-marketing`: `AGENTIC_MARKETING_SUPABASE_URL`,
   `AGENTIC_MARKETING_SUPABASE_SERVICE_KEY`, `AGENTIC_MARKETING_SUPABASE_ANON_KEY`,
   `AGENTIC_MARKETING_GITHUB_TOKEN` (write access to the target repositories). A target repository
   that deploys itself needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. **App:** connect a Cloudflare Pages project to this repository, root `app`, build
   `npm ci && npm run build`, output `dist`, variables `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=22`, and add the custom domain.
5. **Check:** start "Publish due posts" and "Measure and report" by hand; both must pass.

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
