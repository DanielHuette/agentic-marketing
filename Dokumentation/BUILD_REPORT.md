# Build report

[Deutsche Fassung](BUILD_REPORT.de.md)

## Origin

**Context:** Where the design came from. | **Input:** three hours of a recorded seminar on
agentic marketing, plus a six-minute workspace demonstration. | **Output:** the decisions
below.

The seminar showed a workspace of plain Markdown files, a command that loads a fixed set
of base files, analyses written into dated run folders, and a report page on which the
presenter kept or dropped each finding by hand before a compact file entered the
workspace. Three things in that chain had no implementation.

| Finding | Change | Evidence |
|---|---|---|
| The review page has no way back to disk; the compact file is assembled by hand | `review` writes a page whose decisions are saved as a file, `apply` rebuilds the curated file from run plus decisions alone | `src/agentic_marketing/review.py`, `tests/test_review.py` |
| Nothing checks that a cited source carries the figure | two passes: figures looked up in the source text, then a model for what is left open | `src/agentic_marketing/verify.py`, `src/agentic_marketing/judge.py` |
| The compression claim is made but never measured | every `apply` prints findings in, verdicts, kept, and the curated share of the run | `src/agentic_marketing/report.py`, `tests/test_report.py` |
| Figure matching dropped a decimal comma, so `1,7` matched the `17` of an unrelated date | a separator before exactly three digits may be dropped, any other may only be swapped; the match is bounded on both sides | `src/agentic_marketing/text.py`, `tests/test_text.py`, found by `scripts/benchmark.py` |
| The decimal fix treated the dot of a date (`1. Januar 2026`) as a decimal separator; the bundled example dropped from 6 to 5 supported findings while the README still said 6 | a separator belongs to a number only with a digit on both sides, otherwise it matches as written | `src/agentic_marketing/text.py`, `tests/test_text.py`, `tests/test_cli.py::test_the_bundled_example_verifies_as_documented` |
| The evidence shown to the reviewer was the first two sentences of the source, usually its heading, not the passage with the figure | the evidence is the sentence that holds the first figure found, headings above it left out | `src/agentic_marketing/text.py`, `tests/test_text.py`, `tests/test_verify.py` |
| Many sites refuse a request without a descriptive user agent | every fetch sends one, with the configured contact appended | `src/agentic_marketing/sources.py` |
| `last_updated` is written and never acted on | `stale` classifies by volatility and reports what is due, deleting nothing | `src/agentic_marketing/freshness.py`, `tests/test_freshness.py` |
| No installation, no example, no tests | installable package, bundled example workspace that runs offline, 125 tests | `pyproject.toml`, `src/agentic_marketing/example/`, `tests/` |

## Decisions that shaped the code

**Context:** Choices a reader of the code would otherwise have to reverse-engineer. |
**Input:** the problems above. | **Output:** the structure of the package.

| Decision | Rejected alternative | Reason |
|---|---|---|
| One finding per file with a YAML header | many findings parsed out of one essay | Provenance survives. A finding can be decided on, moved and traced. |
| Figure matching across separator spellings | literal string comparison | A German `90.336` and an English `90,336` are one number. False failures train the reviewer to wave verdicts through. |
| The model never sees a source that could not be read | ask anyway and take the answer | Without the text the model answers from memory, and a confident answer from memory is the failure the project exists to prevent. |
| Verdicts and decisions stored as separate files | one combined state file | `verify` may run unattended and repeatedly; decisions are a human act and must not be overwritten by a re-check. |
| Atomic writes for every produced file | write in place | A curated file read by an agent while being rewritten is worse than a stale one. |

## Final check

**Context:** What was run before the build was called finished. | **Input:** the
repository. | **Output:** the results below.

| Check | Result |
|---|---|
| `ruff check` | passed |
| `ruff format --check` | passed |
| `mypy src tests` (strict) | no issues in 32 source files |
| `pytest` | 125 passed |
| End-to-end on the bundled example | 7 findings, 6 supported, 1 partial, 6 kept, 32.5 % of the run |
| Benchmark against live sources, figure pass | 16 of 16 verdicts as declared, 0 missed, 0 false alarms |
| Benchmark against live sources, model pass | 16 of 16 verdicts as declared, both reversed statements caught |
| `pack` on the bundled example | 5,668 characters, about 1,419 tokens, budget 12,000 |
| Secrets, absolute local paths, debug output, commented-out code, TODO remnants | none found |

## Open

**Context:** What a reader should know is not done. | **Input:** the current state. |
**Output:** the list below.

| Item | Why it is open |
|---|---|
| The benchmark covers one lens and six sources | It measures the verification passes, which are lens-independent. A wider corpus would measure the sources, not the code. |
| Only the macro lens has a bundled example run | The other five lenses share the run format and the same code path; a second example would prove the skills, not the code. |
| Scanned PDF sources | `pypdf` reads a text layer. A scanned page raises a readable error rather than silently returning nothing; optical recognition is out of scope. |
