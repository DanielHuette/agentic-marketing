# Operating manual

[Deutsche Fassung](BETRIEBSANLEITUNG.de.md)

This manual covers day-to-day operation: from a checked research result through approval in
the app and the planner to the post that goes out by hand. How the system is built and set up
from scratch is described in [ARCHITECTURE.md](ARCHITECTURE.md).

## The flow at a glance

```
research run ──verify──▶ findings with verdicts ──apply──▶ curated file
                                   │
                    kampagne.yaml + beitraege/*.md
                                   │  agentic-marketing campaign
                                   ▼
              App: in review ──▶ approved ──▶ "Freigeben & starten" or a date in the planner
                                   │
             hourly in the database (pg_cron)
                                   ▼
              RepoCity Cockpit: "Jetzt posten" ──▶ posted by hand ──▶ "Als gepostet markieren"
```

Nothing goes out unless a person approved it in the app and posted it by hand. A figure without
a checked source blocks approval, in the app and again in the database.

## Addresses

| What | Address |
|---|---|
| App | https://app.agenticmarketing.speedofthespirit.dev |
| Project page | https://agenticmarketing.speedofthespirit.dev |
| RepoCity Cockpit (messages) | https://cockpit.speedofthespirit.dev |
| Source code | https://github.com/DanielHuette/agentic-marketing |

## Installing the app

The app is an installable web app (progressive web app, PWA): it runs in the browser but can
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
app. New accounts cannot be created; sign-ups are switched off in Supabase.

There are two roles. The **administrator** may do everything: approve, edit, reject, start, pause
and record results. Everyone else who signs in **reads only**: the app shows the note "Nur Lesen"
at the top and hides every action. The database refuses any change from these accounts even when
someone bypasses the app. Administrators are listed in `public.app_admins` (migration
`005_marketing_roles.sql` builds on `005_roles.sql` of RadarAuditor); a further administrator is
added there in the Supabase SQL editor.

## The campaign overview

The start page shows every campaign as a card: status, how many posts wait for approval, what is
live and what it brought. Posts that belong to no campaign live in the standing campaign
"Laufender Auftritt".

| Status | Meaning | What you can do |
|---|---|---|
| Startklar (ready) | posts exist, nothing is planned | review, approve, start |
| Läuft (running) | approved posts have dates | approve more, pause, post what is due |
| Pausiert (paused) | all dates are cleared | resume, which plans again |
| Abgeschlossen (done) | duration over, nothing left | read results and reports |

## Reviewing a campaign

Goal and audience at the top, the start panel below, then five tabs.

**Beiträge** is the board with five columns: in review, approved, post now (approved posts of any
channel whose moment has come), published, rejected.

**Recherche** lists every finding: statement, figures, dated source, the verdict of the check and
the sentence of the source that holds the figure.

**Ergebnisse** shows impressions, clicks and inquiries against the campaign goals, per day and per
post, as entered under **Ergebnis eintragen**.

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
2. Every approved post gets its moment: the date chosen in the planner, otherwise start day plus
   its offset in days at the campaign's time, German time. A moment in the past means "now".
3. Posts still in review stay behind until approved and are then planned by the same rule.

**Pausieren** clears all dates. **Fortsetzen** plans again from the original start day.

## The planner

**Planer** shows one calendar week, Monday to Sunday, with every post of the real campaigns on the
day it appears: when it went out, when it is due, the date chosen in the planner, or the day that
follows from a started campaign. Below the week, **Ohne Termin** lists the open posts that have no
date yet.

**Neuer Beitrag** (or **+ Beitrag** on a day) asks for channel, date, campaign, title and text.
Channels: blog, LinkedIn, X, XING, Instagram, Facebook, Threads, YouTube, TikTok, Reddit, forum,
press, newsletter. The figure check runs while you type: a figure no finding backs is named at
once; saving as a draft still works, approval only once every figure is backed. **Zur Freigabe
geben** sends the post to review, which reports it to the RepoCity Cockpit.

## Posting

Nothing is posted automatically, on any channel. Once the moment of an approved post has come, it
appears under **Jetzt posten** and, every hour at minute 23, as a message in the RepoCity Cockpit.
Copy the text, post it from the company account of the channel, paste the address of the post
into the app and press **Als gepostet markieren**. The Cockpit then reports it as published.

## Results

| Measure | Source |
|---|---|
| Impressions, clicks | by hand from the statistics of the channel: open the post, **Ergebnis eintragen** |
| Inquiries | by hand, on the post that brought them |

The campaign shows them together against its goals.

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

3. Hand it to the app:

   ```bash
   uv run agentic-marketing campaign workspaces/radarauditor/kampagnen/<name>
   ```

   The output names every post with an unbacked figure. Running it again updates undecided posts
   and leaves approved and published ones untouched. The keys come from `.env`
   (template: `.env.example`).

## The RadarAuditor campaign

"RadarAuditor: Lokale Sichtbarkeit im Münsterland" rests on nine findings from Bitkom, ZDH, the
Münster chamber of crafts, the Federal Network Agency and a YouGov survey, every figure checked
against its live source. Six posts are written (three blog, three LinkedIn) and wait as drafts
until the product can be sold; they are in `workspaces/radarauditor/kampagnen/sichtbarkeit-muenster/`.

## Scheduled work

| Job | When | What |
|---|---|---|
| `marketing-remind` (pg_cron in the database) | hourly, minute 23 | a Cockpit message for every approved post whose moment has come |
| CI (GitHub Actions) | every push | ruff, mypy, pytest, app check, tests and build |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Freigabe abgelehnt: Zahlen ohne geprüfte Quelle" | the text shows a figure no cited finding backs | remove or rephrase it, or cite the finding that backs it and hand the campaign over again |
| start button grey | no post approved, or campaign not ready | approve a post |
| no "Jetzt posten" message | the post is not approved, or its moment lies ahead | check status and date in the planner |
| "Deine Anmeldung ist abgelaufen" | session expired | sign in again |
| app shows "Cockpit nicht eingerichtet" | built without the Supabase variables | set them in Cloudflare Pages and rebuild |

## Maintenance

- **Keys:** the app only knows the public Supabase key, set in Cloudflare Pages. The service key
  for `agentic-marketing campaign` stays in the local `.env`. A renewed key replaces its value;
  the code does not change.
