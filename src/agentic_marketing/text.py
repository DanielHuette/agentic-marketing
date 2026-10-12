"""Text helpers shared by several modules.

Context: Figure spellings and token estimates are needed in more than one place and are
easy to get subtly wrong, so they live here and are tested once. | Input: strings. |
Output: normalised strings, variants and sizes.
"""

from __future__ import annotations

import math
import re
import unicodedata

CHARS_PER_TOKEN = 4
SEPARATORS = (".", ",", " ")
THOUSANDS_SEPARATOR = r"[.,\s]?"
DECIMAL_SEPARATOR = r"[.,]"
NARROW_NO_BREAK_SPACE = "\u202f"
NO_BREAK_SPACE = "\u00a0"
_NON_SLUG = re.compile(r"[^a-z0-9]+")
_WHITESPACE = re.compile(r"\s+")
_FIGURE_SPLIT = re.compile(r"([.,\s])")


def slugify(value: str) -> str:
    """Reduce a label to lowercase letters, digits and single hyphens."""
    folded = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return _NON_SLUG.sub("-", folded.lower()).strip("-")


def normalise(text: str) -> str:
    """Collapse whitespace and unify the space characters sources use inside numbers."""
    unified = text.replace(NARROW_NO_BREAK_SPACE, " ").replace(NO_BREAK_SPACE, " ")
    return _WHITESPACE.sub(" ", unified)


def figure_pattern(figure: str) -> re.Pattern[str] | None:
    """Build the expression that finds a figure in a source, whatever its spelling.

    The same number is written differently across languages and house styles, and a
    check that misses that reports failures that are not failures. Two separators are
    treated differently, because confusing them is how a check starts lying:

    - A separator before exactly three digits is a thousands separator. It may be a dot,
      a comma, a space, or absent: `90.336`, `90,336`, `90 336` and `90336` are one
      number.
    - Any other separator is a decimal separator. It may be a dot or a comma, and it may
      never be dropped: `1,7` is not `17`.

    The match is bounded on both sides, so `45,8` is not found inside `145,88`.

    Args:
        figure: The figure as the finding states it.

    Returns:
        The compiled expression, or None when the figure holds no digit.
    """
    bare = normalise(figure).strip().rstrip("%").strip()
    if not any(character.isdigit() for character in bare):
        return None
    parts = _FIGURE_SPLIT.split(bare)
    pieces: list[str] = []
    for index, part in enumerate(parts):
        if index % 2 == 0:
            pieces.append(re.escape(part))
            continue
        following = parts[index + 1] if index + 1 < len(parts) else ""
        thousands = len(following) == 3 and following.isdigit()
        pieces.append(THOUSANDS_SEPARATOR if thousands else DECIMAL_SEPARATOR)
    return re.compile(r"(?<![\d.,])" + "".join(pieces) + r"(?![\d])")


def figure_variants(figure: str) -> set[str]:
    """The spellings the pattern accepts, for showing a reviewer what was looked for.

    Args:
        figure: The figure as the finding states it.

    Returns:
        Every spelling, including the original. Empty when the figure holds no digit.
    """
    bare = normalise(figure).strip().rstrip("%").strip()
    if not any(character.isdigit() for character in bare):
        return set()
    parts = _FIGURE_SPLIT.split(bare)
    spellings = {""}
    for index, part in enumerate(parts):
        if index % 2 == 0:
            spellings = {spelling + part for spelling in spellings}
            continue
        following = parts[index + 1] if index + 1 < len(parts) else ""
        thousands = len(following) == 3 and following.isdigit()
        options = (*SEPARATORS, "") if thousands else (".", ",")
        spellings = {spelling + option for spelling in spellings for option in options}
    return spellings


def contains_figure(haystack: str, figure: str) -> bool:
    """Whether any accepted spelling of a figure occurs in a text."""
    pattern = figure_pattern(figure)
    return bool(pattern and pattern.search(normalise(haystack)))


def estimate_tokens(text: str) -> int:
    """Estimate the token count of a text.

    The ratio is a documented approximation of four characters per token, which holds
    well enough for German and English prose. Every command that prints a token figure
    prints the character count next to it, so the exact number stays visible.

    Args:
        text: The text to measure.

    Returns:
        The estimated number of tokens.
    """
    return math.ceil(len(text) / CHARS_PER_TOKEN)


def first_sentences(text: str, count: int) -> str:
    """The first sentences of a text, used to quote evidence without quoting a page."""
    parts = re.split(r"(?<=[.!?])\s+", normalise(text).strip())
    return " ".join(parts[:count]).strip()
