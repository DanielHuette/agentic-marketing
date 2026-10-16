"""Rendering blog posts into static pages.

Context: The blog targets are static sites, so publishing means writing HTML files into a
repository. A post page always ends with the sources of the findings it cites, so a reader
can check every number the same way the reviewer did. | Input: posts, their findings and a
target description. | Output: the files of the post page, the index and the feed.
"""

from __future__ import annotations

import html
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from email.utils import format_datetime
from pathlib import Path
from string import Template
from urllib.parse import urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import yaml
from markdown_it import MarkdownIt
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from agentic_marketing.errors import PublishError

BERLIN = ZoneInfo("Europe/Berlin")
MONTHS = (
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
)
_MARKDOWN = MarkdownIt("commonmark", {"html": False, "linkify": False, "typographer": False})


class Target(BaseModel):
    """A static site a campaign publishes its blog posts to."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    repo: str = Field(pattern=r"^[\w.-]+/[\w.-]+$")
    branch: str = "main"
    folder: str = Field(min_length=1, description="Folder of the blog inside the repository.")
    base_url: str = Field(pattern=r"^https://.+/$")
    template: str = Field(min_length=2)
    site_name: str = Field(min_length=2)
    blog_title: str = Field(min_length=2)
    blog_intro: str = Field(min_length=10)
    cta_url: str = Field(pattern=r"^https://")
    cta_label: str = Field(min_length=2)
    notice: str = Field(
        default="", description="Shown on every page, e.g. that posts are fictional."
    )

    @property
    def host(self) -> str:
        """Host name of the blog."""
        return urlsplit(self.base_url).netloc

    @property
    def path_prefix(self) -> str:
        """Path of the blog index, ending in a slash."""
        return urlsplit(self.base_url).path

    @property
    def cta_host(self) -> str:
        """Host the call to action points to."""
        return urlsplit(self.cta_url).netloc


def load_targets(path: Path) -> dict[str, Target]:
    """Read the publishing targets.

    Raises:
        PublishError: If the file is missing or a target is invalid.
    """
    if not path.is_file():
        raise PublishError(f"{path} does not exist")
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return {key: Target(**value) for key, value in raw.get("targets", {}).items()}
    except (yaml.YAMLError, TypeError, ValidationError) as error:
        raise PublishError(f"{path}: {error}") from error


COUNTER_FILE = "zaehler.js"
COUNTER_SCRIPT = """// Counts one page load. No cookie, nothing about the reader.
(function () {
  var q = new URLSearchParams(location.search);
  try {
    fetch("$url/rest/v1/rpc/record_hit", {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: "$key",
        "Content-Type": "application/json",
        "Content-Profile": "marketing"
      },
      body: JSON.stringify({
        p_host: location.host,
        p_path: location.pathname,
        p_campaign: q.get("utm_campaign"),
        p_content: q.get("utm_content")
      })
    }).catch(function () {});
  } catch (e) {}
})();
"""


@dataclass(frozen=True, slots=True)
class Counter:
    """Where the pages report their hits: the cockpit address and its public key.

    The public key may only call the hit function; it reads nothing.
    """

    url: str
    key: str


@dataclass(frozen=True, slots=True)
class Citation:
    """One source line under a post."""

    publisher: str
    title: str
    url: str | None
    published: str | None


@dataclass(frozen=True, slots=True)
class BlogPost:
    """Everything a page needs about one published post."""

    campaign: str
    slug: str
    title: str
    summary: str
    body_md: str
    published_at: datetime
    citations: tuple[Citation, ...] = field(default_factory=tuple)


def german_date(moment: datetime) -> str:
    """A date as a German reader writes it, e.g. `16. Oktober 2026`."""
    local = moment.astimezone(BERLIN)
    return f"{local.day}. {MONTHS[local.month - 1]} {local.year}"


def _iso_day(moment: datetime) -> str:
    return moment.astimezone(BERLIN).date().isoformat()


def tracked_link(url: str, *, campaign: str, post: str) -> str:
    """The call-to-action address with campaign parameters, so a click can be counted."""
    parts = urlsplit(url)
    query = urlencode(
        {
            "utm_source": "blog",
            "utm_medium": "artikel",
            "utm_campaign": campaign,
            "utm_content": post,
        }
    )
    joined = f"{parts.query}&{query}" if parts.query else query
    return urlunsplit((parts.scheme, parts.netloc, parts.path or "/", joined, parts.fragment))


def post_url(target: Target, slug: str) -> str:
    """Public address of a post."""
    return f"{target.base_url}{slug}/"


def _template(templates: Path, target: Target, name: str) -> Template:
    path = templates / target.template / f"{name}.html"
    if not path.is_file():
        raise PublishError(f"template {path} does not exist")
    return Template(path.read_text(encoding="utf-8"))


def _sources_html(citations: Sequence[Citation]) -> str:
    items = []
    for citation in citations:
        label = html.escape(f"{citation.publisher}: {citation.title}")
        if citation.url:
            label = f'<a href="{html.escape(citation.url, quote=True)}" rel="noopener">{label}</a>'
        date = f", {html.escape(citation.published)}" if citation.published else ""
        items.append(f"<li>{label}{date}</li>")
    return "\n".join(items)


def _common(target: Target) -> dict[str, str]:
    notice = f'<p class="notice">{html.escape(target.notice)}</p>' if target.notice else ""
    return {
        "site_name": html.escape(target.site_name),
        "blog_title": html.escape(target.blog_title),
        "blog_intro": html.escape(target.blog_intro),
        "index_url": html.escape(target.base_url, quote=True),
        "notice": notice,
        "cta_label": html.escape(target.cta_label),
    }


def render_post(post: BlogPost, target: Target, templates: Path) -> str:
    """The HTML page of one post."""
    values = _common(target) | {
        "title": html.escape(post.title),
        "summary": html.escape(post.summary),
        "date_iso": _iso_day(post.published_at),
        "date_long": german_date(post.published_at),
        "body_html": _MARKDOWN.render(post.body_md),
        "sources_html": _sources_html(post.citations),
        "canonical": html.escape(post_url(target, post.slug), quote=True),
        "cta_url": html.escape(
            tracked_link(target.cta_url, campaign=post.campaign, post=post.slug), quote=True
        ),
    }
    return _template(templates, target, "post").substitute(values)


def render_index(posts: Sequence[BlogPost], target: Target, templates: Path) -> str:
    """The blog index, newest post first."""
    ordered = sorted(posts, key=lambda item: item.published_at, reverse=True)
    cards = [
        (
            f'<article class="card"><time datetime="{_iso_day(post.published_at)}">'
            f"{german_date(post.published_at)}</time>"
            f'<h2><a href="{post.slug}/">{html.escape(post.title)}</a></h2>'
            f"<p>{html.escape(post.summary)}</p></article>"
        )
        for post in ordered
    ]
    values = _common(target) | {"cards_html": "\n".join(cards) or "<p>Noch keine Beiträge.</p>"}
    return _template(templates, target, "index").substitute(values)


def render_counter(counter: Counter) -> str:
    """The script every page of a target loads to report its hit."""
    return Template(COUNTER_SCRIPT).substitute(url=counter.url.rstrip("/"), key=counter.key)


def render_feed(posts: Sequence[BlogPost], target: Target) -> str:
    """An RSS feed of the published posts, newest first."""
    ordered = sorted(posts, key=lambda item: item.published_at, reverse=True)
    items = "".join(
        "<item>"
        f"<title>{html.escape(post.title)}</title>"
        f"<link>{html.escape(post_url(target, post.slug))}</link>"
        f"<guid>{html.escape(post_url(target, post.slug))}</guid>"
        f"<pubDate>{format_datetime(post.published_at)}</pubDate>"
        f"<description>{html.escape(post.summary)}</description>"
        "</item>"
        for post in ordered
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
        f"<title>{html.escape(target.blog_title)}</title>"
        f"<link>{html.escape(target.base_url)}</link>"
        f"<description>{html.escape(target.blog_intro)}</description>"
        f"<language>de</language>{items}</channel></rss>\n"
    )


def site_files(
    posts: Sequence[BlogPost], target: Target, templates: Path, counter: Counter
) -> dict[str, str]:
    """Every file the blog folder holds after publishing, keyed by repository path."""
    folder = target.folder.strip("/")
    files = {
        f"{folder}/{post.slug}/index.html": render_post(post, target, templates) for post in posts
    }
    files[f"{folder}/index.html"] = render_index(posts, target, templates)
    files[f"{folder}/feed.xml"] = render_feed(posts, target)
    files[f"{folder}/{COUNTER_FILE}"] = render_counter(counter)
    return files
