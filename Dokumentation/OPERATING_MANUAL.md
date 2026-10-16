# Operating manual

[Deutsche Fassung](BETRIEBSANLEITUNG.de.md)

This manual covers day-to-day operation: from a checked research result through approval in
the cockpit to the published post and the weekly report. How the system is built and set up
from scratch is described in [ARCHITECTURE.md](ARCHITECTURE.md).

## The flow at a glance

```
research run ──verify──▶ findings with verdicts ──apply──▶ curated file
                                   │
                    kampagne.yaml + beitraege/*.md
                                   │  agentic-marketing campaign
                                   ▼
                    Cockpit: in review ──▶ approved ──▶ "Freigeben & starten"
                                   │
           hourly (GitHub Actions) │                 on its day, in the cockpit
                                   ▼                          ▼
                    blog post on the target          LinkedIn: posted by hand
                                   │
           daily 03:17 UTC         ▼
                    counter ──▶ results ──▶ weekly report on Mondays
```

Nothing goes out unless a person approved it in the cockpit. A figure without a checked source
blocks approval, in the app and again in the database.

## Addresses

| What | Address |
|---|---|
| Cockpit (app) | https://app.agenticmarketing.speedofthespirit.dev |
| Project page | https://agenticmarketing.speedofthespirit.dev |
| Example blog (fictional) | https://agenticmarketing.speedofthespirit.dev/beispiel-blog/ |
| RadarAuditor blog | https://radarauditor.speedofthespirit.dev/blog/ |
| Source code | https://github.com/DanielHuette/agentic-marketing |
| Schedules and their runs | https://github.com/DanielHuette/agentic-marketing/actions |

## Installing the app

The cockpit is an installable web app (progressive web app, PWA): it runs in the browser but can
be installed like a program and then opens in its own window with its own icon.

| Device | How |
|---|---|
| Windows or Mac with Chrome or Edge | open the address, sign in, then **Einstellungen → Auf diesem Gerät installieren**, or the install icon at the right of the address bar |
| Android | open the address in Chrome, menu **⋮ → Install app** |
| iPhone, iPad | open the address in Safari, **Share → Add to Home Screen** |

Updates arrive by themselves: Cloudflare rebuilds the app on every push, and the installed app
loads the new version on its next start.

## Signing in

Sign in with the operator account (email and password), the same account as in the RadarAuditor
cockpit. New accounts cannot be created; sign-ups are switched off in Supabase.

## The campaign overview

The start page shows every campaign as a card: status, how many posts wait for approval, what is
live and what it brought. Example campaigns carry a gold edge and the label **Beispiel · fiktiv**.

| Status | Meaning | What you can do |
|---|---|---|
| Startklar (ready) | posts exist, nothing is planned | review, approve, start |
| Läuft (running) | approved posts have dates | approve more, pause, post on LinkedIn |
| Pausiert (paused) | all dates are cleared | resume, which plans again |
| Abgeschlossen (done) | duration over, nothing left | read results and reports |

## Reviewing a campaign

Goal and audience at the top, the start panel below, then five tabs.

**Beiträge** is the board with five columns: in review, approved, post now (LinkedIn posts whose
moment has come), published, rejected.

**Recherche** lists every finding: statement, figures, dated source, the verdict of the check and
the sentence of the source that holds the figure.

**Ergebnisse** shows reads, clicks and inquiries against the campaign goals, per day and per
post. Simulated values of the example campaign are labelled as such.

**Berichte** holds the weekly reports, **Verlauf** every action with time and person.

## Deciding on a post

A card opens the post: on the left as readers will see it, on the right the decision and the
evidence, every cited finding with its figures, its source and the quoted sentence.

| Button | Effect |
|---|---|
| Freigeben | approves the post; in a running campaign it gets its date at once. Locked while the text shows a figure no finding backs. |
| Bearbeiten | edit title, summary and text, with the figure check running as you type. Saving creates a new version and sends the post back to review. |
| Ablehnen | asks for a reason and moves the post to rejected. |
| Zurück in die Prüfung | brings a rejected post back. |
| Freigabe zurückziehen | takes an approved, unpublished post out of the plan. |

The figure check knows every spelling of a number (`12.480`, `12,480`, `12480`) and lets years
and the digits of link addresses pass. A date such as "1. Januar 2026" counts as one figure when
a finding states it that way.

## Approve and start

Once at least one post is approved, **Freigeben & starten** turns gold. After the confirmation:

1. The campaign switches to running and stores its start day.
2. Every approved post gets its moment: start day plus its offset in days, at the campaign's time,
   German time. A moment in the past means "now".
3. Posts still in review stay behind until approved and are then planned by the same rule.

**Pausieren** clears all dates. **Fortsetzen** plans again from the original start day.

## Publishing

**Blog:** a GitHub workflow checks every hour at minute seven which posts are due, writes the
post page, the index, the RSS feed and the counter to the target repository in one commit and
marks the posts as published. The push deploys the site, so a post is visible up to a little over
an hour after its moment.

**LinkedIn:** nothing is posted automatically. On its day the post appears under **Jetzt posten**:
copy the text, post it on LinkedIn, paste the address of the LinkedIn post into the cockpit and
press **Als gepostet markieren**. The link inside the text carries campaign parameters, so every
click through it is counted on the blog and credited to the LinkedIn post.

## Results

| Measure | Source |
|---|---|
| Blog reads | counter on every blog page, folded daily |
| Clicks | counter on the call-to-action page and on pages reached through a campaign link |
| LinkedIn impressions | by hand: open the post, **Ergebnis eintragen** |
| Inquiries | by hand, on the post that brought them |

The counter sets no cookie and stores nothing about the reader: only page, day and the campaign
parameters of the address. Every Monday each running campaign, or one that ended in the previous
week, gets a weekly report: result against goal, what went out, which posts brought the most,
what is open.

## Creating a campaign

Campaigns are written in the workspace, not in the app, so every figure stays tied to its run
and source.

1. Create a research run, then check and decide:

   ```bash
   export AGENTIC_MARKETING_WORKSPACE=workspaces/radarauditor
   uv run agentic-marketing verify  <run>
   uv run agentic-marketing review  <run>      # or: apply <run> --auto
   uv run agentic-marketing apply   <run>
   ```

2. Add `kampagnen/<name>/` with `kampagne.yaml` and one file per post in `beitraege/`, as in
   `workspaces/radarauditor/kampagnen/sichtbarkeit-muenster/`. Each post lists in `findings:` the
   findings whose figures it shows.

3. Hand it to the cockpit:

   ```bash
   uv run agentic-marketing campaign workspaces/radarauditor/kampagnen/<name>
   ```

   The output names every post with an unbacked figure. Running it again updates undecided posts
   and leaves approved and published ones untouched. The keys come from `.env`
   (template: `.env.example`).

## Starting the RadarAuditor campaign

"RadarAuditor: Lokale Sichtbarkeit im Münsterland" is fully prepared: nine findings from Bitkom,
ZDH, the Münster chamber of crafts, the Federal Network Agency and a YouGov survey, every figure
checked against its live source, six posts (three blog, three LinkedIn), all pre-approved, and an
empty blog waiting at radarauditor.speedofthespirit.dev/blog/.

To start: open the cockpit, open the campaign, **Freigeben & starten**, confirm.

| Day | Channel | Post |
|---|---|---|
| 1 | Blog | Die Hälfte fragt erst die KI |
| 3 | LinkedIn | Die Hälfte fragt erst die KI |
| 8 | Blog | Sterne entscheiden mit |
| 10 | LinkedIn | Sterne entscheiden mit |
| 15 | Blog | Geprüft wird online |
| 17 | LinkedIn | Auch Empfehlungen werden online geprüft |

Each at 08:30, duration 21 days, goals 600 reads, 40 clicks, 3 inquiries. The pre-approvals are
recorded in the history as "Claude (vorbereitet)"; each can be withdrawn before the start.

## The fictional example run

"Nordwind: Stillstand vermeiden, Nachschliff planen" shows a complete run for an invented firm with
invented sources. It was reviewed in the cockpit, one post with an unbacked figure was corrected,
one rejected and revised, then started. The run itself was played by `example-run` with a
simulated clock from 21 September 2026; it uses the same publishing code as live operation, only
the clock is set. The three blog posts are really published, the LinkedIn posts were not posted,
and the results are simulated and labelled so everywhere. The command refuses every campaign that
is not marked as an example.

## Scheduled work

| Workflow | When | What |
|---|---|---|
| Publish due posts | hourly, minute 7 | publish due blog posts, close campaigns whose time is up |
| Measure and report | daily 03:17 UTC | fold yesterday's hits into results; weekly reports on Mondays |
| CI | every push | ruff, mypy, pytest, app check and build |
| Deploy site (RadarAuditor) | every push to `site/` | project page and blog to Cloudflare Pages |

Each can be started by hand on GitHub under **Actions → workflow → Run workflow**.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Freigabe abgelehnt: Zahlen ohne geprüfte Quelle" | the text shows a figure no cited finding backs | remove or rephrase it, or cite the finding that backs it and push again |
| start button grey | no post approved, or campaign not ready | approve a post |
| blog post missing after more than an hour | workflow failed | GitHub → Actions → "Publish due posts", read the log |
| "Deine Anmeldung ist abgelaufen" | session expired | sign in again |
| app shows "Cockpit nicht eingerichtet" | built without the Supabase variables | set them in Cloudflare Pages and rebuild |
| results stay at zero | counter blocked or day not folded yet | wait for the next morning or start "Measure and report" by hand |

## Maintenance

- **GitHub** disables scheduled workflows in a repository without a commit for 60 days. Every
  publication is a commit; in quiet periods any commit, or "Enable workflow", is enough.
- **Supabase** pauses free projects after a week without access. The hourly workflow reaches the
  database every hour and keeps it awake.
- **Keys** are repository secrets (`AGENTIC_MARKETING_SUPABASE_URL`, `…_SERVICE_KEY`,
  `…_ANON_KEY`, `…_GITHUB_TOKEN`). A renewed key replaces its secret; the code does not change.
