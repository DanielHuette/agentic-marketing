# Agentic Marketing

Prüft jede Zahl eines Recherchelaufs gegen die genannte Quelle, bevor ein Mensch entscheidet, welche Befunde bleiben und zu Beiträgen werden.

[English version](README.md) · [Projektseite](https://agenticmarketing.speedofthespirit.dev/#projekt) · [So funktioniert es](https://agenticmarketing.speedofthespirit.dev/#organigramm) · [Messungen](https://agenticmarketing.speedofthespirit.dev/#benchmarks) · [Präsentation](https://agenticmarketing.speedofthespirit.dev/#praesentation) · [App](https://app.agenticmarketing.speedofthespirit.dev) · [Betriebsanleitung](Dokumentation/BETRIEBSANLEITUNG.de.md)

Stand: 16 Prüffälle gegen Seiten des Statistischen Bundesamts.

Ein Marketing-Arbeitsbereich für eine Recherche-Sitzung, die nach acht Skills arbeitet,
und der Schritt, der einer solchen Sitzung fehlt: Recherche kommt erst in den Arbeitsbereich,
nachdem eine feste Zahlenprüfung ihre Zahlen in den Quellen nachgeschlagen hat, ein
Modellrichter über die Anthropic-Schnittstelle das Offene bewertet hat und ein Mensch entschieden
hat, was bleibt. Ein Supabase-Trigger meldet jeden Beitrag, der auf Freigabe wartet, und jeden
veröffentlichten Beitrag an das RepoCity-Cockpit. Aus den geprüften Befunden werden
Beiträge, die ein Mensch in einer App freigibt, für jeden Kanal in einem Kalender plant und von
Hand postet, sobald das RepoCity-Cockpit sie als fällig meldet.

## Das Problem

Eine Recherche-Sitzung, die einen Markt untersucht, produziert viel Text. Die Seminarfassung
hört genau dort auf: Das Ergebnis wird gelesen, bewundert und irgendwohin kopiert. Zwei
Dinge gehen dabei schief.

Eine ungeprüfte Zahl sieht genauso aus wie eine geprüfte. Modelle liefern Zahlen mit
großer Selbstsicherheit, und Marketing ist der eine Anwendungsfall, bei dem eine falsche
Zahl in der Öffentlichkeit landet statt in einem fehlgeschlagenen Test.

Und das Ergebnis ist zu groß, um es zu benutzen. Wer einen ganzen Rechercheverlauf in die
nächste Sitzung zurückgibt, verbraucht seinen Kontext für Material, über das nie jemand
entschieden hat. Brauchbar ist ein Bruchteil davon, und nichts im üblichen Aufbau sagt
einem, welcher.

## Der Weg

Ein Lauf schreibt nie in den Arbeitsbereich. Er schreibt in einen datierten Ordner, und
dazwischen stehen drei Schritte:

```
<linse>/<linse>-<datum>/   eine Datei je Befund, mit Zahlen und Quelle
        ↓  verify          jede Zahl in der genannten Quelle nachgeschlagen
        ↓  review          ein Mensch behält oder verwirft, nachvollziehbar auf Platte
        ↓  apply
<linse>/<linse>.md         die gepflegte Datei, die einzige, die je wieder geladen wird
```

Die gepflegte Datei beginnt mit einem Satz, der zum Vertrag gehört und nicht zur
Verzierung:

> Jeder Punkt hier ist durch die Quelle dahinter belegt. Was nicht hier steht, gilt als
> ungeprüft und darf nicht erfunden werden.

## Zwei Stufen, in dieser Reihenfolge

**Zahlen.** Jede Quelle wird einmal geholt oder geöffnet, und jede Zahl, auf der ein
Befund ruht, wird darin gesucht. Nachrechenbar, ohne Modell, ohne Schlüssel, ohne Kosten.
Zahlen werden über Schreibweisen hinweg erkannt, denn eine deutsche Quelle mit `90.336`
und eine englische mit `90,336` meinen dieselbe Zahl — und eine Prüfung, die das übersieht,
gewöhnt den Prüfenden daran, Urteile durchzuwinken.

**Modell.** Nur für das, was die erste Stufe offen lässt: ein Befund, der die richtige
Zahl zitiert und den falschen Schluss daraus zieht, oder einer ganz ohne Zahl. Das Modell
antwortet über einen erzwungenen Werkzeugaufruf, es wird also nichts aus Fließtext
herausgelesen, und es muss die Stelle zitieren, auf die es sich stützt. Wo die Quelle
nicht gelesen werden konnte, wird kein Modell gefragt — ohne den Text würde es aus dem
Gedächtnis antworten.

## Schnellstart

Läuft gegen eine Kopie des Beispiel-Arbeitsbereichs in `tests/fixtures/workspace`. Keine
Daten, kein Schlüssel, kein Netz nötig.

```bash
git clone https://github.com/DanielHuette/agentic-marketing
cd agentic-marketing
uv sync                                   # oder: pip install -e .

cp -r tests/fixtures/workspace example    # die Befehle schreiben in den Arbeitsbereich
export AGENTIC_MARKETING_WORKSPACE=example
RUN=example/strategie/umwelt/makroanalyse/makroanalyse-2026-08-29
uv run agentic-marketing verify $RUN      # Zahlen prüfen
uv run agentic-marketing review $RUN      # Seite bauen, entscheiden, decisions.json sichern
uv run agentic-marketing apply  $RUN      # gepflegte Datei schreiben, Zahlen ausweisen
uv run agentic-marketing pack             # womit eine Sitzung startet
uv run pytest
```

Im Beispiellauf steckt ein absichtlicher Fehler: Ein Befund behauptet, der Nachschliffmarkt
wachse um 11,4 Prozent — eine Zahl, die in keiner Quelle steht. Die erste Stufe stuft ihn
als teilweise belegt ein, die mitgelieferte Entscheidung verwirft ihn, und in den
Rohnotizen steht, woher die Zahl kam.

Was das Beispiel misst:

| | |
|---|---|
| Befunde im Lauf | 7 |
| Zahlen belegt | 6 vollständig, 1 teilweise |
| Vom Menschen behalten | 6 |
| Rohlauf | 10.879 Zeichen |
| Gepflegte Datei | 3.535 Zeichen, 32,5 % des Laufs |
| Kontextpack der Sitzung | 5.668 Zeichen, rund 1.419 Tokens |

Ein Drittel ist die ehrliche Zahl für ein Beispiel, das klein genug zum Lesen ist. Ein
echter Lauf, dessen `raw/`-Ordner die Downloads und Arbeitsnotizen enthält, verdichtet
weit stärker. Der Sinn der Ausgabe nach jedem Lauf ist, dass die Zahl gemessen und nicht
behauptet wird.

## Prüfstand gegen echte Quellen

Beide Stufen werden gegen Seiten des Statistischen Bundesamtes gemessen, nicht gegen
Testdaten. `benchmark/cases.yaml` erklärt sechzehn Fälle, jeder aus einem Satz gebaut, der
dort tatsächlich steht, und jeder auf erklärte Weise verändert: Zahlen wie veröffentlicht,
in der anderen Schreibweise, eine Ziffer geändert, mit einer erfundenen gemischt, oder
richtig belassen und die Aussage drumherum umgedreht. Ein Fall zeigt auf eine Adresse, die
nicht mehr antwortet.

```bash
uv run python scripts/benchmark.py            # Zahlenstufe, kein Schlüssel nötig
uv run python scripts/benchmark.py --model    # beide Stufen
uv run python scripts/benchmark.py --offline  # gegen die gespeicherten Abzüge
```

Ergebnis des in `benchmark/RESULTS.md` festgehaltenen Laufs:

| | Zahlenstufe | Modellstufe |
|---|---|---|
| Urteile wie erklärt | 16 von 16 | 16 von 16 |
| Unbelegtes erkannt | 6 | 8 |
| Unbelegtes übersehen | 0 | 0 |
| Belegtes falsch angemeckert | 0 | 0 |

Auf die letzten beiden Zeilen kommt es an, und sie sind der Grund für die Teilung in zwei
Stufen. Die Zahlenstufe übersieht nichts Zahlenmäßiges und schlägt nirgends falschen
Alarm, lässt aber beide umgedrehten Aussagen durch: deren Zahlen stehen wirklich in der
Quelle, nur die Richtung nicht. Genau diese beiden fängt die Modellstufe — das ist der
ganze Grund, eine zweite Stufe zu bezahlen, und der Grund, warum sie nur sieht, was die
erste offen lässt.

Jeder Lauf gegen das Netz legt die Quellen als Abzug in `benchmark/snapshots/` ab und
hält ihre Prüfsummen fest, damit ein Ergebnis nachprüfbar bleibt, wenn die Seite dahinter
sich geändert hat.

Zwei Dinge sollte man über diesen Prüfstand wissen. Er hat einen echten Fehler gefunden,
bevor er fertig war: Der Zahlenabgleich hat das Dezimalkomma mitentfernt, so dass „1,7"
auf die „17" eines Datums an anderer Stelle der Seite passte. Ein Trennzeichen vor drei
Ziffern darf wegfallen, jedes andere nicht, und beide Regeln sind jetzt durch Tests
festgenagelt. Und eine erklärte Erwartung wurde zwischen dem ersten und diesem Lauf
korrigiert — weil die Falldatei sich selbst widersprach, nicht weil das Modell falsch lag;
die Begründung steht in `cases.yaml` neben dem Fall. Die Komma-Korrektur hat später Daten
gebrochen: Sie hielt den Punkt in „1. Januar 2026" für ein Dezimaltrennzeichen, und das
mitgelieferte Beispiel verlor einen belegten Befund. Ein Trennzeichen zählt jetzt nur dann
zur Zahl, wenn links und rechts eine Ziffer steht; ein Test hält die sechs belegten Befunde
des Beispiels fest, damit README und Code nicht wieder auseinanderlaufen.

## Von der Recherche zum Beitrag

Recherche allein ist kein Marketing. Der zweite Teil des Projekts bringt geprüfte Befunde
an die Öffentlichkeit, ohne das Tor dazwischen aufzugeben:

```
kampagnen/<name>/kampagne.yaml      Ziel, Zielgruppe, Laufzeit, Kennzahlenziele
kampagnen/<name>/beitraege/*.md     je Beitrag: Kanal, Versatz in Tagen, zitierte Befunde, Text
        ↓  campaign                 Zahlenwächter, Übergabe an die Datenbank
App                                 prüfen, bearbeiten, freigeben, „Freigeben & starten“
Planer                              eine Woche je Seite, jeder Kanal, neue Beiträge mit Termin
        ↓  stündlich in der Datenbank  „Jetzt posten“ als Meldung im RepoCity-Cockpit
Mensch                              postet aus dem Firmenkonto, „Als gepostet markieren“
```

Jede Zahl, die ein Beitrag zeigt, muss eine Zahl eines zitierten, behaltenen und belegten
Befunds sein. Der Wächter prüft das bei der Übergabe, beim Tippen in der App und ein drittes Mal
in der Datenbank: Ein Trigger verweigert die Freigabe, auch wenn jemand die App umgeht. Keine
Maschine postet; dreizehn Kanäle stehen in einem Kalender: Blog, LinkedIn, X, XING, Instagram,
Facebook, Threads, YouTube, TikTok, Reddit, Forum, Presse und Newsletter.

Das RepoCity-Cockpit erfährt drei Dinge: ein Beitrag wartet auf Freigabe, der Termin eines
Beitrags ist erreicht, ein Beitrag ist als veröffentlicht markiert. Eine gescheiterte Meldung
blockiert nie den Beitrag selbst.

| | Wo |
|---|---|
| App, installierbar | https://app.agenticmarketing.speedofthespirit.dev |
| Betrieb Schritt für Schritt | [Dokumentation/BETRIEBSANLEITUNG.de.md](Dokumentation/BETRIEBSANLEITUNG.de.md) |
| Aufbau, Datenmodell, Einrichtung | [Dokumentation/ARCHITEKTUR.de.md](Dokumentation/ARCHITEKTUR.de.md) |

Die erste echte Kampagne, „RadarAuditor: Lokale Sichtbarkeit im Münsterland“, ruht auf neun
Befunden von Bitkom, ZDH, Handwerkskammer Münster, Bundesnetzagentur und einer YouGov-Umfrage;
jede Zahl ist gegen ihre Live-Quelle geprüft. Ihre sechs Beiträge sind geschrieben und warten als
Entwürfe, bis das Produkt verkauft werden kann.

## Der Arbeitsbereich

`agentic-marketing new <ordner>` schreibt einen Arbeitsbereich, den du mit deinem eigenen
Material füllst:

```
stammdaten/     wer die Person und das Unternehmen sind
strategie/      Positionierung, Zielgruppe, Ziele, Umfeldanalysen
produkte/       Angebot, Wettbewerb, Fallbeispiele je Produkt
kanaele/        was je Kanal geplant, entworfen und veröffentlicht ist
kampagnen/      eine Kampagne von der Aufgabe bis zum Ergebnis
projekte/       wiederkehrende Arbeit, die kein Kanal ist
daten/          Exporte und die Quellen, gegen die geprüft wird
inbox/          fertige Ergebnisse, die auf eine Entscheidung warten
tools/          Notizen zu Werkzeugen, niemals Zugangsdaten
.claude/        der Befehl, die Regeln und acht Analyse-Skills
```

`/prime` lädt sechs Grunddateien und sonst nichts. Alles darüber hinaus wird nur geladen,
wenn eine Aufgabe es benennt. `agentic-marketing pack` baut dieselbe Auswahl außerhalb
einer Sitzung und sagt, was sie kostet — damit das Budget eine Zahl ist und kein Gefühl.

Die acht Skills decken Makroanalyse nach STEP, Mikroanalyse, Wettbewerb, Porters fünf
Kräfte, Bewertungsauswertung, Zielgruppe sowie Entwürfe für LinkedIn und Blog ab. Jeder
schreibt in das Laufformat statt in den Arbeitsbereich, damit alles durch dasselbe Tor
geht.

## Befehle

| Befehl | Was er tut | Braucht |
|---|---|---|
| `new <ordner>` | Arbeitsbereich aus der Vorlage schreiben | nichts |
| `check` | melden, was im Arbeitsbereich fehlt | nichts |
| `verify <lauf>` | jede Zahl in ihrer Quelle nachschlagen | Netz bei Web-Quellen |
| `verify <lauf> --model` | zweite Stufe über das Offene | Zusatz `judge`, `ANTHROPIC_API_KEY` |
| `review <lauf>` | die Seite bauen, auf der entschieden wird | nichts |
| `apply <lauf>` | gepflegte Datei schreiben, Zahlen ausweisen | nichts |
| `apply <lauf> --auto` | nach Prüfurteil entscheiden, für unbeaufsichtigte Läufe | nichts |
| `pack` | Sitzungskontext zusammenstellen und messen | nichts |
| `stale` | melden, welche Punkte wieder fällig sind | Netz |
| `campaign <ordner>` | Kampagne prüfen und an die App übergeben | Supabase |

## Entwurfsentscheidungen

| Entscheidung | Verworfene Alternative | Grund |
|---|---|---|
| Erst Zahlen, dann Modell | Modell prüft alles | Die billige Stufe klärt die meisten Befunde, und man kann zeigen, dass sie recht hat. Ein Modell, das eine sichtbare Zahl bestätigen soll, ist bezahltes Raten. |
| Entscheidungen in einer Datei | Entscheidungen im Browser | Die gepflegte Datei muss aus Lauf und Entscheidungen allein wieder herstellbar sein. Ein Klick, der nur in einer Seite lebt, ist keine Entscheidung, sondern eine Stimmung. |
| Alter statt Verfallsdatum | Datum, nach dem ein Punkt entfällt | Eine Statistik über einen alternden Berufsstand verfällt nicht, ein Hardwarepreis schon. `stale` meldet, was fällig ist, und löscht nichts. |
| Eine Datei je Befund | eine Datei je Analysefeld | Ein Befund, der eine eigene Datei ist, lässt sich entscheiden, verschieben und zurückverfolgen. Beim Herauslesen vieler Befunde aus einem Aufsatz geht die Herkunft verloren. |
| Quellen nach `daten/` herunterladen | die Netzadresse zitieren | Eine Adresse, die heute antwortet, tut es in einem Jahr vielleicht nicht. Eine Prüfung, die in einem Jahr noch läuft, ist mehr wert als ein Link. |
| Arbeitsbereich in Markdown, Datenbank nur für Entscheidungen und Ergebnisse | alles in einer Datenbank | Agenten lesen Dateien. Die Datenbank hält nur, was eine App und Zeitpläne teilen müssen: Freigaben, Termine, Zählungen. |
| Jeder Kanal wird von Hand aus dem Planer gepostet | Veröffentlichungsläufe, die in ein Blog-Repository schreiben | ein Weg für dreizehn Kanäle, kein Veröffentlichungsschlüssel in einem zeitgesteuerten Lauf; mehr in [ARCHITEKTUR.de.md](Dokumentation/ARCHITEKTUR.de.md) |
| Erinnerung in der Datenbank (pg_cron) | Zeitplaner außerhalb der Datenbank | der Termin eines Beitrags liegt schon in der Datenbank |
| Wächter auch in der Datenbank | nur im Client | eine Regel, die nur der Client prüft, umgeht jeder andere Client |

## Voraussetzungen

Python 3.11 oder neuer. Die zweite Prüfstufe braucht
`pip install 'agentic-marketing[judge]'` und `ANTHROPIC_API_KEY`; alles andere läuft ohne
beides. Der Kampagnenbefehl braucht ein Supabase-Projekt und die Schlüssel aus
`.env.example`, die App Node.js 22. Die Migrationen bauen auf `public.is_admin()` des RadarAuditor
und `cockpit.notify_safe()` des RepoCity-Cockpits im selben Projekt auf, dazu auf `pg_cron`.

## Lizenz

MIT.
