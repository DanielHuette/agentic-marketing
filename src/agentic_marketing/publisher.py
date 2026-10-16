"""Publishing the posts that are due.

Context: Runs on a schedule. A post goes out only when a person approved it and its campaign
is running, so nothing reaches a reader without a decision in the cockpit. Blog posts are
written to the target repository in one commit together with the refreshed index and feed;
LinkedIn posts are never sent automatically, the cockpit shows them as due and the operator
posts them by hand. | Input: the cockpit, a repository writer, the targets and templates, the
current time. | Output: posts marked as published and a history entry per post.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Protocol

from agentic_marketing.blog import BlogPost, Citation, Counter, Target, post_url, site_files
from agentic_marketing.cockpit import CockpitClient, Row
from agentic_marketing.errors import PublishError

logger = logging.getLogger(__name__)

POST_FIELDS = (
    "id,campaign_id,channel,slug,title,summary,body_md,status,scheduled_for,published_at,"
    "post_findings(findings(source_publisher,source_title,source_url,source_published))"
)


class RepositoryWriter(Protocol):
    """What the publisher needs from a repository: one commit of many files."""

    def commit(self, repo: str, branch: str, files: Mapping[str, str], message: str) -> str:
        """Write the files in one commit and return its address."""
        ...


@dataclass(slots=True)
class PublishResult:
    """What one publishing pass did."""

    published: list[str] = field(default_factory=list)
    linkedin_due: list[str] = field(default_factory=list)
    finished: list[str] = field(default_factory=list)
    commits: list[str] = field(default_factory=list)


def parse_moment(value: str) -> datetime:
    """Read a timestamp as the database returns it."""
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _citations(row: Row) -> tuple[Citation, ...]:
    seen: list[Citation] = []
    for link in row.get("post_findings") or []:
        finding = link.get("findings") or {}
        citation = Citation(
            publisher=str(finding.get("source_publisher", "")),
            title=str(finding.get("source_title", "")),
            url=finding.get("source_url"),
            published=finding.get("source_published"),
        )
        if citation not in seen:
            seen.append(citation)
    return tuple(seen)


def to_blog_post(row: Row, campaign_slug: str, published_at: datetime) -> BlogPost:
    """Turn a cockpit row into what the page renderer needs."""
    return BlogPost(
        campaign=campaign_slug,
        slug=str(row["slug"]),
        title=str(row["title"]),
        summary=str(row["summary"]),
        body_md=str(row["body_md"]),
        published_at=published_at,
        citations=_citations(row),
    )


def _due(row: Row, now: datetime) -> bool:
    moment = row.get("scheduled_for")
    return row["status"] == "approved" and moment is not None and parse_moment(moment) <= now


def published_blog_posts(client: CockpitClient, campaigns: Sequence[Row]) -> list[BlogPost]:
    """Every post already live on a target, so the index keeps them after a new one is added."""
    posts: list[BlogPost] = []
    for campaign in campaigns:
        rows = client.select(
            "posts",
            {
                "campaign_id": f"eq.{campaign['id']}",
                "channel": "eq.blog",
                "status": "eq.published",
                "select": POST_FIELDS,
            },
        )
        posts.extend(
            to_blog_post(row, str(campaign["slug"]), parse_moment(row["published_at"]))
            for row in rows
            if row.get("published_at")
        )
    return posts


def _finish_if_over(client: CockpitClient, campaign: Row, now: datetime) -> bool:
    """Close a campaign whose time is up and that has nothing left to publish."""
    started = campaign.get("started_at")
    if not started:
        return False
    end = parse_moment(started) + timedelta(days=int(campaign["duration_days"]))
    if now < end:
        return False
    waiting = client.select(
        "posts", {"campaign_id": f"eq.{campaign['id']}", "status": "eq.approved", "select": "id"}
    )
    if waiting:
        return False
    client.update(
        "campaigns", {"id": f"eq.{campaign['id']}"}, {"status": "done", "ended_at": now.isoformat()}
    )
    client.log_event(
        str(campaign["id"]), "finished", note="duration reached, nothing left to publish"
    )
    return True


def publish_due(
    client: CockpitClient,
    writer: RepositoryWriter,
    targets: Mapping[str, Target],
    templates: Path,
    counter: Counter,
    now: datetime,
    *,
    only: str | None = None,
) -> PublishResult:
    """Publish every approved blog post whose moment has come.

    Posts of all running campaigns that share a target land in one commit, so the index and
    the feed always list exactly the posts that are live.

    Args:
        client: Cockpit connection with the service key.
        writer: Writes the files to the target repository.
        targets: Publishing targets by key.
        templates: Folder holding one template folder per target.
        counter: Where the published pages report their hits.
        now: The current moment, timezone aware.
        only: Id of the one campaign to publish for; every running campaign when None. The
            example replay sets it, so a simulated clock never reaches a real campaign.

    Returns:
        The slugs published, the LinkedIn posts that are due and the campaigns closed.

    Raises:
        PublishError: If a campaign names an unknown target or the commit fails. Posts are
            only marked as published after their commit succeeded.
    """
    result = PublishResult()
    campaigns = client.select("campaigns", {"select": "*"})
    by_target: dict[str, list[Row]] = defaultdict(list)
    for campaign in campaigns:
        by_target[str(campaign["target"])].append(campaign)

    for key, members in sorted(by_target.items()):
        running = [
            campaign
            for campaign in members
            if campaign["status"] == "running" and only in (None, str(campaign["id"]))
        ]
        if not running:
            continue
        if key not in targets:
            raise PublishError(f"campaign {running[0]['slug']} names unknown target {key}")
        target = targets[key]
        fresh: list[tuple[Row, BlogPost]] = []
        for campaign in running:
            rows = client.select(
                "posts",
                {
                    "campaign_id": f"eq.{campaign['id']}",
                    "status": "eq.approved",
                    "select": POST_FIELDS,
                },
            )
            for row in rows:
                if not _due(row, now):
                    continue
                if row["channel"] == "linkedin":
                    result.linkedin_due.append(str(row["slug"]))
                    continue
                fresh.append((row, to_blog_post(row, str(campaign["slug"]), now)))
        if fresh:
            live = published_blog_posts(client, members)
            files = site_files(live + [post for _, post in fresh], target, templates, counter)
            titles = ", ".join(post.slug for _, post in fresh)
            commit = writer.commit(target.repo, target.branch, files, f"blog: publish {titles}")
            result.commits.append(commit)
            for row, post in fresh:
                url = post_url(target, post.slug)
                client.update(
                    "posts",
                    {"id": f"eq.{row['id']}"},
                    {"status": "published", "published_at": now.isoformat(), "url": url},
                )
                client.log_event(
                    str(row["campaign_id"]), "published", post_id=str(row["id"]), note=url
                )
                result.published.append(post.slug)
        for campaign in running:
            if _finish_if_over(client, campaign, now):
                result.finished.append(str(campaign["slug"]))
    return result


def mark_linkedin_posted(client: CockpitClient, post_id: str, url: str, when: datetime) -> Row:
    """Record that a person posted a LinkedIn draft, the same step the app button performs.

    Raises:
        PublishError: If the post is not an approved LinkedIn post.
    """
    rows = client.select(
        "posts", {"id": f"eq.{post_id}", "select": "id,campaign_id,channel,status"}
    )
    if not rows or rows[0]["channel"] != "linkedin" or rows[0]["status"] != "approved":
        raise PublishError(f"post {post_id} is not an approved LinkedIn post")
    updated = client.update(
        "posts",
        {"id": f"eq.{post_id}"},
        {"status": "published", "published_at": when.isoformat(), "url": url},
    )
    client.log_event(str(rows[0]["campaign_id"]), "posted", post_id=post_id, note=url)
    return updated[0]


def as_dict(result: PublishResult) -> dict[str, Any]:
    """The result as plain data, for logs and the command line."""
    return {
        "published": result.published,
        "linkedin_due": result.linkedin_due,
        "finished": result.finished,
        "commits": result.commits,
    }
