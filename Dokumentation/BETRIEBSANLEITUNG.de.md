# Betriebsanleitung

[English version](OPERATING_MANUAL.md)

Diese Anleitung beschreibt den Betrieb: vom geprüften Rechercheergebnis über die Freigabe in der
App und den Planer bis zum Beitrag, der von Hand rausgeht. Wie das System aufgebaut und von Grund
auf eingerichtet wird, steht in [ARCHITEKTUR.de.md](ARCHITEKTUR.de.md).

## Der Ablauf in einem Bild

```
Recherche-Lauf ──verify──▶ Befunde mit Urteil ──apply──▶ gepflegte Datei
                                   │
                    kampagne.yaml + beitraege/*.md
                                   │  agentic-marketing campaign
                                   ▼
              App: Zur Freigabe ──▶ Freigegeben ──▶ „Freigeben & starten“ oder Termin im Planer
                                   │
             stündlich in der Datenbank (pg_cron)
                                   ▼
              RepoCity-Cockpit: „Jetzt posten“ ──▶ von Hand posten ──▶ „Als gepostet markieren“
```

Raus geht nur, was ein Mensch in der App freigegeben und von Hand gepostet hat. Eine Zahl ohne
geprüften Beleg sperrt die Freigabe, in der App und zusätzlich in der Datenbank.

## Adressen

| Was | Adresse |
|---|---|
| App | https://app.agenticmarketing.speedofthespirit.dev |
| Projektseite | https://agenticmarketing.speedofthespirit.dev |
| RepoCity-Cockpit (Meldungen) | https://cockpit.speedofthespirit.dev |
| Quellcode | https://github.com/DanielHuette/agentic-marketing |

## Die App installieren

Die App ist eine installierbare Web-App (Progressive Web App, kurz PWA): Sie läuft im
Browser, lässt sich aber wie ein Programm installieren und startet dann in einem eigenen
Fenster mit eigenem Symbol.

| Gerät | So geht es |
|---|---|
| Windows oder Mac mit Chrome oder Edge | Adresse öffnen, anmelden, dann **Einstellungen → Auf diesem Gerät installieren**. Alternativ das Installationssymbol rechts in der Adresszeile. |
| Android | Adresse in Chrome öffnen, Menü **⋮ → App installieren**. |
| iPhone, iPad | Adresse in Safari öffnen, **Teilen → Zum Home-Bildschirm**. |

Updates kommen von selbst: Nach jedem Push baut Cloudflare die App neu, und die installierte
App lädt die neue Fassung beim nächsten Start.

## Anmelden

Angemeldet wird mit dem Betreiberkonto (E-Mail und Passwort), demselben Konto wie im
RadarAuditor-App. Neue Konten lassen sich nicht anlegen, die Registrierung ist in Supabase
abgeschaltet. Abmelden unter **Einstellungen → Abmelden**.

Es gibt zwei Rollen. Der **Administrator** darf alles: freigeben, bearbeiten, ablehnen, starten,
pausieren und Ergebnisse eintragen. Wer sonst angemeldet ist, darf **nur lesen**: Die App zeigt
oben den Hinweis „Nur Lesen“ und blendet alle Aktionen aus. Die Datenbank verweigert diesen
Konten jede Änderung auch dann, wenn jemand die App umgeht. Wer Administrator ist, steht in der
Tabelle `public.app_admins` (Migration `005_marketing_roles.sql` baut auf `005_roles.sql` des
RadarAuditor auf); einen weiteren Administrator trägt man dort im Supabase-SQL-Editor ein.

## Die Kampagnenübersicht

Die Startseite zeigt jede Kampagne als Karte: Status, wie viele Beiträge auf eine Freigabe
warten, was live ist und was es gebracht hat. Beiträge ohne Kampagne liegen in der stehenden
Kampagne „Laufender Auftritt“.

| Status | Bedeutung | Was du tun kannst |
|---|---|---|
| Startklar | Beiträge liegen vor, nichts ist geplant | prüfen, freigeben, starten |
| Läuft | freigegebene Beiträge haben Termine | weiter freigeben, pausieren, Fälliges posten |
| Pausiert | alle Termine sind aufgehoben | fortsetzen, dann wird neu geplant |
| Abgeschlossen | Laufzeit vorbei, nichts mehr offen | Ergebnisse und Berichte lesen |

## Eine Kampagne prüfen

Oben stehen Ziel und Zielgruppe, darunter die Startfläche, darunter fünf Reiter.

**Beiträge** ist die Tafel mit fünf Spalten:

| Spalte | Inhalt |
|---|---|
| Zur Freigabe | wartet auf deine Entscheidung |
| Freigegeben | hat einen Termin oder bekommt ihn beim Start |
| Jetzt posten | freigegebene Beiträge jedes Kanals, deren Termin erreicht ist |
| Veröffentlicht | gepostet, mit Datum |
| Abgelehnt | mit deiner Begründung zurück |

**Recherche** listet jeden Befund der Kampagne: Aussage, Zahlen, Quelle mit Datum, das Urteil
der Prüfung und den Satz der Quelle, in dem die Zahl steht.

**Ergebnisse** zeigt Impressionen, Klicks und Anfragen gegen die Ziele der Kampagne, je Tag und
je Beitrag, so wie sie unter **Ergebnis eintragen** erfasst wurden.

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
2. Jeder freigegebene Beitrag bekommt seinen Termin: den im Planer gewählten, sonst Starttag plus
   sein Versatz in Tagen zur Uhrzeit der Kampagne, deutsche Zeit. Liegt der Termin schon zurück,
   gilt „sofort“.
3. Beiträge, die noch auf Freigabe warten, bleiben zurück, bis du sie freigibst; dann werden
   sie nach derselben Regel eingeplant.

**Pausieren** hebt alle Termine auf. **Fortsetzen** plant neu, ab dem ursprünglichen Starttag.

## Der Planer

**Planer** zeigt eine Kalenderwoche von Montag bis Sonntag mit jedem Beitrag der echten Kampagnen
an dem Tag, an dem er erscheint: wann er rausging, wann er fällig ist, der im Planer gewählte
Termin oder der Tag, der sich aus einer gestarteten Kampagne ergibt. Unter der Woche listet
**Ohne Termin** die offenen Beiträge, die noch kein Datum haben.

**Neuer Beitrag** (oder **+ Beitrag** an einem Tag) fragt Kanal, Termin, Kampagne, Titel und Text
ab. Kanäle: Blog, LinkedIn, X, XING, Instagram, Facebook, Threads, YouTube, TikTok, Reddit, Forum,
Presse, Newsletter. Die Zahlenprüfung läuft beim Tippen mit: Eine Zahl, die kein Befund belegt,
wird sofort genannt; als Entwurf speichern geht trotzdem, freigeben erst, wenn jede Zahl belegt
ist. **Zur Freigabe geben** schickt den Beitrag in die Prüfung und meldet ihn dem RepoCity-Cockpit.

## Posten

Nichts wird automatisch gepostet, auf keinem Kanal. Ist der Termin eines freigegebenen Beitrags
erreicht, steht er unter **Jetzt posten** und kommt stündlich zur Minute 23 als Meldung ins
RepoCity-Cockpit. Text kopieren, im Firmenkonto des Kanals posten, die Adresse des Beitrags in der
App eintragen und **Als gepostet markieren** drücken. Das Cockpit meldet ihn danach als
veröffentlicht.

## Ergebnisse

| Kennzahl | Woher sie kommt |
|---|---|
| Impressionen, Klicks | von Hand aus der Statistik des Kanals: Beitrag öffnen, **Ergebnis eintragen** |
| Anfragen | von Hand, im Beitrag, der sie ausgelöst hat |

Die Kampagne zeigt sie zusammen gegen ihre Ziele.

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

3. In die App übernehmen:

   ```bash
   uv run agentic-marketing campaign workspaces/radarauditor/kampagnen/<name>
   ```

   Die Ausgabe nennt jeden Beitrag mit Zahlen ohne Beleg. Ein zweiter Lauf aktualisiert Beiträge,
   die noch nicht entschieden sind, und lässt freigegebene und veröffentlichte unberührt.

Die Schlüssel für diese Befehle stehen in `.env` (Vorlage: `.env.example`).

## Die RadarAuditor-Kampagne

„RadarAuditor: Lokale Sichtbarkeit im Münsterland“ stützt sich auf neun Befunde aus Bitkom, ZDH,
Handwerkskammer Münster, Bundesnetzagentur und einer YouGov-Umfrage, jede Zahl gegen die
Live-Quelle geprüft. Sechs Beiträge sind geschrieben (drei Blog, drei LinkedIn) und warten als
Entwürfe, bis das Produkt verkauft werden kann; sie liegen in
`workspaces/radarauditor/kampagnen/sichtbarkeit-muenster/`.

## Automatische Abläufe

| Ablauf | Wann | Was |
|---|---|---|
| `marketing-remind` (pg_cron in der Datenbank) | stündlich, Minute 23 | eine Cockpit-Meldung für jeden freigegebenen Beitrag, dessen Termin erreicht ist |
| CI (GitHub Actions) | bei jedem Push | ruff, mypy, pytest, App-Prüfung, Tests und Build |

## Wenn etwas nicht geht

| Anzeichen | Ursache | Abhilfe |
|---|---|---|
| „Freigabe abgelehnt: Zahlen ohne geprüfte Quelle“ | der Text zeigt eine Zahl, die kein zitierter Befund belegt | Zahl entfernen, anders formulieren oder den passenden Befund zitieren und die Kampagne neu übernehmen |
| Startknopf grau | kein Beitrag freigegeben oder Kampagne nicht startklar | einen Beitrag freigeben |
| keine Meldung „Jetzt posten“ | der Beitrag ist nicht freigegeben oder sein Termin liegt noch vorn | Status und Termin im Planer prüfen |
| „Deine Anmeldung ist abgelaufen“ | Sitzung abgelaufen | neu anmelden |
| App zeigt „Cockpit nicht eingerichtet“ | Build ohne Supabase-Variablen | in Cloudflare Pages die Variablen setzen, neu bauen |

## Wartung

- **Schlüssel:** Die App kennt nur den öffentlichen Supabase-Schlüssel, gesetzt in Cloudflare
  Pages. Der Service-Schlüssel für `agentic-marketing campaign` bleibt in der lokalen `.env`. Wird
  ein Schlüssel erneuert, wird nur sein Wert ersetzt; der Code ändert sich nicht.
