"""Writing files into a GitHub repository in one commit.

Context: A blog target is a folder in a repository that a hosting service deploys on every
push. Publishing several files at once (post, index, feed) has to land as one commit, so a
half-published state never goes live. | Input: a repository, a branch and file contents. |
Output: the commit address.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any, Self

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from agentic_marketing.config import Settings
from agentic_marketing.errors import PublishError

logger = logging.getLogger(__name__)

API = "https://api.github.com"
REQUEST_TIMEOUT = 30.0
COMMIT_ATTEMPTS = 3


def _transient(error: BaseException) -> bool:
    if isinstance(error, httpx.TimeoutException | httpx.NetworkError | httpx.RemoteProtocolError):
        return True
    return isinstance(error, httpx.HTTPStatusError) and error.response.status_code >= 500


class GitHubWriter:
    """Commits files to a branch through the Git data interface."""

    def __init__(
        self,
        token: str,
        *,
        author: Mapping[str, str] | None = None,
        transport: httpx.BaseTransport | None = None,
    ):
        self._http = httpx.Client(
            base_url=API,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=REQUEST_TIMEOUT,
            transport=transport,
        )
        self._author = dict(author) if author else None

    @classmethod
    def from_settings(cls, settings: Settings) -> Self:
        """Build a writer from the environment.

        Raises:
            PublishError: If no token is configured.
        """
        if settings.github_token is None:
            raise PublishError("set AGENTIC_MARKETING_GITHUB_TOKEN to publish to a repository")
        return cls(settings.github_token.get_secret_value())

    def close(self) -> None:
        """Release the connection pool."""
        self._http.close()

    @retry(
        retry=retry_if_exception(_transient),
        wait=wait_exponential(max=20),
        stop=stop_after_attempt(4),
        reraise=True,
    )
    def _request(self, method: str, path: str, payload: Mapping[str, Any] | None = None) -> Any:
        response = self._http.request(method, path, json=payload)
        response.raise_for_status()
        return response.json()

    def _call(self, method: str, path: str, payload: Mapping[str, Any] | None = None) -> Any:
        try:
            return self._request(method, path, payload)
        except httpx.HTTPStatusError as error:
            raise PublishError(
                f"GitHub {method} {path}: {error.response.status_code} {error.response.text[:200]}"
            ) from error
        except httpx.HTTPError as error:
            raise PublishError(f"GitHub {method} {path}: {error}") from error

    def commit(self, repo: str, branch: str, files: Mapping[str, str], message: str) -> str:
        """Write files to a branch in one commit.

        A branch that moved between reading and writing is read again, so a concurrent push
        is not overwritten.

        Args:
            repo: `owner/name`.
            branch: Branch to commit to.
            files: Repository path to file content.
            message: Commit message.

        Returns:
            The address of the new commit.

        Raises:
            PublishError: If the branch keeps moving or GitHub refuses the write.
        """
        for attempt in range(1, COMMIT_ATTEMPTS + 1):
            head = self._call("GET", f"/repos/{repo}/git/ref/heads/{branch}")["object"]["sha"]
            base_tree = self._call("GET", f"/repos/{repo}/git/commits/{head}")["tree"]["sha"]
            tree = [
                {"path": path, "mode": "100644", "type": "blob", "content": content}
                for path, content in sorted(files.items())
            ]
            new_tree = self._call(
                "POST", f"/repos/{repo}/git/trees", {"base_tree": base_tree, "tree": tree}
            )["sha"]
            payload: dict[str, Any] = {"message": message, "tree": new_tree, "parents": [head]}
            if self._author:
                payload["author"] = self._author
            commit = self._call("POST", f"/repos/{repo}/git/commits", payload)
            try:
                self._request(
                    "PATCH",
                    f"/repos/{repo}/git/refs/heads/{branch}",
                    {"sha": commit["sha"], "force": False},
                )
            except httpx.HTTPStatusError as error:
                if error.response.status_code == 422 and attempt < COMMIT_ATTEMPTS:
                    logger.warning("branch %s moved, retrying (%d)", branch, attempt)
                    continue
                raise PublishError(
                    f"cannot move {repo}@{branch}: {error.response.text[:200]}"
                ) from error
            return str(commit["html_url"])
        raise PublishError(f"{repo}@{branch} kept moving; nothing was published")
