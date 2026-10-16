# Agentic Marketing

[English version](README.md) · [Projektseite](https://agenticmarketing.speedofthespirit.dev) · [Präsentation](https://agenticmarketing.speedofthespirit.dev/praesentation/) · [Cockpit](https://app.agenticmarketing.speedofthespirit.dev) · [Beispielblog](https://agenticmarketing.speedofthespirit.dev/beispiel-blog/) · [Betriebsanleitung](Dokumentation/BETRIEBSANLEITUNG.de.md)

Ein Marketing-Arbeitsbereich für Agententeams — und der Schritt, der in jedem von ihnen
fehlt: Recherche kommt erst in den Arbeitsbereich, nachdem ihre Zahlen gegen die Quellen
geprüft wurden und ein Mensch entschieden hat, was bleibt. Aus den geprüften Befunden werden
Kampagnen, die ein Mensch in einem Cockpit freigibt und startet, die sich nach Plan selbst
veröffentlichen und deren Wirkung gemessen wird.

## Das Problem

Ein Agententeam, das einen Markt recherchiert, produziert viel Text. Die Seminarfassung
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

Läuft gegen den mitgelieferten Beispiel-Arbeitsbereich. Keine Daten, kein Schlüssel, kein
Netz nötig.

```bash
git clone https://github.com/DanielHuette/agentic-marketing
cd agentic-marketing
uv sync                                   # oder: pip install -e .

RUN=src/agentic_marketing/example/strategie/umwelt/makroanalyse/makroanalyse-2026-08-29
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

## Von der Recherche zur Veröffentlichung

Recherche allein ist kein Marketing. Der zweite Teil des Projekts bringt geprüfte Befunde
an die Öffentlichkeit, ohne das Tor dazwischen aufzugeben:

```
kampagnen/<name>/kampagne.yaml      Ziel, Zielgruppe, Ziel-Blog, Laufzeit, Kennzahlenziele
kampagnen/<name>/beitraege/*.md     je Beitrag: Kanal, Versatz in Tagen, zitierte Befunde, Text
        ↓  campaign                 Zahlenwächter, Übergabe ins Cockpit
Cockpit                             prüfen, bearbeiten, freigeben, „Freigeben & starten“
        ↓  publish (stündlich)      Blogbeitrag, Übersicht, Feed: ein Commit ins Zielrepository
        ↓  metrics (täglich)        Zähler ohne Cookies → Aufrufe und Klicks je Beitrag
        ↓  report (montags)         Wochenbericht gegen die Ziele
```

Jede Zahl, die ein Beitrag zeigt, muss eine Zahl eines zitierten, behaltenen und belegten
Befunds sein. Der Wächter prüft das bei der Übergabe, beim Bearbeiten in der App und ein
drittes Mal in der Datenbank: Ein Trigger verweigert die Freigabe, auch wenn jemand die App
umgeht. LinkedIn-Beiträge werden zum Termin im Cockpit angezeigt und von Hand gepostet.

| | Wo |
|---|---|
| Cockpit, installierbar als App | https://app.agenticmarketing.speedofthespirit.dev |
| Beispielblog der fiktiven Kampagne | https://agenticmarketing.speedofthespirit.dev/beispiel-blog/ |
| Blog der echten RadarAuditor-Kampagne | https://radarauditor.speedofthespirit.dev/blog/ |
| Betrieb Schritt für Schritt | [Dokumentation/BETRIEBSANLEITUNG.de.md](Dokumentation/BETRIEBSANLEITUNG.de.md) |
| Aufbau, Datenmodell, Einrichtung | [Dokumentation/ARCHITEKTUR.de.md](Dokumentation/ARCHITEKTUR.de.md) |

**Zwei Kampagnen liegen im Cockpit.** Die echte, „RadarAuditor: Lokale Sichtbarkeit im
Münsterland“, ruht auf neun Befunden von Bitkom, ZDH, Handwerkskammer Münster,
Bundesnetzagentur und einer YouGov-Umfrage; alle Zahlen sind gegen die Live-Quellen geprüft,
sechs Beiträge sind geschrieben und freigegeben, gestartet wird erst, wenn das Produkt verkauft
werden kann. Die fiktive, „Nordwind: Stillstand vermeiden“, ist einmal komplett durchgelaufen:

| Beispiellauf Nordwind (fiktiv, Ergebnisse simuliert) | |
|---|---|
| Beiträge | 3 Blog, 3 LinkedIn, alle veröffentlicht |
| Vom Wächter gestoppt | 1 Beitrag mit einer Zahl ohne Beleg, korrigiert |
| Abgelehnt und überarbeitet | 1 Beitrag mit einer unbelegten Behauptung |
| Aufrufe | 1.774 von 1.500 als Ziel |
| Klicks | 37 von 40 |
| Anfragen | 3 von 4 |
| Wochenberichte | 4 |

Der Lauf wurde mit `example-run` und simulierter Uhr durchgespielt; der Befehl benutzt
denselben Veröffentlichungscode wie der Echtbetrieb und verweigert jede Kampagne, die nicht als
Beispiel markiert ist.

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
| `campaign <ordner>` | Kampagne prüfen und ins Cockpit übergeben | Supabase |
| `publish` | fällige freigegebene Beiträge veröffentlichen | Supabase, GitHub |
| `site <ziel> --out <checkout>` | Übersicht, Feed und Zähler eines Blogs schreiben | Supabase |
| `metrics [--day]` | Zählerdaten eines Tages zu Ergebnissen falten | Supabase |
| `report [--period-end]` | Wochenberichte schreiben | Supabase |
| `example-run <slug> --start` | Beispielkampagne mit simulierter Uhr durchspielen | Supabase, GitHub |

## Entwurfsentscheidungen

| Entscheidung | Verworfene Alternative | Grund |
|---|---|---|
| Erst Zahlen, dann Modell | Modell prüft alles | Die billige Stufe klärt die meisten Befunde, und man kann zeigen, dass sie recht hat. Ein Modell, das eine sichtbare Zahl bestätigen soll, ist bezahltes Raten. |
| Entscheidungen in einer Datei | Entscheidungen im Browser | Die gepflegte Datei muss aus Lauf und Entscheidungen allein wieder herstellbar sein. Ein Klick, der nur in einer Seite lebt, ist keine Entscheidung, sondern eine Stimmung. |
| Alter statt Verfallsdatum | Datum, nach dem ein Punkt entfällt | Eine Statistik über einen alternden Berufsstand verfällt nicht, ein Hardwarepreis schon. `stale` meldet, was fällig ist, und löscht nichts. |
| Eine Datei je Befund | eine Datei je Analysefeld | Ein Befund, der eine eigene Datei ist, lässt sich entscheiden, verschieben und zurückverfolgen. Beim Herauslesen vieler Befunde aus einem Aufsatz geht die Herkunft verloren. |
| Quellen nach `daten/` herunterladen | die Netzadresse zitieren | Eine Adresse, die heute antwortet, tut es in einem Jahr vielleicht nicht. Eine Prüfung, die in einem Jahr noch läuft, ist mehr wert als ein Link. |
| Arbeitsbereich in Markdown, Datenbank nur für Entscheidungen und Ergebnisse | alles in einer Datenbank | Agenten lesen Dateien. Die Datenbank hält nur, was eine App und Zeitpläne teilen müssen: Freigaben, Termine, Zählungen. |
| GitHub Actions als Zeitplan | n8n, Zapier, Make | zuverlässig, kostenlos, versioniert; weitere Gründe in [ARCHITEKTUR.de.md](Dokumentation/ARCHITEKTUR.de.md) |
| Wächter auch in der Datenbank | nur im Client | eine Regel, die nur der Client prüft, umgeht jeder andere Client |

## Voraussetzungen

Python 3.11 oder neuer. Die zweite Prüfstufe braucht
`pip install 'agentic-marketing[judge]'` und `ANTHROPIC_API_KEY`; alles andere läuft ohne
beides. Die Kampagnenbefehle brauchen ein Supabase-Projekt und die Schlüssel aus
`.env.example`, die App Node.js 22.

## Lizenz

MIT.
