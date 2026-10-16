"""A complete, compressed run of the fictional example campaign.

Context: The example campaign shows what the system does over weeks: posts going out on their
days, LinkedIn posts marked as posted, results coming in, a report every week. Waiting weeks
for a demonstration is pointless, so this module replays the run with a simulated clock from a
chosen start day. It reuses the real publishing, measuring and reporting code; only the clock
is set. It refuses every campaign that is not marked as an example, so it can never touch a
real one. | Input: the cockpit, a repository writer, the targets, a start and an end day. |
Output: published example posts, simulated results, weekly reports.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from agentic_marketing.blog import Counter, Target
from agentic_marketing.campaign_report import write_report
from agentic_marketing.cockpit import CockpitClient, Row
from agentic_marketing.errors import CampaignError
from agentic_marketing.metrics import simulate_example
from agentic_marketing.publisher import RepositoryWriter, publish_due

logger = logging.getLogger(__name__)

BERLIN = ZoneInfo("Europe/Berlin")
SUNDAY = 6
REPLAY_NOTE = "Probelauf mit simulierter Uhr; nicht wirklich auf LinkedIn gepostet"


@dataclass(slots=True)
class ReplayResult:
    """What a replay did."""

    published: list[str] = field(default_factory=list)
    posted: list[str] = field(default_factory=list)
    reports: list[date] = field(default_factory=list)
    simulated_rows: int = 0


def publish_moment(started: datetime, offset: int, at: time) -> datetime:
    """The moment a post goes out: start day plus offset, at the campaign's time, Berlin time.

    The same rule as the database function `marketing.publish_moment`.
    """
    day = started.astimezone(BERLIN).date() + timedelta(days=offset)
    return datetime.combine(day, at, tzinfo=BERLIN)


def _example_campaign(client: CockpitClient, slug: str) -> Row:
    rows = client.select("campaigns", {"slug": f"eq.{slug}", "select": "*"})
    if not rows:
        raise CampaignError(f"campaign {slug} is not in the cockpit")
    campaign = rows[0]
    if not campaign["is_example"]:
        raise CampaignError(f"campaign {slug} is not an example; a replay would publish for real")
    if campaign["status"] not in {"ready", "running", "paused"}:
        raise CampaignError(f"campaign {slug} is {campaign['status']}; nothing to replay")
    return campaign


def _sundays(first: date, last: date) -> list[date]:
    start = first + timedelta(days=(SUNDAY - first.weekday()) % 7)
    return [start + timedelta(days=7 * week) for week in range((last - start).days // 7 + 1)]


def replay_example(
    client: CockpitClient,
    writer: RepositoryWriter,
    targets: Mapping[str, Target],
    templates: Path,
    counter: Counter,
    *,
    slug: str,
    start: date,
    until: date,
) -> ReplayResult:
    """Run an example campaign from `start` to `until` with a simulated clock.

    Steps: set the start, plan every approved post, publish at each planned moment in order,
    mark due LinkedIn posts as posted, simulate results, write the weekly reports, close the
    campaign when its time is up.

    Raises:
        CampaignError: If the campaign is not an example or cannot run.
    """
    if until < start:
        raise CampaignError("the end of a replay lies before its start")
    campaign = _example_campaign(client, slug)
    at = time.fromisoformat(str(campaign["publish_time"]))
    started = datetime.combine(start, at, tzinfo=BERLIN)
    client.update(
        "campaigns",
        {"id": f"eq.{campaign['id']}"},
        {"status": "running", "started_at": started.isoformat(), "ended_at": None},
    )
    client.log_event(
        str(campaign["id"]), "started", note=f"{REPLAY_NOTE}; Start {start.isoformat()}"
    )

    approved = client.select(
        "posts",
        {
            "campaign_id": f"eq.{campaign['id']}",
            "status": "eq.approved",
            "select": "id,slug,day_offset",
        },
    )
    moments: set[datetime] = set()
    for post in approved:
        moment = publish_moment(started, int(post["day_offset"]), at)
        client.update("posts", {"id": f"eq.{post['id']}"}, {"scheduled_for": moment.isoformat()})
        moments.add(moment)

    result = ReplayResult()
    end = datetime.combine(until, time(23, 0), tzinfo=BERLIN)
    for moment in sorted(item for item in moments if item <= end):
        step = publish_due(
            client, writer, targets, templates, counter, moment, only=str(campaign["id"])
        )
        result.published += step.published
        for post_slug in step.linkedin_due:
            rows = client.select(
                "posts",
                {"campaign_id": f"eq.{campaign['id']}", "slug": f"eq.{post_slug}", "select": "id"},
            )
            client.update(
                "posts",
                {"id": f"eq.{rows[0]['id']}"},
                {"status": "published", "published_at": moment.isoformat(), "url": None},
            )
            client.log_event(
                str(campaign["id"]), "posted", post_id=str(rows[0]["id"]), note=REPLAY_NOTE
            )
            result.posted.append(post_slug)

    result.simulated_rows = simulate_example(client, until)
    fresh = client.select("campaigns", {"id": f"eq.{campaign['id']}", "select": "*"})[0]
    for sunday in _sundays(start, until):
        write_report(client, fresh, sunday)
        result.reports.append(sunday)
    publish_due(client, writer, targets, templates, counter, end, only=str(campaign["id"]))
    logger.info("replay of %s until %s done", slug, until)
    return result
