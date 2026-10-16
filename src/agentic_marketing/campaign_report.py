"""The weekly report of a campaign.

Context: A person who approved posts wants to know, once a week and in one place, what went
out, what it brought and how that compares with the goal set before the start. The report is
written into the cockpit, where the app shows it next to the board. | Input: the cockpit, a
campaign, the last day of the period. | Output: a Markdown report, stored per campaign and
period.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, timedelta

from agentic_marketing.cockpit import CockpitClient, Row
from agentic_marketing.metrics import SIMULATED, totals

PERIOD_DAYS = 7
KPI_LABELS = {"views": "Aufrufe", "clicks": "Klicks", "leads": "Anfragen"}


def _ratio(done: int, goal: int) -> str:
    if goal <= 0:
        return "-"
    return f"{round(100 * done / goal)} %"


def render_report(
    campaign: Row,
    posts: Sequence[Row],
    metric_rows: Sequence[Row],
    period_end: date,
) -> str:
    """Write the report text.

    Args:
        campaign: The campaign row, with its goals in `kpi`.
        posts: Every post of the campaign.
        metric_rows: Every metric row of those posts up to the end of the period.
        period_end: Last day the report covers.

    Returns:
        The report as Markdown.
    """
    start = period_end - timedelta(days=PERIOD_DAYS - 1)
    in_period = [
        row for row in metric_rows if start.isoformat() <= str(row["day"]) <= period_end.isoformat()
    ]
    week, overall = totals(in_period), totals(metric_rows)
    simulated = any(row.get("source") == SIMULATED for row in metric_rows)
    by_post: dict[str, Row] = {str(post["id"]): post for post in posts}
    per_post = {
        post_id: totals([row for row in metric_rows if str(row["post_id"]) == post_id])
        for post_id in by_post
    }
    published = [post for post in posts if post["status"] == "published"]
    new = [
        post
        for post in published
        if post.get("published_at")
        and start.isoformat() <= str(post["published_at"])[:10] <= period_end.isoformat()
    ]
    waiting = [post for post in posts if post["status"] == "review"]
    kpi: Mapping[str, int] = campaign.get("kpi") or {}

    lines = [
        f"# Wochenbericht: {campaign['title']}",
        "",
        f"Zeitraum {start.strftime('%d.%m.%Y')} bis {period_end.strftime('%d.%m.%Y')}. "
        f"Status der Kampagne: {campaign['status']}.",
    ]
    if simulated:
        lines += ["", "> Beispielkampagne: Die Ergebnisse sind simuliert, nicht gemessen."]
    lines += [
        "",
        "## Ergebnis",
        "",
        "| Kennzahl | Diese Woche | Gesamt | Ziel | Erreicht |",
        "|---|---:|---:|---:|---:|",
    ]
    for key, label in KPI_LABELS.items():
        goal = int(kpi.get(key, 0))
        lines.append(
            f"| {label} | {week[key]} | {overall[key]} | {goal or '-'} "
            f"| {_ratio(overall[key], goal)} |"
        )
    lines += ["", "## Veröffentlicht in diesem Zeitraum", ""]
    lines += [f"- {post['channel']}: {post['title']}" for post in new] or ["- nichts"]
    lines += [
        "",
        "## Beiträge nach Wirkung",
        "",
        "| Beitrag | Kanal | Aufrufe | Klicks | Anfragen |",
        "|---|---|---:|---:|---:|",
    ]
    ranked = sorted(published, key=lambda post: per_post[str(post["id"])]["clicks"], reverse=True)
    for post in ranked:
        result = per_post[str(post["id"])]
        lines.append(
            f"| {post['title']} | {post['channel']} | {result['views']} "
            f"| {result['clicks']} | {result['leads']} |"
        )
    lines += ["", "## Offen", ""]
    lines += [f"- wartet auf Freigabe: {post['title']}" for post in waiting] or [
        "- nichts wartet auf Freigabe"
    ]
    return "\n".join(lines) + "\n"


def write_report(client: CockpitClient, campaign: Row, period_end: date) -> str:
    """Build the report of one campaign and store it in the cockpit.

    Returns:
        The report text.
    """
    posts = client.select(
        "posts",
        {"campaign_id": f"eq.{campaign['id']}", "select": "id,title,channel,status,published_at"},
    )
    ids = ",".join(str(post["id"]) for post in posts)
    metric_rows = (
        client.select(
            "metrics",
            {"post_id": f"in.({ids})", "day": f"lte.{period_end.isoformat()}", "select": "*"},
        )
        if ids
        else []
    )
    text = render_report(campaign, posts, metric_rows, period_end)
    client.upsert(
        "reports",
        [{"campaign_id": campaign["id"], "period_end": period_end.isoformat(), "body_md": text}],
        on_conflict="campaign_id,period_end",
    )
    client.log_event(str(campaign["id"]), "reported", note=f"week ending {period_end.isoformat()}")
    return text
