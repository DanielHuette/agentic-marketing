# Work report: from research tool to marketing system

[Deutsche Fassung](REFACTORING_REPORT.de.md)

## Starting point

**Context:** state before the extension | **Input:** version 0.1, project page, presentation | **Output:** gaps to close

| Finding | Change | Evidence |
|---|---|---|
| The project ended at the curated file; nothing was published | campaigns, cockpit, publishing, measuring and reporting added | `campaign`, `publisher`, `metrics`, `campaign_report`, `app/` |
| Slide 9 of the presentation showed no real values | new presentation with values from the cockpit and real screenshots | `web/praesentation/` |
| No place where a person approves | cockpit as installable web app | https://app.agenticmarketing.speedofthespirit.dev |
| No real application | real RadarAuditor campaign prepared, fictional example campaign run end to end | `workspaces/radarauditor/`, example blog |

## Database

**Context:** state shared by app and schedules | **Input:** Supabase project radarauditor | **Output:** schema `marketing`, four migrations

| Finding | Change | Evidence |
|---|---|---|
| Approvals, dates and counts need one shared place | schema `marketing` with eight tables and view `campaign_overview` | `supabase/migrations/001_marketing.sql` |
| Approving a post with an unbacked figure must be impossible, even around the app | trigger `schedule_on_approval` refuses it | REST call with the service key: `P0001 … figures without a checked source: {35}` |
| The dashboard switch for exposed schemas did not reach the server | `pgrst.db_schemas` set on the role, configuration reloaded | `002_hits.sql`; REST query answers 200 instead of `PGRST106` |
| Cloudflare token cannot read analytics | own cookie-free counter: table `hits`, function `record_hit` | `002_hits.sql`; anonymous call 204, anonymous read 401 |
| Free figures were lost when editing in the app | column `free_figures` | `004_free_figures.sql` |

## Package

**Context:** Python side: hand-over, publishing, measuring | **Input:** version 0.1 | **Output:** version 0.2.0

| Finding | Change | Evidence |
|---|---|---|
| Posts need the same figure check as findings | `unbacked_figures` with spellings, years, free figures, link addresses | `tests/test_campaign.py` |
| The date "1. Januar 2026" was split into single digits | figures written with words are taken out whole, same in Python and the app | tests in both languages |
| Pages, index and feed must go live together | one commit through the Git data interface, retried when the branch moved | `test_github_writer_retries_when_the_branch_moved` |
| Windows had no time zone database; every command failed at import | `tzdata` as a Windows dependency | run on Windows: `campaign` hands over both campaigns |
| The example needs a whole run without waiting three weeks | `example-run` with a simulated clock, same publishing code, examples only | `test_replay_publishes_an_example_on_its_days`, `test_replay_refuses_a_real_campaign` |
| The simulation went on after the campaign ended; totals grew daily | simulation ends on the campaign's last day, later rows are removed | `test_simulation_stops_at_the_end_of_a_campaign` |
| Real visits to the example blog would have mixed into simulated values | counting for real campaigns only | `test_fold_hits_leaves_example_campaigns_to_the_simulation` |
| Weekly reports for long-closed campaigns | reports only for running campaigns and those that ended in the past week | `test_a_closed_campaign_is_reported_once_more_and_then_not` |

## Cockpit

**Context:** the place where a person decides | **Input:** RadarAuditor app as template | **Output:** Preact PWA at app.agenticmarketing

| Finding | Change | Evidence |
|---|---|---|
| While editing, "Freigeben" stayed clickable for the stored version | decision panel waits until the edit is saved | browser run |
| The reject form stayed open after rejecting and hid "Freigeben" | the form closes on success | browser run |
| "Geht 0 Tage nach dem Start" | "am Starttag", "einen Tag nach dem Start" | browser run |
| Goals above 100 % showed as 100 % | real share, only the bar is capped | results: "118 % von 1.500" |
| Report tables showed as raw text | Markdown with tables, raw HTML still off | `markdown.test.ts` |
| The sign-in link landed on localhost | app address added as redirect URL in Supabase | sign-in in the browser |

## Websites

**Context:** target blogs and project pages | **Input:** agenticmarketing and radarauditor subdomains | **Output:** two blogs, counter active

| Finding | Change | Evidence |
|---|---|---|
| The content security policy blocked the counter | `connect-src` for Supabase on both sites | browser resource list: `record_hit 204` |
| The policy blocked the self-hosted fonts of the project page | `font-src 'self'` added | `web/_headers` |
| The RadarAuditor site was uploaded by hand | "Deploy site" workflow on every push to `site/` | GitHub Actions: success |

## Final check

**Context:** check according to section 10 of the standard | **Input:** repository state | **Output:** result per item

| Check | Result |
|---|---|
| `ruff check`, `ruff format --check` | passed |
| `mypy src tests` (strict) | passed, 43 files |
| `pytest` | passed |
| App: `tsc`, `eslint`, `vitest`, `vite build` | passed, 26 tests |
| CI on GitHub | green |
| "Publish due posts", "Measure and report" with the real secrets | green |
| Installation on Windows from the lock file | passed after the `tzdata` fix |
| Search for secrets in the repository | only the public Supabase key in the counter, on purpose |
| End to end in the browser: sign in, edit, guard, reject, approve, start, publish, measure, report | passed |
