# Betriebsanleitung

[English version](OPERATING_MANUAL.md)

Diese Anleitung beschreibt den Betrieb: vom geprüften Rechercheergebnis über die Freigabe im
Cockpit bis zum veröffentlichten Beitrag und dem Wochenbericht. Wie das System aufgebaut und
von Grund auf eingerichtet wird, steht in [ARCHITEKTUR.de.md](ARCHITEKTUR.de.md).

## Der Ablauf in einem Bild

```
Recherche-Lauf ──verify──▶ Befunde mit Urteil ──apply──▶ gepflegte Datei
                                   │
                    kampagne.yaml + beitraege/*.md
                                   │  agentic-marketing campaign
                                   ▼
                    Cockpit: Zur Freigabe ──▶ Freigegeben ──▶ „Freigeben & starten“
                                   │
         stündlich (GitHub Actions)│                 zum Termin im Cockpit
                                   ▼                          ▼
                    Blogbeitrag im Zielblog          LinkedIn: von Hand posten
                                   │
         täglich 03:17 UTC         ▼
                    Zähler ──▶ Ergebnisse ──▶ montags Wochenbericht
```

Raus geht nur, was ein Mensch im Cockpit freigegeben hat. Eine Zahl ohne geprüften Beleg
sperrt die Freigabe, in der App und zusätzlich in der Datenbank.

## Adressen

| Was | Adresse |
|---|---|
| Cockpit (App) | https://app.agenticmarketing.speedofthespirit.dev |
| Projektseite | https://agenticmarketing.speedofthespirit.dev |
| Beispielblog (fiktiv) | https://agenticmarketing.speedofthespirit.dev/beispiel-blog/ |
| RadarAuditor-Blog | https://radarauditor.speedofthespirit.dev/blog/ |
| Quellcode | https://github.com/DanielHuette/agentic-marketing |
| Zeitpläne und ihre Läufe | https://github.com/DanielHuette/agentic-marketing/actions |

## Die App installieren

Das Cockpit ist eine installierbare Web-App (Progressive Web App, kurz PWA): Sie läuft im
Browser, lässt sich aber wie ein Programm installieren und startet dann in einem eigenen
Fenster mit eigenem Symbol.

| Gerät | So geht es |
|---|---|
| Windows oder Mac mit Chrome oder Edge | Adresse öffnen, anmelden, dann **Einstellungen → Auf diesem Gerät installieren**. Alternativ das Installationssymbol rechts in der Adresszeile. |
| Android | Adresse in Chrome öffnen, Menü **⋮ → App installieren**. |
| iPhone, iPad | Adresse in Safari öffnen, **Teilen → Zum Home-Bildschirm**. |

Updates kommen von selbst: Nach jedem Push baut Cloudflare die App neu, und die installierte
App lädt die neue Fassung beim nächsten Start.

Unter [Releases](https://github.com/DanielHuette/agentic-marketing/releases/latest) liegen
zum Herunterladen das Python-Paket (`.whl`) und die fertig gebaute App als `.zip`, die sich auf
jedem statischen Webserver betreiben lässt.

## Anmelden

Angemeldet wird mit dem Betreiberkonto (E-Mail und Passwort), demselben Konto wie im
RadarAuditor-Cockpit. Neue Konten lassen sich nicht anlegen, die Registrierung ist in Supabase
abgeschaltet. Abmelden unter **Einstellungen → Abmelden**.

Es gibt zwei Rollen. Der **Administrator** darf alles: freigeben, bearbeiten, ablehnen, starten,
pausieren und Ergebnisse eintragen. Wer sonst angemeldet ist, darf **nur lesen**: Die App zeigt
oben den Hinweis „Nur Lesen“ und blendet alle Aktionen aus. Die Datenbank verweigert diesen
Konten jede Änderung auch dann, wenn jemand die App umgeht. Wer Administrator ist, steht in der
Tabelle `public.app_admins` (Migration `005_marketing_roles.sql` baut auf `005_roles.sql` des
RadarAuditor auf); einen weiteren Administrator trägt man dort im Supabase-SQL-Editor ein.

## Die Kampagnenübersicht

Die Startseite zeigt jede Kampagne als Karte: Status, wie viele Beiträge auf eine Freigabe
warten, was live ist und was es gebracht hat. Beispielkampagnen tragen den goldenen Rand und
das Etikett **Beispiel · fiktiv**.

| Status | Bedeutung | Was du tun kannst |
|---|---|---|
| Startklar | Beiträge liegen vor, nichts ist geplant | prüfen, freigeben, starten |
| Läuft | freigegebene Beiträge haben Termine | weiter freigeben, pausieren, LinkedIn posten |
| Pausiert | alle Termine sind aufgehoben | fortsetzen, dann wird neu geplant |
| Abgeschlossen | Laufzeit vorbei, nichts mehr offen | Ergebnisse und Berichte lesen |

## Eine Kampagne prüfen

Oben stehen Ziel und Zielgruppe, darunter die Startfläche, darunter fünf Reiter.

**Beiträge** ist die Tafel mit fünf Spalten:

| Spalte | Inhalt |
|---|---|
| Zur Freigabe | wartet auf deine Entscheidung |
| Freigegeben | hat einen Termin (nach dem Start) oder bekommt ihn beim Start |
| Jetzt posten | LinkedIn-Beiträge, deren Termin erreicht ist |
| Veröffentlicht | live, mit Datum |
| Abgelehnt | mit deiner Begründung zurück |

**Recherche** listet jeden Befund der Kampagne: Aussage, Zahlen, Quelle mit Datum, das Urteil
der Prüfung und den Satz der Quelle, in dem die Zahl steht.

**Ergebnisse** zeigt Aufrufe, Klicks und Anfragen gegen die Ziele der Kampagne, als Verlauf je
Tag und je Beitrag. Simulierte Werte der Beispielkampagne sind als solche gekennzeichnet.

**Berichte** enthält die Wochenberichte, **Verlauf** jede Handlung mit Zeit und Person.

## Einen Beitrag entscheiden

Ein Klick auf eine Karte öffnet den Beitrag. Links steht er so, wie ihn Lesende sehen werden,
rechts die Entscheidung und die Belege: jeder zitierte Befund mit seinen Zahlen, der Quelle
und dem Prüfsatz.

| Knopf | Wirkung |
|---|---|
| Freigeben | Beitrag ist freigegeben. Läuft die Kampagne, bekommt er sofort seinen Termin. Gesperrt, solange eine Zahl ohne Beleg im Text steht. |
| Bearbeiten | Titel, Kurzfassung und Text ändern. Die Zahlenprüfung läuft beim Tippen mit. Speichern legt eine neue Fassung an und schickt den Beitrag zurück in die Prüfung. |
| Ablehnen | verlangt eine Begründung, der Beitrag wandert nach „Abgelehnt“. |
| Zurück in die Prüfung | holt einen abgelehnten Beitrag zurück. |
| Freigabe zurückziehen | nimmt einen freigegebenen, noch nicht veröffentlichten Beitrag aus dem Plan. |

Die Zahlenprüfung kennt jede Schreibweise einer Zahl (`12.480`, `12,480`, `12480`) und lässt
Jahreszahlen sowie Zahlen in Linkadressen durch. Ein Datum wie „1. Januar 2026“ zählt als eine
Zahl, wenn ein Befund es so nennt.

## Freigeben & starten

Sobald mindestens ein Beitrag freigegeben ist, wird **Freigeben & starten** golden. Nach der
Rückfrage „Wirklich starten?“ passiert Folgendes:

1. Die Kampagne wechselt auf **Läuft**, der Starttag wird gespeichert.
2. Jeder freigegebene Beitrag bekommt seinen Termin: Starttag plus sein Versatz in Tagen, zur
   Uhrzeit der Kampagne, deutsche Zeit. Liegt der Termin schon zurück, gilt „sofort“.
3. Beiträge, die noch auf Freigabe warten, bleiben zurück, bis du sie freigibst; dann werden
   sie nach derselben Regel eingeplant.

**Pausieren** hebt alle Termine auf. **Fortsetzen** plant neu, ab dem ursprünglichen Starttag.

## Veröffentlichen

**Blog:** Ein Ablauf auf GitHub prüft jede Stunde um sieben Minuten nach, welche Beiträge fällig
sind, schreibt Beitragsseite, Übersicht, RSS-Feed und Zähler in einem einzigen Commit in das
Zielrepository und markiert die Beiträge als veröffentlicht. Der Push löst das Ausrollen der
Seite aus. Vom Termin bis zur Sichtbarkeit vergehen also bis zu gut einer Stunde.

**LinkedIn:** Es wird nichts automatisch gepostet. Zum Termin erscheint der Beitrag in der
Spalte **Jetzt posten**:

1. Beitrag öffnen, **Text kopieren**.
2. Auf LinkedIn einen Beitrag anlegen, Text einfügen, posten.
3. Die Adresse des LinkedIn-Beitrags kopieren, im Cockpit einfügen, **Als gepostet markieren**.

Der Link im LinkedIn-Text trägt Kampagnenparameter, so dass jeder Klick darüber im Blog gezählt
und dem LinkedIn-Beitrag zugerechnet wird.

## Ergebnisse

| Kennzahl | Woher sie kommt |
|---|---|
| Aufrufe im Blog | Zähler auf jeder Blogseite, täglich zusammengefasst |
| Klicks | Zähler auf der Zielseite des Handlungsaufrufs und auf Seiten, die über einen Kampagnenlink erreicht wurden |
| LinkedIn-Impressionen | von Hand: Beitrag öffnen, **Ergebnis eintragen** |
| Anfragen | von Hand, im Beitrag, der sie ausgelöst hat |

Der Zähler setzt kein Cookie und speichert nichts über die lesende Person: nur Seite,
Tag und die Kampagnenparameter der Adresse. Beispielkampagnen werden nicht gezählt, ihre
Ergebnisse sind simuliert; echte Besuche im Beispielblog fließen nicht hinein.

Montags entsteht für jede laufende oder in der Vorwoche beendete Kampagne ein Wochenbericht:
Ergebnis gegen Ziel, was veröffentlicht wurde, welche Beiträge am meisten gebracht haben, was
offen ist.

## Eine neue Kampagne anlegen

Kampagnen entstehen im Arbeitsbereich, nicht in der App. So bleibt jede Zahl an ihren Lauf und
ihre Quelle gebunden.

1. Recherche-Lauf anlegen (Skill im Arbeitsbereich oder von Hand), dann prüfen und entscheiden:

   ```bash
   export AGENTIC_MARKETING_WORKSPACE=workspaces/radarauditor
   uv run agentic-marketing verify  <lauf>
   uv run agentic-marketing review  <lauf>     # oder: apply <lauf> --auto
   uv run agentic-marketing apply   <lauf>
   ```

2. Kampagnenordner unter `kampagnen/<name>/` anlegen, mit `kampagne.yaml` und je Beitrag einer
   Datei in `beitraege/`. Das Format zeigt `workspaces/radarauditor/kampagnen/sichtbarkeit-muenster/`.
   Jeder Beitrag nennt in `findings:` die Befunde, deren Zahlen er zeigt.

3. Ins Cockpit übernehmen:

   ```bash
   uv run agentic-marketing campaign workspaces/radarauditor/kampagnen/<name>
   ```

   Die Ausgabe nennt jeden Beitrag mit Zahlen ohne Beleg. Ein zweiter Lauf aktualisiert Beiträge,
   die noch nicht entschieden sind, und lässt freigegebene und veröffentlichte unberührt.

Die Schlüssel für diese Befehle stehen in `.env` (Vorlage: `.env.example`).

## Die RadarAuditor-Kampagne starten

Die Kampagne „RadarAuditor: Lokale Sichtbarkeit im Münsterland“ ist vollständig vorbereitet:
neun Befunde aus Bitkom, ZDH, Handwerkskammer Münster, Bundesnetzagentur und einer
YouGov-Umfrage, jede Zahl gegen die Live-Quelle geprüft, sechs Beiträge (drei Blog, drei
LinkedIn), alle vorab freigegeben, der Blog unter radarauditor.speedofthespirit.dev/blog/ steht
leer bereit.

Start: Cockpit öffnen, Kampagne öffnen, **Freigeben & starten**, bestätigen. Danach:

| Tag | Kanal | Beitrag |
|---|---|---|
| 1 | Blog | Die Hälfte fragt erst die KI |
| 3 | LinkedIn | Die Hälfte fragt erst die KI |
| 8 | Blog | Sterne entscheiden mit |
| 10 | LinkedIn | Sterne entscheiden mit |
| 15 | Blog | Geprüft wird online |
| 17 | LinkedIn | Auch Empfehlungen werden online geprüft |

Jeweils 08:30 Uhr, Laufzeit 21 Tage, Ziele: 600 Aufrufe, 40 Klicks, 3 Anfragen. Die
Vorab-Freigaben stehen im Verlauf als „Claude (vorbereitet)“; jede lässt sich vor dem Start
zurückziehen.

## Der fiktive Beispiellauf

Die Kampagne „Nordwind: Stillstand vermeiden, Nachschliff planen“ zeigt einen vollständigen Lauf
einer erfundenen Firma mit erfundenen Quellen. Sie wurde im Cockpit geprüft, ein Beitrag mit
einer unbelegten Zahl wurde korrigiert, einer abgelehnt und überarbeitet, dann gestartet. Den
Lauf selbst hat der Befehl `example-run` mit simulierter Uhr ab dem 21. September 2026
durchgespielt: Er benutzt denselben Veröffentlichungscode wie der Echtbetrieb, nur die Uhr ist
gestellt. Die drei Blogbeiträge sind echt veröffentlicht, die LinkedIn-Beiträge wurden nicht
gepostet, die Ergebnisse sind simuliert und überall so markiert. Der Befehl verweigert jede
Kampagne, die nicht als Beispiel markiert ist.

## Automatische Abläufe

| Ablauf | Wann | Was |
|---|---|---|
| Publish due posts | stündlich, Minute 7 | fällige Blogbeiträge veröffentlichen, Kampagnen nach Laufzeit abschließen |
| Measure and report | täglich 03:17 UTC | Zählerdaten des Vortags zu Ergebnissen; montags Wochenberichte |
| CI | bei jedem Push | ruff, mypy, pytest, App-Prüfung und Build |
| Deploy site (RadarAuditor) | bei jedem Push auf `site/` | Projektseite samt Blog zu Cloudflare Pages |

Alle lassen sich auf GitHub unter **Actions → Ablauf → Run workflow** von Hand starten.

## Wenn etwas nicht geht

| Anzeichen | Ursache | Abhilfe |
|---|---|---|
| „Freigabe abgelehnt: Zahlen ohne geprüfte Quelle“ | der Text zeigt eine Zahl, die kein zitierter Befund belegt | Zahl entfernen, anders formulieren oder den passenden Befund zitieren und neu übernehmen |
| Startknopf grau | kein Beitrag freigegeben oder Kampagne nicht startklar | einen Beitrag freigeben |
| Blogbeitrag nach über einer Stunde nicht sichtbar | Ablauf fehlgeschlagen | GitHub → Actions → „Publish due posts“, Protokoll lesen |
| „Deine Anmeldung ist abgelaufen“ | Sitzung abgelaufen | neu anmelden |
| App zeigt „Cockpit nicht eingerichtet“ | Build ohne Supabase-Variablen | in Cloudflare Pages die Variablen setzen, neu bauen |
| Ergebnisse bleiben bei null | Zähler blockiert oder Tag noch nicht zusammengefasst | Seite neu laden, den nächsten Morgen abwarten oder „Measure and report“ von Hand starten |

## Wartung

- **GitHub** stellt geplante Abläufe in einem Repository ein, das 60 Tage keinen Commit bekommen
  hat. Jede Veröffentlichung ist ein Commit; in ruhigen Zeiten genügt ein beliebiger Commit oder
  ein Klick auf „Enable workflow“.
- **Supabase** pausiert Projekte im kostenlosen Tarif nach einer Woche ohne Zugriff. Der
  stündliche Ablauf greift jede Stunde zu und hält das Projekt wach.
- **Schlüssel** liegen als Secrets im Repository (`AGENTIC_MARKETING_SUPABASE_URL`,
  `…_SERVICE_KEY`, `…_ANON_KEY`, `…_GITHUB_TOKEN`). Wird ein Schlüssel erneuert, wird das Secret
  ersetzt; der Code ändert sich nicht.
