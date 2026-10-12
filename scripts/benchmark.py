"""Measure the verification passes against live public sources.

Context: The project claims that the figure pass catches invented numbers without
raising false alarms, and that the model pass catches what the figure pass cannot see.
Both claims are worth nothing unless they are measured against sources somebody else
published. This script fetches the sources declared in benchmark/cases.yaml, snapshots
them so the run can be audited later, builds one finding per case and reports what each
pass got right. | Input: benchmark/cases.yaml. | Output: benchmark/results.json,
benchmark/RESULTS.md, benchmark/snapshots/.

Usage:
    python scripts/benchmark.py                 figure pass only, no key needed
    python scripts/benchmark.py --model         both passes, needs ANTHROPIC_API_KEY
    python scripts/benchmark.py --offline       re-run against the stored snapshots
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from agentic_marketing.config import Settings  # noqa: E402
from agentic_marketing.errors import SourceError  # noqa: E402
from agentic_marketing.judge import AnthropicJudge, judge_one  # noqa: E402
from agentic_marketing.models import (  # noqa: E402
    Finding,
    Horizon,
    Lens,
    Source,
    SourceKind,
    Stage,
    StepField,
    Verdict,
    Verification,
    Volatility,
)
from agentic_marketing.sources import fetch_text  # noqa: E402
from agentic_marketing.verify import verify_one  # noqa: E402

CASES_FILE = ROOT / "benchmark" / "cases.yaml"
SNAPSHOT_DIR = ROOT / "benchmark" / "snapshots"
RESULTS_JSON = ROOT / "benchmark" / "results.json"
RESULTS_MD = ROOT / "benchmark" / "RESULTS.md"

FLAG_WORTHY = frozenset({Verdict.PARTIAL, Verdict.UNSUPPORTED, Verdict.UNREACHABLE})


@dataclass(frozen=True, slots=True)
class Outcome:
    """What one case produced in one pass."""

    case_id: str
    kind: str
    expected: Verdict
    actual: Verdict
    note: str | None

    @property
    def correct(self) -> bool:
        """Whether the pass reached the verdict the case declares."""
        return self.expected is self.actual


@dataclass(frozen=True, slots=True)
class DeclaredSource:
    """A source the benchmark checks against."""

    key: str
    url: str
    publisher: str
    title: str


@dataclass(frozen=True, slots=True)
class DeclaredCase:
    """One case: a real statement, altered in a declared way."""

    id: str
    source: str
    kind: str
    statement: str
    detail: str
    figures: list[str]
    expect: Verdict
    expect_model: Verdict


def load_cases() -> tuple[dict[str, DeclaredSource], list[DeclaredCase]]:
    """Read the declared sources and cases.

    Returns:
        The sources keyed by name, and the cases in file order.
    """
    raw = yaml.safe_load(CASES_FILE.read_text(encoding="utf-8"))
    sources = {key: DeclaredSource(key=key, **value) for key, value in raw["sources"].items()}
    cases = [
        DeclaredCase(
            id=entry["id"],
            source=entry["source"],
            kind=entry["kind"],
            statement=entry["statement"],
            detail=entry["detail"],
            figures=[str(figure) for figure in entry["figures"]],
            expect=Verdict(entry["expect"]),
            expect_model=Verdict(entry["expect_model"]),
        )
        for entry in raw["cases"]
    ]
    return sources, cases


def snapshot_path(key: str) -> Path:
    """Where the stored text of a source lives."""
    return SNAPSHOT_DIR / f"{key}.txt"


def collect_sources(
    sources: dict[str, DeclaredSource], settings: Settings, *, offline: bool
) -> tuple[dict[str, str], dict[str, str]]:
    """Fetch every declared source and store it, or read the stored copy.

    Args:
        sources: The declared sources, keyed by name.
        settings: Timeout and contact address.
        offline: Read the stored snapshots instead of fetching.

    Returns:
        The texts keyed by source name, and the failures keyed the same way.
    """
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    texts: dict[str, str] = {}
    failures: dict[str, str] = {}
    for key, declared in sources.items():
        stored = snapshot_path(key)
        if offline:
            if stored.is_file():
                texts[key] = stored.read_text(encoding="utf-8")
            else:
                failures[key] = "no stored snapshot"
            continue
        try:
            text = fetch_text(declared.url, settings)
        except SourceError as error:
            failures[key] = str(error)
            continue
        texts[key] = text
        stored.write_text(text, encoding="utf-8")
    return texts, failures


def build_finding(case: DeclaredCase, declared: DeclaredSource) -> Finding:
    """Turn one declared case into a finding the real code path can check."""
    today = date.today()
    return Finding(
        id=f"macro-step/{case.id}",
        lens=Lens.MACRO_STEP,
        field=StepField.ECONOMIC,
        horizon=Horizon.CURRENT,
        volatility=Volatility.MARKET,
        statement=case.statement,
        detail=case.detail,
        figures=case.figures,
        source=Source(
            kind=SourceKind.WEB,
            publisher=declared.publisher,
            title=declared.title,
            url=declared.url,
            published=today,
            retrieved=today,
        ),
    )


def run_figure_pass(
    cases: Sequence[DeclaredCase],
    sources: dict[str, DeclaredSource],
    texts: dict[str, str],
    failures: dict[str, str],
) -> tuple[list[Outcome], dict[str, Finding]]:
    """Check every case with the figure pass."""
    outcomes: list[Outcome] = []
    findings: dict[str, Finding] = {}
    for case in cases:
        finding = build_finding(case, sources[case.source])
        findings[case.id] = finding
        if case.source in failures:
            verification = Verification(
                finding_id=finding.id,
                stage=Stage.FIGURES,
                verdict=Verdict.UNREACHABLE,
                figures_missing=list(finding.figures),
                checked=date.today(),
                note=failures[case.source],
            )
        else:
            verification = verify_one(finding, texts[case.source])
        outcomes.append(
            Outcome(
                case_id=case.id,
                kind=case.kind,
                expected=case.expect,
                actual=verification.verdict,
                note=verification.note,
            )
        )
    return outcomes, findings


def run_model_pass(
    cases: Sequence[DeclaredCase],
    findings: dict[str, Finding],
    texts: dict[str, str],
    settings: Settings,
) -> list[Outcome]:
    """Put every case whose source could be read in front of the model."""
    client = AnthropicJudge()
    outcomes: list[Outcome] = []
    for case in cases:
        text = texts.get(case.source)
        if text is None:
            outcomes.append(
                Outcome(case.id, case.kind, case.expect_model, Verdict.UNREACHABLE, "source unread")
            )
            continue
        judged = judge_one(findings[case.id], text, client, model=settings.judge_model)
        outcomes.append(
            Outcome(case.id, case.kind, case.expect_model, judged.verdict, judged.evidence)
        )
    return outcomes


def confusion(outcomes: Sequence[Outcome]) -> dict[str, int]:
    """Count how the pass did at telling a backed finding from an unbacked one."""
    counts = {"true_flag": 0, "false_flag": 0, "missed": 0, "true_pass": 0}
    for outcome in outcomes:
        should_flag = outcome.expected in FLAG_WORTHY
        did_flag = outcome.actual in FLAG_WORTHY
        if should_flag and did_flag:
            counts["true_flag"] += 1
        elif should_flag and not did_flag:
            counts["missed"] += 1
        elif did_flag:
            counts["false_flag"] += 1
        else:
            counts["true_pass"] += 1
    return counts


def _table(outcomes: Sequence[Outcome]) -> str:
    """Render the per-case table."""
    lines = ["| Case | Kind | Expected | Actual | |", "|---|---|---|---|---|"]
    for outcome in outcomes:
        mark = "ok" if outcome.correct else "**miss**"
        lines.append(
            f"| `{outcome.case_id}` | {outcome.kind} | {outcome.expected.value} "
            f"| {outcome.actual.value} | {mark} |"
        )
    return "\n".join(lines)


def _summary(name: str, outcomes: Sequence[Outcome]) -> str:
    """Render the counts of one pass."""
    counts = confusion(outcomes)
    correct = sum(1 for outcome in outcomes if outcome.correct)
    total = len(outcomes)
    return "\n".join(
        [
            f"### {name}",
            "",
            f"- Verdicts as declared: **{correct} of {total}**",
            f"- Unbacked findings flagged: {counts['true_flag']}",
            f"- Unbacked findings missed: {counts['missed']}",
            f"- Backed findings wrongly flagged: {counts['false_flag']}",
            f"- Backed findings passed: {counts['true_pass']}",
        ]
    )


def _as_row(outcome: Outcome) -> dict[str, object]:
    """Render one outcome for the machine-readable result."""
    return {
        "case_id": outcome.case_id,
        "kind": outcome.kind,
        "expected": outcome.expected.value,
        "actual": outcome.actual.value,
        "correct": outcome.correct,
        "note": outcome.note,
    }


def write_results(
    figures: Sequence[Outcome],
    model: Sequence[Outcome] | None,
    texts: dict[str, str],
    failures: dict[str, str],
    *,
    offline: bool,
) -> None:
    """Write the machine-readable and the readable result."""
    stamp = datetime.now(UTC).isoformat(timespec="seconds")
    digests = {
        key: hashlib.sha256(text.encode("utf-8")).hexdigest()[:16] for key, text in texts.items()
    }
    payload = {
        "run_at": stamp,
        "offline": offline,
        "source_digests": digests,
        "source_failures": failures,
        "figure_pass": [_as_row(outcome) for outcome in figures],
        "model_pass": None if model is None else [_as_row(outcome) for outcome in model],
    }
    RESULTS_JSON.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")

    parts = [
        "# Benchmark results",
        "",
        f"Run at {stamp}" + (" against stored snapshots." if offline else " against live sources."),
        "",
        "Sources are snapshotted into `benchmark/snapshots/` on every live run, so a result",
        "can be audited after the page behind it has changed. The digest of each snapshot is",
        "in `results.json`.",
        "",
        _summary("Figure pass", figures),
        "",
        _table(figures),
    ]
    if model is not None:
        parts += ["", _summary("Model pass", model), "", _table(model)]
    else:
        parts += [
            "",
            "### Model pass",
            "",
            "Not run. It needs `ANTHROPIC_API_KEY` and `--model`.",
        ]
    if failures:
        parts += ["", "### Sources that did not answer", ""]
        parts += [f"- `{key}`: {reason}" for key, reason in failures.items()]
    RESULTS_MD.write_text("\n".join(parts) + "\n", encoding="utf-8")


def main(argv: Sequence[str] | None = None) -> int:
    """Run the benchmark."""
    parser = argparse.ArgumentParser(description="Measure the verification passes.")
    parser.add_argument("--model", action="store_true", help="also run the model pass")
    parser.add_argument("--offline", action="store_true", help="use the stored snapshots")
    args = parser.parse_args(argv)

    sources, cases = load_cases()
    settings = Settings()
    texts, failures = collect_sources(sources, settings, offline=args.offline)

    figures, findings = run_figure_pass(cases, sources, texts, failures)
    model = run_model_pass(cases, findings, texts, settings) if args.model else None

    write_results(figures, model, texts, failures, offline=args.offline)
    print(_summary("Figure pass", figures))
    if model is not None:
        print()
        print(_summary("Model pass", model))
    print(f"\nWritten to {RESULTS_MD.relative_to(ROOT)} and {RESULTS_JSON.relative_to(ROOT)}")
    return 0 if all(outcome.correct for outcome in figures) else 1


if __name__ == "__main__":
    raise SystemExit(main())
