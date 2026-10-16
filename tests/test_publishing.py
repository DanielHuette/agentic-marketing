"""Tests for page rendering, publishing, results and the weekly report."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any, cast

import httpx
import pytest

from agentic_marketing.blog import (
    BlogPost,
    Citation,
    Counter,
    Target,
    german_date,
    load_targets,
    render_feed,
    render_post,
    site_files,
    tracked_link,
)
from agentic_marketing.campaign_report import render_report, write_report
from agentic_marketing.cockpit import CockpitClient
from agentic_marketing.errors import CockpitError, PublishError
from agentic_marketing.github import GitHubWriter
from agentic_marketing.metrics import fold_hits, simulate_example, simulated_day, views_and_clicks
from agentic_marketing.publisher import mark_linkedin_posted, publish_due
from tests.fake_cockpit import FakeCockpit, FakeWriter

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "config" / "templates"
NOW = datetime(2026, 10, 20, 9, 30, tzinfo=UTC)
COUNTER = Counter("https://example.supabase.co", "public-key-for-hits-only")


@pytest.fixture
def target() -> Target:
    return load_targets(ROOT / "config" / "targets.yaml")["beispiel"]


def _post(slug: str = "erster", when: datetime = NOW) -> BlogPost:
    return BlogPost(
        campaign="probe",
        slug=slug,
        title="Fehlt das Werkzeug, steht die Maschine <1>",
        summary="Kurz gesagt.",
        body_md="Absatz mit **Betonung**.\n\n<script>alert(1)</script>",
        published_at=when,
        citations=(Citation("Verband", "Bericht", "https://example.org/b", "2026-03-11"),),
    )


def test_targets_file_holds_both_targets() -> None:
    targets = load_targets(ROOT / "config" / "targets.yaml")
    assert set(targets) == {"radarauditor", "beispiel"}
    assert targets["radarauditor"].path_prefix == "/blog/"
    assert targets["beispiel"].notice


def test_load_targets_reports_a_missing_file(tmp_path: Path) -> None:
    with pytest.raises(PublishError, match="does not exist"):
        load_targets(tmp_path / "fehlt.yaml")


def test_german_date_uses_berlin_time() -> None:
    assert german_date(datetime(2026, 10, 15, 23, 30, tzinfo=UTC)) == "16. Oktober 2026"


def test_tracked_link_adds_campaign_parameters() -> None:
    link = tracked_link("https://example.org/?a=1", campaign="probe", post="erster")
    assert link == (
        "https://example.org/?a=1&utm_source=blog&utm_medium=artikel"
        "&utm_campaign=probe&utm_content=erster"
    )


def test_post_page_escapes_and_lists_sources(target: Target) -> None:
    page = render_post(_post(), target, TEMPLATES)
    assert "&lt;1&gt;" in page
    assert "<script>alert(1)</script>" not in page
    assert "<strong>Betonung</strong>" in page
    assert 'href="https://example.org/b"' in page
    assert "utm_content=erster" in page
    assert target.notice in page


@pytest.mark.parametrize("key", ["radarauditor", "beispiel"])
def test_every_template_renders(key: str) -> None:
    current = load_targets(ROOT / "config" / "targets.yaml")[key]
    files = site_files([_post()], current, TEMPLATES, COUNTER)
    folder = current.folder
    assert set(files) == {
        f"{folder}/erster/index.html",
        f"{folder}/index.html",
        f"{folder}/feed.xml",
        f"{folder}/zaehler.js",
    }
    assert "$" not in files[f"{folder}/index.html"].replace("$(", "")
    assert "public-key-for-hits-only" in files[f"{folder}/zaehler.js"]


def test_index_without_posts_says_so(target: Target) -> None:
    files = site_files([], target, TEMPLATES, COUNTER)
    assert "Noch keine Beiträge" in files[f"{target.folder}/index.html"]


def test_feed_is_newest_first(target: Target) -> None:
    feed = render_feed([_post("alt", NOW - timedelta(days=3)), _post("neu")], target)
    assert feed.index("/neu/") < feed.index("/alt/")


def _running_campaign(fake: FakeCockpit, **extra: object) -> dict[str, object]:
    values: dict[str, object] = {
        "slug": "probe",
        "target": "beispiel",
        "status": "running",
        "is_example": True,
        "duration_days": 28,
        "started_at": (NOW - timedelta(days=1)).isoformat(),
    }
    values.update(extra)
    return fake.add("campaigns", **values)


def _approved(
    fake: FakeCockpit, campaign_id: object, slug: str, channel: str, due: datetime
) -> None:
    fake.add(
        "posts",
        campaign_id=campaign_id,
        channel=channel,
        slug=slug,
        title=f"Titel {slug}",
        summary="Kurz.",
        body_md="Text.",
        status="approved",
        scheduled_for=due.isoformat(),
        post_findings=[],
    )


def test_publish_commits_due_blog_posts_and_reports_linkedin(target: Target) -> None:
    fake, writer = FakeCockpit(), FakeWriter()
    campaign = _running_campaign(fake)
    _approved(fake, campaign["id"], "faellig", "blog", NOW - timedelta(minutes=5))
    _approved(fake, campaign["id"], "morgen", "blog", NOW + timedelta(days=1))
    _approved(fake, campaign["id"], "netzwerk", "linkedin", NOW - timedelta(minutes=5))
    result = publish_due(
        cast(CockpitClient, fake), writer, {"beispiel": target}, TEMPLATES, COUNTER, NOW
    )
    assert result.published == ["faellig"]
    assert result.linkedin_due == ["netzwerk"]
    ((repo, branch, files, _),) = writer.commits
    assert (repo, branch) == (target.repo, target.branch)
    assert f"{target.folder}/faellig/index.html" in files
    published = [row for row in fake.rows("posts") if row["status"] == "published"]
    assert [row["slug"] for row in published] == ["faellig"]
    assert published[0]["url"] == f"{target.base_url}faellig/"


def test_publish_skips_campaigns_that_are_not_running(target: Target) -> None:
    fake, writer = FakeCockpit(), FakeWriter()
    campaign = _running_campaign(fake, status="paused")
    _approved(fake, campaign["id"], "faellig", "blog", NOW - timedelta(minutes=5))
    result = publish_due(
        cast(CockpitClient, fake), writer, {"beispiel": target}, TEMPLATES, COUNTER, NOW
    )
    assert result.published == []
    assert writer.commits == []


def test_publish_refuses_unknown_targets() -> None:
    fake = FakeCockpit()
    _running_campaign(fake)
    with pytest.raises(PublishError, match="unknown target"):
        publish_due(cast(CockpitClient, fake), FakeWriter(), {}, TEMPLATES, COUNTER, NOW)


def test_publish_closes_a_campaign_whose_time_is_up(target: Target) -> None:
    fake = FakeCockpit()
    _running_campaign(fake, started_at=(NOW - timedelta(days=30)).isoformat())
    result = publish_due(
        cast(CockpitClient, fake), FakeWriter(), {"beispiel": target}, TEMPLATES, COUNTER, NOW
    )
    assert result.finished == ["probe"]
    assert fake.rows("campaigns")[0]["status"] == "done"


def test_mark_linkedin_posted_only_accepts_approved_linkedin_posts() -> None:
    fake = FakeCockpit()
    campaign = _running_campaign(fake)
    _approved(fake, campaign["id"], "netzwerk", "linkedin", NOW)
    post_id = str(fake.rows("posts")[0]["id"])
    row = mark_linkedin_posted(
        cast(CockpitClient, fake), post_id, "https://linkedin.example/1", NOW
    )
    assert row["status"] == "published"
    with pytest.raises(PublishError):
        mark_linkedin_posted(cast(CockpitClient, fake), post_id, "https://x", NOW)


def test_views_and_clicks_count_page_reads_and_tracked_visits(target: Target) -> None:
    post: dict[str, Any] = {"slug": "erster", "channel": "blog"}
    hits: list[dict[str, Any]] = [
        {"host": target.host, "path": "/beispiel-blog/erster/", "campaign": None, "content": None},
        {"host": target.host, "path": "/beispiel-blog/erster", "campaign": None, "content": None},
        {"host": target.host, "path": "/beispiel-blog/", "campaign": None, "content": None},
        {"host": "x", "path": "/beispiel-blog/anfrage/", "campaign": "probe", "content": "erster"},
        {"host": "x", "path": "/", "campaign": "andere", "content": "erster"},
    ]
    assert views_and_clicks(hits, post, "probe", target) == (2, 1)


def test_fold_hits_writes_one_row_per_post_and_day(target: Target) -> None:
    fake = FakeCockpit()
    campaign = _running_campaign(fake)
    fake.add("posts", campaign_id=campaign["id"], slug="erster", channel="blog", status="published")
    for _ in range(3):
        fake.add("hits", day="2026-10-19", host=target.host, path="/beispiel-blog/erster/")
    client = cast(CockpitClient, fake)
    result = fold_hits(client, {"beispiel": target}, date(2026, 10, 19))
    fold_hits(client, {"beispiel": target}, date(2026, 10, 19))
    assert (result.hits, result.rows) == (3, 1)
    assert [(row["views"], row["source"]) for row in fake.rows("metrics")] == [(3, "counter")]


def test_simulation_is_repeatable_and_fades() -> None:
    first = simulated_day("linkedin", "netzwerk", 0)
    assert first == simulated_day("linkedin", "netzwerk", 0)
    assert simulated_day("linkedin", "netzwerk", 12)[0] < first[0]


def test_simulation_only_touches_example_campaigns() -> None:
    fake = FakeCockpit()
    example = _running_campaign(fake)
    real = _running_campaign(fake, slug="echt", is_example=False)
    for campaign in (example, real):
        fake.add(
            "posts",
            campaign_id=campaign["id"],
            slug="p",
            channel="blog",
            status="published",
            published_at=(NOW - timedelta(days=2)).isoformat(),
        )
    written = simulate_example(cast(CockpitClient, fake), NOW.date())
    assert written == 3
    assert {row["source"] for row in fake.rows("metrics")} == {"simulated"}


def test_report_compares_with_the_goal_and_flags_simulation() -> None:
    campaign = {"title": "Probe", "status": "running", "kpi": {"views": 100, "clicks": 10}}
    posts = [
        {
            "id": "1",
            "title": "Erster",
            "channel": "blog",
            "status": "published",
            "published_at": "2026-10-18T07:00:00+00:00",
        },
        {"id": "2", "title": "Zweiter", "channel": "linkedin", "status": "review"},
    ]
    metrics = [
        {
            "post_id": "1",
            "day": "2026-10-18",
            "views": 50,
            "clicks": 4,
            "leads": 1,
            "source": "simulated",
        }
    ]
    text = render_report(campaign, posts, metrics, date(2026, 10, 19))
    assert "| Aufrufe | 50 | 50 | 100 | 50 % |" in text
    assert "simuliert" in text
    assert "wartet auf Freigabe: Zweiter" in text


def test_write_report_stores_one_report_per_period() -> None:
    fake = FakeCockpit()
    campaign = _running_campaign(fake, title="Probe", kpi={})
    client = cast(CockpitClient, fake)
    write_report(client, campaign, date(2026, 10, 19))
    write_report(client, campaign, date(2026, 10, 19))
    assert len(fake.rows("reports")) == 1


def _github_transport(moves: list[int]) -> httpx.MockTransport:
    def handle(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "GET" and "/git/ref/" in path:
            return httpx.Response(200, json={"object": {"sha": "head"}})
        if request.method == "GET" and "/git/commits/" in path:
            return httpx.Response(200, json={"tree": {"sha": "tree"}})
        if path.endswith("/git/trees"):
            body = json.loads(request.content)
            assert body["tree"][0]["path"] == "a.html"
            return httpx.Response(201, json={"sha": "newtree"})
        if path.endswith("/git/commits"):
            return httpx.Response(201, json={"sha": "c1", "html_url": "https://github.com/c1"})
        if request.method == "PATCH":
            moves.append(1)
            return httpx.Response(422 if len(moves) == 1 else 200, json={})
        return httpx.Response(404)

    return httpx.MockTransport(handle)


def test_github_writer_retries_when_the_branch_moved() -> None:
    moves: list[int] = []
    writer = GitHubWriter("t", transport=_github_transport(moves))
    assert writer.commit("o/r", "main", {"a.html": "x"}, "m") == "https://github.com/c1"
    assert len(moves) == 2


def test_cockpit_client_sends_the_schema_and_wraps_errors() -> None:
    seen: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path.endswith("/bad"):
            return httpx.Response(400, json={"message": "nein"})
        return httpx.Response(200, json=[{"id": 1}])

    client = CockpitClient("https://db.example", "k", transport=httpx.MockTransport(handle))
    assert client.select("campaigns", {"status": "eq.running"}) == [{"id": 1}]
    assert seen[0].headers["Accept-Profile"] == "marketing"
    assert seen[0].url.params["status"] == "eq.running"
    with pytest.raises(CockpitError, match="nein"):
        client.select("bad", {})


def test_replay_publishes_an_example_on_its_days(target: Target) -> None:
    from agentic_marketing.example_run import replay_example

    fake, writer = FakeCockpit(), FakeWriter()
    campaign = fake.add(
        "campaigns",
        slug="probe",
        target="beispiel",
        status="ready",
        is_example=True,
        duration_days=21,
        publish_time="08:30:00",
        title="Probe",
        kpi={},
        started_at=None,
    )
    for slug, channel, offset in [("a", "blog", 0), ("b", "linkedin", 1), ("c", "blog", 5)]:
        fake.add(
            "posts",
            campaign_id=campaign["id"],
            channel=channel,
            slug=slug,
            title=slug,
            summary="",
            body_md="Text.",
            status="approved",
            day_offset=offset,
            scheduled_for=None,
            post_findings=[],
        )
    result = replay_example(
        cast(CockpitClient, fake),
        writer,
        {"beispiel": target},
        TEMPLATES,
        COUNTER,
        slug="probe",
        start=date(2026, 9, 21),
        until=date(2026, 10, 15),
    )
    assert (result.published, result.posted) == (["a", "c"], ["b"])
    assert len(writer.commits) == 2
    published = {row["slug"]: row["published_at"][:10] for row in fake.rows("posts")}
    assert published == {"a": "2026-09-21", "b": "2026-09-22", "c": "2026-09-26"}
    assert result.reports == [date(2026, 9, 27), date(2026, 10, 4), date(2026, 10, 11)]
    assert fake.rows("campaigns")[0]["status"] == "done"


def test_replay_refuses_a_real_campaign(target: Target) -> None:
    from agentic_marketing.errors import CampaignError
    from agentic_marketing.example_run import replay_example

    fake = FakeCockpit()
    fake.add("campaigns", slug="echt", is_example=False, status="ready")
    with pytest.raises(CampaignError, match="not an example"):
        replay_example(
            cast(CockpitClient, fake),
            FakeWriter(),
            {"beispiel": target},
            TEMPLATES,
            COUNTER,
            slug="echt",
            start=date(2026, 9, 21),
            until=date(2026, 10, 15),
        )


def test_simulation_stops_at_the_end_of_a_campaign() -> None:
    fake = FakeCockpit()
    campaign = _running_campaign(fake, ended_at="2026-10-12T06:30:00+00:00", status="done")
    post = fake.add(
        "posts",
        campaign_id=campaign["id"],
        slug="p",
        channel="blog",
        status="published",
        published_at="2026-10-10T06:30:00+00:00",
    )
    fake.add(
        "metrics",
        post_id=post["id"],
        day="2026-10-14",
        views=5,
        clicks=0,
        leads=0,
        source="simulated",
    )
    written = simulate_example(cast(CockpitClient, fake), date(2026, 10, 20))
    assert written == 3
    assert max(row["day"] for row in fake.rows("metrics")) == "2026-10-12"
