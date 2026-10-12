# Agentic Marketing

[Deutsche Fassung](README.de.md) · [Project page with the live benchmark](https://agenticmarketing.speedofthespirit.dev)

A marketing workspace for agent teams, and the step that is missing from every one of
them: research only enters the workspace after its figures have been checked against
their sources and a person has decided what stays.

## The problem

An agent team researching a market produces a lot of text. The seminar version of this
ends there: the output is read, admired, and pasted somewhere. Two things go wrong.

A figure nobody checked reads exactly like a figure somebody checked. Models produce
confident numbers, and marketing is the one use case where a wrong number is seen by the
public rather than caught by a test.

And the output is too large to use. Feed a whole research run back into the next session
and the context is spent on material nobody decided to keep. The part that is worth
keeping is a fraction of it, and nothing in the usual setup tells you which fraction.

## The approach

A run never writes into the workspace. It writes into a dated folder, and three steps
stand between it and the files an agent will read again:

```
<lens>/<lens>-<date>/     one file per finding, with its figures and its source
        ↓  verify         every figure looked up in the source it names
        ↓  review         a person keeps or drops each finding, on disk
        ↓  apply
<lens>/<lens>.md          the curated file, the only one ever loaded again
```

The curated file opens with a line that is part of the contract, not decoration:

> Every point here is backed by the source behind it. What is not here counts as
> unchecked and must not be invented.

## Two passes, in that order

**Figures.** Each source is fetched or opened once and every figure the finding rests on
is looked for inside it. Deterministic, no model, no key, no cost. Figures are matched
across spellings, because a German source writing `90.336` and an English one writing
`90,336` are the same number and a check that misses that trains the reviewer to wave
verdicts through.

**Model.** Only what the first pass left open: a finding that quotes a correct figure and
draws a wrong conclusion, or one that states no figure at all. The model answers through
a forced tool call, so nothing is parsed out of prose, and it must quote the passage it
relies on. Where the source could not be read, no model is asked — without the text it
would answer from memory.

## Quickstart

Runs against the bundled example workspace. No data, no key, no network.

```bash
git clone https://github.com/DanielHuette/agentic-marketing
cd agentic-marketing
uv sync                                   # or: pip install -e .

RUN=src/agentic_marketing/example/strategie/umwelt/makroanalyse/makroanalyse-2026-08-29
uv run agentic-marketing verify $RUN      # check the figures
uv run agentic-marketing review $RUN      # build the page, decide, save decisions.json
uv run agentic-marketing apply  $RUN      # write the curated file and report the numbers
uv run agentic-marketing pack             # what a session would start with
uv run pytest
```

The example run carries a planted mistake: one finding claims the regrinding market grows
by 11,4 percent, a figure that appears in no source. The first pass marks it partial, the
shipped decisions drop it, and the run notes where it came from.

What the example measures:

| | |
|---|---|
| Findings in the run | 7 |
| Figures held up | 6 supported, 1 partial |
| Kept by the reviewer | 6 |
| Raw run | 10,879 characters |
| Curated file | 3,535 characters, 32.5 % of the run |
| Session context pack | 5,668 characters, about 1,419 tokens |

A third is the honest figure for an example small enough to read. A real run,
whose `raw/` folder holds the downloads and the working notes, compresses far harder; the
point of printing it after every run is that the figure is measured rather than claimed.

## Benchmark against live sources

Both passes are measured against pages the German Federal Statistical Office publishes,
not against a fixture. `benchmark/cases.yaml` declares sixteen cases, each built from a
sentence those pages actually carry, and each altered in a declared way: figures left as
published, written in the other locale convention, one digit changed, mixed with an
invented one, or left correct while the statement around them is reversed. One case
points at an address that does not answer.

```bash
uv run python scripts/benchmark.py            # figure pass, no key needed
uv run python scripts/benchmark.py --model    # both passes
uv run python scripts/benchmark.py --offline  # re-run against the stored snapshots
```

Result of the run recorded in `benchmark/RESULTS.md`:

| | Figure pass | Model pass |
|---|---|---|
| Verdicts as declared | 16 of 16 | 16 of 16 |
| Unbacked findings flagged | 6 | 8 |
| Unbacked findings missed | 0 | 0 |
| Backed findings wrongly flagged | 0 | 0 |

The two numbers that matter are the last two rows, and they are the reason the passes are
split. The figure pass misses nothing numeric and raises no false alarm, but it passes
both reversed statements: their figures are genuinely in the source, only the direction
is not. The model pass catches exactly those two, which is the whole argument for paying
for a second pass and the reason it only ever sees what the first one left open.

Every live run snapshots its sources into `benchmark/snapshots/` and records their
digests, so a result stays auditable after the page behind it has changed.

Two things about this benchmark that a reader should know. It found a real defect before
it was finished: the figure matcher used to strip a decimal comma, so `1,7` matched the
`17` of a date elsewhere on the page. A separator before three digits may be dropped, any
other may not, and both rules are now pinned by tests. And one declared expectation was
corrected between the first run and this one, because the case file contradicted itself
rather than because the model was wrong; the reason is written into `cases.yaml` next to
the case. That decimal fix later broke dates: it treated the dot of `1. Januar 2026` as a
decimal separator, and the bundled example lost a supported finding. A separator now only
counts as part of a number when a digit stands on both sides; a test pins the example's
six supported findings so the README cannot drift from the code again.

## The workspace

`agentic-marketing new <folder>` writes a workspace you then fill with your own material:

```
stammdaten/     who the person and the company are
strategie/      positioning, audience, goals, environment analyses
produkte/       offer, competitors, case studies per product
kanaele/        what is planned, drafted and published per channel
kampagnen/      one campaign from brief to result
projekte/       recurring work that is not a channel
daten/          exports, and the sources analyses are checked against
inbox/          finished output waiting for a decision
tools/          connector notes, never credentials
.claude/        the command, the rules and eight analysis skills
```

`/prime` loads six base files and nothing else. Everything beyond them is loaded only
when a task names it. `agentic-marketing pack` builds the same set outside a session and
prints what it costs, so the budget is a number rather than a feeling.

The eight skills cover macro analysis by STEP, micro analysis, competitors, five forces,
review mining, audience, and drafting for LinkedIn and a blog. Each one writes into the
run format rather than into the workspace, so everything an agent produces passes the
same gate.

## Commands

| Command | What it does | Needs |
|---|---|---|
| `new <folder>` | write a workspace from the template | nothing |
| `check` | report what the workspace is missing | nothing |
| `verify <run>` | look every figure up in its source | network for web sources |
| `verify <run> --model` | add the second pass over what is still open | `judge` extra, `ANTHROPIC_API_KEY` |
| `review <run>` | build the page the decisions are made on | nothing |
| `apply <run>` | write the curated file and report the numbers | nothing |
| `apply <run> --auto` | decide by verdict, for an unattended run | nothing |
| `pack` | assemble and measure the session context | nothing |
| `stale` | report curated points that are due again | network |

## Design decisions

| Decision | Rejected alternative | Reason |
|---|---|---|
| Figures first, model second | model judges everything | The cheap pass settles most findings and can be shown to be right. A model asked to confirm a number it can already see is paid guesswork. |
| Decisions written to a file | decisions kept in the browser | The curated file has to be rebuildable from the run and the decisions alone. A click that lives only in a page is not a decision, it is a mood. |
| Age, not expiry | a date after which a point is dropped | A statistic about an ageing profession does not expire; a hardware price does. `stale` reports what is due and deletes nothing. |
| One finding per file | one file per analysis field | A finding that is its own file can be decided on, moved and traced. Parsing many findings out of one essay is where the provenance gets lost. |
| Sources downloaded into `daten/` | citing the live address | An address that resolves today may not in a year. A check that still runs in a year is worth more than a link. |
| Plain Markdown, no database | a database behind an interface | Agents read files. Anything else needs an adapter, and the adapter is where the context budget goes. |

## Requirements

Python 3.11 or newer. The second verification pass needs
`pip install 'agentic-marketing[judge]'` and `ANTHROPIC_API_KEY`; everything else runs
without either.

## Licence

MIT.
