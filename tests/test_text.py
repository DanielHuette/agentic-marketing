"""Tests for text.

Context: Figure matching decides every verdict, so its edge cases are pinned here. |
Input: strings. | Output: assertions.
"""

from __future__ import annotations

import pytest

from agentic_marketing.text import (
    contains_figure,
    estimate_tokens,
    figure_pattern,
    figure_variants,
    first_sentences,
    normalise,
    slugify,
)


@pytest.mark.parametrize(
    ("haystack", "figure"),
    [
        ("Der Anteil liegt bei 45,8 Prozent", "45,8"),
        ("The share is 45.8 percent", "45,8"),
        ("insgesamt 90.336 Personen", "90 336"),
        ("insgesamt 90336 Personen", "90.336"),
        ("Anteil 45,8 %", "45,8 %"),
    ],
)
def test_figure_is_found_across_spellings(haystack: str, figure: str) -> None:
    assert contains_figure(haystack, figure)


def test_absent_figure_is_not_found() -> None:
    assert not contains_figure("Der Anteil liegt bei 45,8 Prozent", "11,4")


@pytest.mark.parametrize(
    ("haystack", "figure"),
    [
        ("Am 17. September 2026 gemeldet", "1,7"),
        ("Es waren 116 Betriebe", "11,6"),
        ("Der Wert betraegt 145,88 Prozent", "45,8"),
        ("Insgesamt 1.234.567 Stueck", "234,5"),
    ],
)
def test_a_decimal_separator_is_never_dropped(haystack: str, figure: str) -> None:
    """Removing a decimal comma turns 1,7 into 17, which is a different number."""
    assert not contains_figure(haystack, figure)


def test_a_thousands_separator_may_be_dropped() -> None:
    assert contains_figure("waren rund 5 150 Betriebe", "5.150")
    assert contains_figure("waren rund 5150 Betriebe", "5.150")


def test_variants_show_what_was_looked_for() -> None:
    assert figure_variants("1,7") == {"1,7", "1.7"}
    assert figure_variants("90.336") == {"90.336", "90,336", "90 336", "90336"}


def test_a_figure_without_digits_has_no_pattern() -> None:
    assert figure_pattern("keine Zahl") is None


def test_variants_of_an_empty_figure_are_empty() -> None:
    assert figure_variants("   ") == set()
    assert figure_pattern("   ") is None


def test_normalise_unifies_the_spaces_sources_use_in_numbers() -> None:
    assert normalise("90\u202f336") == "90 336"


def test_slugify_strips_accents_and_punctuation() -> None:
    assert slugify("Berufsträger, 56+") == "berufstrager-56"


def test_token_estimate_rounds_up() -> None:
    assert estimate_tokens("x" * 5) == 2
    assert estimate_tokens("") == 0


def test_first_sentences_takes_whole_sentences() -> None:
    text = "Erster Satz. Zweiter Satz. Dritter Satz."
    assert first_sentences(text, 2) == "Erster Satz. Zweiter Satz."
