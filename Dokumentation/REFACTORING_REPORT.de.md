# Arbeitsbericht: Vom Recherchewerkzeug zum Marketing-System

[English version](REFACTORING_REPORT.md)

## Ausgangslage

**Context:** Bestand vor der Erweiterung | **Input:** Version 0.1, Projektseite, Präsentation | **Output:** Lücken, die geschlossen werden

| Befund | Änderung | Nachweis |
|---|---|---|
| Das Projekt endete bei der gepflegten Datei; nichts wurde veröffentlicht | Kampagnen, Cockpit, Veröffentlichung, Messung und Bericht ergänzt | `campaign`, `publisher`, `metrics`, `campaign_report`, `app/` |
| Folie 9 der Präsentation zeigte keine echten Werte | Präsentation neu, mit Werten aus dem Cockpit und echten Bildschirmfotos | `web/praesentation/` |
| Kein Ort, an dem ein Mensch freigibt | Cockpit als installierbare Web-App | https://app.agenticmarketing.speedofthespirit.dev |
| Keine echte Anwendung | echte RadarAuditor-Kampagne vorbereitet, fiktive Beispielkampagne komplett durchgelaufen | `workspaces/radarauditor/`, Beispielblog |

## Datenbank

**Context:** Gemeinsamer Zustand von App und Zeitplänen | **Input:** Supabase-Projekt radarauditor | **Output:** Schema `marketing`, vier Migrationen

| Befund | Änderung | Nachweis |
|---|---|---|
| Freigaben, Termine und Zählungen brauchen einen gemeinsamen Ort | Schema `marketing` mit acht Tabellen, Sicht `campaign_overview` | `supabase/migrations/001_marketing.sql` |
| Eine Freigabe mit unbelegter Zahl muss unmöglich sein, auch an der App vorbei | Trigger `schedule_on_approval` verweigert sie | REST-Aufruf mit Service-Schlüssel: `P0001 … figures without a checked source: {35}` |
| Der Dashboard-Schalter für freigegebene Schemata kam nicht beim Server an | `pgrst.db_schemas` an der Rolle gesetzt, Konfiguration neu geladen | `002_hits.sql`; REST-Abfrage antwortet 200 statt `PGRST106` |
| Cloudflare-Schlüssel ohne Leserecht auf Analytics | eigener Zähler ohne Cookies: Tabelle `hits`, Funktion `record_hit` | `002_hits.sql`; anonymer Aufruf 204, anonymes Lesen 401 |
| Freie Zahlen gingen beim Bearbeiten in der App verloren | Spalte `free_figures` | `004_free_figures.sql` |

## Paket

**Context:** Python-Seite: Übergabe, Veröffentlichung, Messung | **Input:** Version 0.1 | **Output:** Version 0.2.0

| Befund | Änderung | Nachweis |
|---|---|---|
| Beiträge brauchen dieselbe Zahlenprüfung wie Befunde | `unbacked_figures` mit Schreibweisen, Jahreszahlen, freien Zahlen, Linkadressen | `tests/test_campaign.py` |
| Datum „1. Januar 2026“ wurde in Einzelziffern zerlegt | Zahlen mit Wörtern werden als Ganzes herausgenommen, in Python und App gleich | Test in beiden Sprachen |
| Seiten, Übersicht und Feed müssen zusammen live gehen | ein Commit über die Git-Datenschnittstelle, neuer Versuch bei bewegtem Zweig | `test_github_writer_retries_when_the_branch_moved` |
| Unter Windows fehlte die Zeitzonendatenbank, jeder Befehl brach beim Import ab | `tzdata` als Abhängigkeit unter Windows | Lauf auf Windows: `campaign` übernimmt beide Kampagnen |
| Beispiel braucht einen ganzen Lauf, ohne drei Wochen zu warten | `example-run` mit simulierter Uhr, derselbe Veröffentlichungscode, nur für Beispielkampagnen | `test_replay_publishes_an_example_on_its_days`, `test_replay_refuses_a_real_campaign` |
| Simulation lief nach Kampagnenende weiter, Summen wuchsen täglich | Simulation endet am letzten Kampagnentag, spätere Zeilen werden entfernt | `test_simulation_stops_at_the_end_of_a_campaign` |
| Echte Besuche im Beispielblog hätten simulierte Werte verfälscht | Zählung nur für echte Kampagnen | `test_fold_hits_leaves_example_campaigns_to_the_simulation` |
| Wochenberichte für längst beendete Kampagnen | Bericht nur für laufende und in der Vorwoche beendete | `test_a_closed_campaign_is_reported_once_more_and_then_not` |

## Cockpit

**Context:** Die Stelle, an der ein Mensch entscheidet | **Input:** RadarAuditor-App als Vorlage | **Output:** Preact-PWA unter app.agenticmarketing

| Befund | Änderung | Nachweis |
|---|---|---|
| Nach dem Speichern einer Bearbeitung blieb „Freigeben“ für die alte Fassung klickbar | Entscheidungsfeld wartet, bis gespeichert ist | Testlauf im Browser |
| Ablehnungsformular blieb nach dem Ablehnen offen und verdeckte „Freigeben“ | Formular schließt nach Erfolg | Testlauf im Browser |
| „Geht 0 Tage nach dem Start“ | „am Starttag“, „einen Tag nach dem Start“ | Testlauf im Browser |
| Zielerreichung über 100 % wurde als 100 % angezeigt | echter Anteil, nur der Balken ist begrenzt | Ergebnisse: „118 % von 1.500“ |
| Tabellen der Wochenberichte erschienen als Rohtext | Markdown mit Tabellen, rohes HTML weiter aus | `markdown.test.ts` |
| Anmeldelink landete auf localhost | App-Adresse als Redirect-URL in Supabase | Anmeldung im Browser |

## Webseiten

**Context:** Zielblogs und Projektseiten | **Input:** agenticmarketing- und radarauditor-Subdomain | **Output:** zwei Blogs, Zähler aktiv

| Befund | Änderung | Nachweis |
|---|---|---|
| Sicherheitsrichtlinie der Seiten blockierte den Zähler | `connect-src` für Supabase ergänzt, beide Seiten | Ressourcenliste im Browser: `record_hit 204` |
| Sicherheitsrichtlinie blockierte die eigenen Schriften der Projektseite | `font-src 'self'` ergänzt | `web/_headers` |
| RadarAuditor-Seite wurde von Hand hochgeladen | Ablauf „Deploy site“ bei jedem Push auf `site/` | GitHub Actions: success |

## Abschlussprüfung

**Context:** Prüfung nach Abschnitt 10 des Standards | **Input:** Stand des Repositorys | **Output:** Ergebnis je Punkt

| Prüfung | Ergebnis |
|---|---|
| `ruff check`, `ruff format --check` | bestanden |
| `mypy src tests` (strict) | bestanden, 43 Dateien |
| `pytest` | bestanden |
| App: `tsc`, `eslint`, `vitest`, `vite build` | bestanden, 26 Tests |
| CI auf GitHub | grün |
| Abläufe „Publish due posts“, „Measure and report“ mit echten Secrets | grün |
| Installation unter Windows aus dem Lockfile | bestanden nach `tzdata`-Korrektur |
| Suche nach Geheimnissen im Repository | nur der öffentliche Supabase-Schlüssel im Zähler, absichtlich |
| Ende-zu-Ende im Browser: anmelden, bearbeiten, Wächter, ablehnen, freigeben, starten, veröffentlichen, messen, berichten | bestanden |
