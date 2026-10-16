"""Turning page hits into daily results per post.

Context: Every blog page and the page a call to action leads to report one hit per load to the
cockpit, without cookies: host, path and the campaign parameters of the address. Once a day
the hits are folded into one row per post and day, so the cockpit can show reads and clicks
next to the decisions that caused them. The fictional example campaign gets simulated rows,
marked as such, so its numbers are never mistaken for measured ones. | Input: the cockpit,
the targets, a day. | Output: rows in `metrics`.
"""

from __future__ import annotations

import hashlib
import logging
import math
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from agentic_marketing.blog import Target
from agentic_marketing.cockpit import CockpitClient, Row
from agentic_marketing.publisher import parse_moment

logger = logging.getLogger(__name__)

MEASURED = "counter"
SIMULATED = "simulated"
SIMULATED_PEAK = {"blog": 60, "linkedin": 420}
SIMULATED_HALF_LIFE_DAYS = 3.0
SIMULATED_CLICK_RATE = {"blog": 0.06, "linkedin": 0.018}
SIMULATED_LEAD_EVERY_CLICKS = 9


@dataclass(frozen=True, slots=True)
class FoldResult:
    """What one fold wrote."""

    day: date
    hits: int
    rows: int


def _norm_path(path: str) -> str:
    return path if path.endswith("/") else f"{path}/"


def views_and_clicks(
    hits: Sequence[Row], post: Row, campaign_slug: str, target: Target
) -> tuple[int, int]:
    """Count the reads of a post's page and the visits its tracked links brought.

    A read is a hit on the post's own address. A click is a hit, on any page, that carries
    the campaign and the post as its campaign parameters; that is how the call to action of a
    blog post and the link under a LinkedIn post are both counted.
    """
    page = _norm_path(f"{target.path_prefix}{post['slug']}")
    views = clicks = 0
    for hit in hits:
        if (
            post["channel"] == "blog"
            and hit["host"] == target.host
            and _norm_path(hit["path"]) == page
        ):
            views += 1
        if hit.get("campaign") == campaign_slug and hit.get("content") == post["slug"]:
            clicks += 1
    return views, clicks


def fold_hits(client: CockpitClient, targets: Mapping[str, Target], day: date) -> FoldResult:
    """Write the measured reads and clicks of one day for every published post.

    Running it twice for the same day writes the same rows again, so a repeated or late job
    never counts twice.
    """
    hits = client.select(
        "hits", {"day": f"eq.{day.isoformat()}", "select": "host,path,campaign,content"}
    )
    rows: list[dict[str, object]] = []
    for campaign in client.select("campaigns", {"select": "id,slug,target"}):
        target = targets.get(str(campaign["target"]))
        if target is None:
            logger.warning(
                "campaign %s names unknown target %s", campaign["slug"], campaign["target"]
            )
            continue
        posts = client.select(
            "posts",
            {
                "campaign_id": f"eq.{campaign['id']}",
                "status": "eq.published",
                "select": "id,slug,channel",
            },
        )
        for post in posts:
            views, clicks = views_and_clicks(hits, post, str(campaign["slug"]), target)
            if views or clicks:
                rows.append(
                    {
                        "post_id": post["id"],
                        "day": day.isoformat(),
                        "views": views,
                        "clicks": clicks,
                        "source": MEASURED,
                    }
                )
    client.upsert("metrics", rows, on_conflict="post_id,day,source")
    return FoldResult(day, len(hits), len(rows))


def _noise(*parts: str) -> float:
    """A repeatable number between 0.75 and 1.25, so a simulation is the same on every run."""
    digest = hashlib.sha256("|".join(parts).encode()).digest()
    return 0.75 + digest[0] / 255 * 0.5


def simulated_day(channel: str, slug: str, age_days: int) -> tuple[int, int, int]:
    """Reads, clicks and leads a post of the example campaign shows on one day of its life.

    Reach decays with a fixed half-life from the day of publication; clicks and leads follow
    as fixed shares. The numbers illustrate the cockpit and are labelled simulated wherever
    they are shown.
    """
    decay = math.pow(0.5, age_days / SIMULATED_HALF_LIFE_DAYS)
    views = round(SIMULATED_PEAK[channel] * decay * _noise(slug, str(age_days), "v"))
    clicks = round(views * SIMULATED_CLICK_RATE[channel] * _noise(slug, str(age_days), "c"))
    leads = (
        1
        if clicks and _noise(slug, str(age_days), "l") * SIMULATED_LEAD_EVERY_CLICKS < clicks * 1.3
        else 0
    )
    return views, clicks, leads


def simulate_example(client: CockpitClient, today: date) -> int:
    """Write simulated results for every published post of the example campaigns.

    Returns:
        The number of rows written.
    """
    rows: list[dict[str, object]] = []
    for campaign in client.select("campaigns", {"is_example": "eq.true", "select": "id"}):
        posts = client.select(
            "posts",
            {
                "campaign_id": f"eq.{campaign['id']}",
                "status": "eq.published",
                "select": "id,slug,channel,published_at",
            },
        )
        for post in posts:
            first = parse_moment(post["published_at"]).date()
            for age in range((today - first).days + 1):
                views, clicks, leads = simulated_day(str(post["channel"]), str(post["slug"]), age)
                rows.append(
                    {
                        "post_id": post["id"],
                        "day": (first + timedelta(days=age)).isoformat(),
                        "views": views,
                        "clicks": clicks,
                        "leads": leads,
                        "source": SIMULATED,
                    }
                )
    client.upsert("metrics", rows, on_conflict="post_id,day,source")
    return len(rows)


def totals(metric_rows: Sequence[Row]) -> Counter[str]:
    """Sum reads, clicks and leads over metric rows."""
    summed: Counter[str] = Counter()
    for row in metric_rows:
        for key in ("views", "clicks", "leads"):
            summed[key] += int(row.get(key) or 0)
    return summed
