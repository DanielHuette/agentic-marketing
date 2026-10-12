# Baubericht

[English version](BUILD_REPORT.md)

## Herkunft

**Context:** Woher der Entwurf stammt. | **Input:** drei Stunden Mitschnitt eines Seminars
zu agentischem Marketing und eine sechsminütige Vorführung des Arbeitsbereichs. |
**Output:** die Entscheidungen unten.

Das Seminar zeigte einen Arbeitsbereich aus reinen Markdown-Dateien, einen Befehl, der
eine feste Auswahl an Grunddateien lädt, Analysen in datierten Laufordnern und eine
Berichtsseite, auf der der Vortragende jeden Befund von Hand behielt oder verwarf, bevor
eine kompakte Datei in den Arbeitsbereich kam. Drei Glieder dieser Kette hatten keine
Umsetzung.

| Befund | Änderung | Nachweis |
|---|---|---|
| Die Prüfseite hat keinen Rückweg auf die Platte; die kompakte Datei entsteht von Hand | `review` baut eine Seite, deren Entscheidungen als Datei gesichert werden, `apply` baut die gepflegte Datei allein aus Lauf und Entscheidungen | `src/agentic_marketing/review.py`, `tests/test_review.py` |
| Nichts prüft, ob die genannte Quelle die Zahl hergibt | zwei Stufen: Zahlen im Quelltext nachgeschlagen, danach ein Modell für das Offene | `src/agentic_marketing/verify.py`, `src/agentic_marketing/judge.py` |
| Die Verdichtung wird behauptet, nie gemessen | jedes `apply` gibt Befunde, Urteile, Behaltenes und den Anteil am Lauf aus | `src/agentic_marketing/report.py`, `tests/test_report.py` |
| Der Zahlenabgleich entfernte das Dezimalkomma, so dass `1,7` auf die `17` eines fremden Datums passte | ein Trennzeichen vor genau drei Ziffern darf wegfallen, jedes andere nur getauscht werden; der Treffer ist beidseitig begrenzt | `src/agentic_marketing/text.py`, `tests/test_text.py`, gefunden von `scripts/benchmark.py` |
| Die Komma-Korrektur hielt den Punkt eines Datums (`1. Januar 2026`) für ein Dezimaltrennzeichen; das mitgelieferte Beispiel fiel von 6 auf 5 belegte Befunde, die README nannte weiter 6 | ein Trennzeichen gehört nur zur Zahl, wenn links und rechts eine Ziffer steht, sonst muss es wörtlich passen | `src/agentic_marketing/text.py`, `tests/test_text.py`, `tests/test_cli.py::test_the_bundled_example_verifies_as_documented` |
| Viele Seiten weisen Aufrufe ohne aussagekräftige Kennung ab | jeder Abruf sendet eine, mit der hinterlegten Kontaktadresse | `src/agentic_marketing/sources.py` |
| `last_updated` wird geschrieben und nie beachtet | `stale` stuft nach Alterungsklasse ein und meldet Fälliges, ohne zu löschen | `src/agentic_marketing/freshness.py`, `tests/test_freshness.py` |
| Keine Installation, kein Beispiel, keine Tests | installierbares Paket, mitgelieferter Beispiel-Arbeitsbereich ohne Netzbedarf, 122 Tests | `pyproject.toml`, `src/agentic_marketing/example/`, `tests/` |

## Entscheidungen, die den Code geformt haben

**Context:** Was ein Leser des Codes sonst rückwärts erschließen müsste. | **Input:** die
Probleme oben. | **Output:** der Aufbau des Pakets.

| Entscheidung | Verworfene Alternative | Grund |
|---|---|---|
| Eine Datei je Befund mit YAML-Kopf | viele Befunde aus einem Aufsatz herauslesen | Die Herkunft bleibt erhalten. Ein Befund lässt sich entscheiden, verschieben, zurückverfolgen. |
| Zahlenabgleich über Trennzeichen hinweg | wörtlicher Zeichenvergleich | Deutsches `90.336` und englisches `90,336` sind eine Zahl. Falsche Fehlermeldungen gewöhnen den Prüfenden ans Durchwinken. |
| Das Modell sieht nie eine ungelesene Quelle | trotzdem fragen und die Antwort nehmen | Ohne Text antwortet das Modell aus dem Gedächtnis, und genau das soll das Projekt verhindern. |
| Urteile und Entscheidungen in getrennten Dateien | eine gemeinsame Zustandsdatei | `verify` darf unbeaufsichtigt und mehrfach laufen; eine menschliche Entscheidung darf dabei nicht überschrieben werden. |
| Atomares Schreiben jeder erzeugten Datei | direkt an Ort und Stelle schreiben | Eine gepflegte Datei, die ein Agent während des Schreibens liest, ist schlimmer als eine veraltete. |

## Abschlussprüfung

**Context:** Was gelaufen ist, bevor der Bau als fertig galt. | **Input:** das
Repository. | **Output:** die Ergebnisse unten.

| Prüfung | Ergebnis |
|---|---|
| `ruff check` | bestanden |
| `ruff format --check` | bestanden |
| `mypy src tests` (strict) | keine Befunde in 32 Dateien |
| `pytest` | 122 bestanden |
| Durchlauf auf dem Beispiel | 7 Befunde, 6 belegt, 1 teilweise, 6 behalten, 30 % des Laufs |
| Prüfstand gegen echte Quellen, Zahlenstufe | 16 von 16 Urteilen wie erklärt, 0 übersehen, 0 Fehlalarme |
| Prüfstand gegen echte Quellen, Modellstufe | 16 von 16 Urteilen wie erklärt, beide umgedrehten Aussagen gefangen |
| `pack` auf dem Beispiel | 5.668 Zeichen, rund 1.419 Tokens, Budget 12.000 |
| Geheimnisse, absolute lokale Pfade, Debug-Ausgaben, auskommentierter Code, TODO-Reste | nichts gefunden |

## Offen

**Context:** Was ein Leser wissen sollte, das nicht erledigt ist. | **Input:** der
aktuelle Stand. | **Output:** die Liste unten.

| Punkt | Warum offen |
|---|---|
| Der Prüfstand deckt eine Linse und sechs Quellen ab | Er misst die Prüfstufen, und die hängen nicht an der Linse. Ein breiteres Feld würde die Quellen messen, nicht den Code. |
| Nur für die Makro-Linse liegt ein Beispiellauf bei | Die anderen fünf Linsen teilen Laufformat und Codepfad; ein zweites Beispiel würde die Skills belegen, nicht den Code. |
| Eingescannte PDF-Quellen | `pypdf` liest eine Textebene. Eine eingescannte Seite erzeugt einen lesbaren Fehler statt stiller Leere; Texterkennung ist nicht Teil des Projekts. |
