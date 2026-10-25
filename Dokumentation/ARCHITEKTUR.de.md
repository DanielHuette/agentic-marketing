# Architektur und Einrichtung

[English version](ARCHITECTURE.md)

## Bausteine

```
┌──────────────── Arbeitsbereich (Dateien, Git) ────────────────┐
│ Recherche-Läufe → verify → decisions.json → gepflegte Dateien │
│ kampagnen/<name>/kampagne.yaml, beitraege/*.md                │
└───────────────────────────────┬───────────────────────────────┘
                                │ agentic-marketing campaign (Zahlenwächter)
                                ▼
┌──────────────── Supabase, Schema marketing ───────────────────┐
│ campaigns · findings · posts · post_findings · events         │
│ metrics · reports · Sicht plan                                │
│ Trigger: Freigabe gesperrt bei Zahl ohne Beleg, Termine,      │
│          Meldungen ans Cockpit                                │
│ Funktionen: start_campaign, pause_campaign, remind_due        │
│ pg_cron: remind_due stündlich zur Minute 23                   │
└───────┬───────────────────────────────┬───────────────────────┘
        │ angemeldeter Betreiber        │ cockpit.notify_safe
        ▼                               ▼
┌── App (PWA) ──────────────┐   ┌── RepoCity-Cockpit ───────────────┐
│ Preact, Vite, Cloudflare  │   │ „Beitrag zur Freigabe“            │
│ Kampagnen, Planer,        │   │ „Jetzt posten“                    │
│ freigeben, starten        │   │ „Veröffentlicht“                  │
└─────────────┬─────────────┘   └───────────────────────────────────┘
              │ Text kopieren, im Firmenkonto posten
              ▼
   Blog, LinkedIn, X, XING, Instagram, Facebook, Threads, YouTube,
   TikTok, Reddit, Forum, Presse, Newsletter → „Als gepostet markieren“
```

Keine Maschine veröffentlicht. Die Datenbank entscheidet, wann ein Beitrag fällig ist; der Mensch
postet ihn von Hand und markiert ihn als gepostet.

## Module des Pakets

| Modul | Aufgabe |
|---|---|
| `verify`, `sources` | jede Zahl in der genannten Quelle nachschlagen, über Schreibweisen hinweg; jede Quelle als Abzug mit Prüfsumme ablegen |
| `judge` | zweiter Prüfschritt über einen erzwungenen Werkzeugaufruf, der die tragende Textstelle zitieren muss |
| `review`, `compact` | Entscheidungsseite bauen, gepflegte Datei allein aus Lauf und Entscheidungen schreiben |
| `pack`, `freshness` | Sitzungskontext messen, wieder fällige Punkte melden |
| `campaign` | Kampagnenordner lesen, Befunde der Läufe mit Urteil und Entscheidung sammeln, Zahlenwächter, Übergabe an die Datenbank |
| `cockpit` | schmaler Client für die REST-Schnittstelle des Schemas `marketing`, mit Zeitlimit und Wiederholung bei vorübergehenden Fehlern |

## Datenmodell

| Tabelle oder Sicht | Inhalt | Schlüssel |
|---|---|---|
| `campaigns` | Ziel, Zielgruppe, Laufzeit, Uhrzeit, Kennzahlenziele, Status, Start und Ende | `slug` |
| `findings` | Befunde der Kampagne mit Zahlen, Quelle, Urteil, zitiertem Satz | `(campaign_id, key)` |
| `posts` | Kanal, Text, Versatz, im Planer gewählter Termin, Status, Zahlen ohne Beleg, freie Zahlen, Termin, Fassung | `(campaign_id, channel, slug)` |
| `post_findings` | welche Befunde ein Beitrag zitiert | `(post_id, finding_id)` |
| `events` | Verlauf: wer hat wann was getan | |
| `metrics` | Impressionen, Klicks, Anfragen je Beitrag und Tag, mit Herkunft | `(post_id, day, source)` |
| `reports` | Wochenberichte | `(campaign_id, period_end)` |
| `plan` (Sicht) | jeder Beitrag der echten Kampagnen mit dem Zeitpunkt, an dem er im Kalender steht | |
| `hits` | Rohzählung des früheren Blogzählers; wird nicht mehr befüllt | |

Kanäle: Blog, LinkedIn, X, XING, Instagram, Facebook, Threads, YouTube, TikTok, Reddit, Forum,
Presse, Newsletter. Beiträge ohne Kampagne liegen in der stehenden Kampagne `laufend`. Jeder
Schreibvorgang ist wiederholbar: die Übernahme schreibt über eindeutige Schlüssel und erzeugt bei
einem zweiten Lauf keine Dubletten.

## Sicherheit

| Regel | Umsetzung |
|---|---|
| Nur der Administrator entscheidet | Row Level Security: jeder Angemeldete liest, nur `public.is_admin()` schreibt; Starten und Pausieren verweigern andere Konten; Registrierung abgeschaltet |
| Keine Zahl ohne Beleg | Wächter beim Übernehmen, beim Tippen in der App und im Datenbank-Trigger, der die Freigabe auch mit Service-Schlüssel verweigert |
| Service-Schlüssel nie im Browser | nur in der lokalen `.env` des Betreibers |
| Kein automatisches Posten | jeder Kanal wird von Hand aus dem Firmenkonto gepostet und in der App markiert |
| Eine gescheiterte Meldung blockiert keinen Beitrag | das Cockpit wird über `cockpit.notify_safe` gerufen, das jeden Fehler in eine Warnung verwandelt |

## Entwurfsentscheidungen

| Entscheidung | Verworfene Alternative | Grund |
|---|---|---|
| Jeder Kanal wird von Hand aus dem Planer gepostet | Veröffentlichungsläufe, die in ein Blog-Repository schreiben | ein Weg für dreizehn Kanäle statt eines Sonderwegs für den Blog; kein Veröffentlichungsschlüssel in einem zeitgesteuerten Lauf |
| Erinnerung in der Datenbank (pg_cron) | Zeitplaner außerhalb der Datenbank | der Termin eines Beitrags liegt schon in der Datenbank; die Erinnerung läuft dort, wo die Daten sind |
| Meldungen über das Cockpit | E-Mail je Beitrag | Freigaben und fällige Beiträge landen dort, wo auch die anderen RepoCity-Apps melden |
| Im Planer gewählter Termin geht vor dem Versatz | nur Starttag plus Versatz | tägliche Beiträge außerhalb einer Kampagne brauchen einen eigenen Termin |
| Wächter auch in der Datenbank | nur in Python und App | eine Regel, die nur der Client prüft, umgeht jeder andere Client |
| Marketing-Tabellen im gemeinsamen Supabase-Projekt | eigenes Supabase-Projekt | der kostenlose Tarif erlaubt zwei Projekte; das eigene Schema trennt die Daten |

## Einrichtung von Grund auf

1. **Supabase:** In einem Projekt, das schon `public.is_admin()` (RadarAuditor `005_roles.sql`)
   und `cockpit.notify_safe()` (RepoCity-Cockpit) enthält und in dem die Erweiterung `pg_cron`
   eingeschaltet ist, im SQL-Editor `supabase/migrations/001_marketing.sql` bis `006_planer.sql`
   der Reihe nach ausführen. Unter Authentication die Registrierung abschalten, ein Betreiberkonto
   anlegen und unter **URL Configuration** die Adresse der App als Redirect-URL eintragen
   (`https://app.agenticmarketing.speedofthespirit.dev/**`).
2. **App:** Cloudflare-Pages-Projekt mit diesem Repository verbinden, Stammordner `app`,
   Build `npm ci && npm run build`, Ausgabe `dist`, Variablen `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=22`, eigene Domain
   `app.agenticmarketing.speedofthespirit.dev`.
3. **Projektseite:** zweites Cloudflare-Pages-Projekt auf demselben Repository, ohne Build-Befehl,
   Ausgabeordner `web`, eigene Domain `agenticmarketing.speedofthespirit.dev`.
4. **PC des Betreibers:** `.env` nach `.env.example` mit `AGENTIC_MARKETING_WORKSPACE`,
   `AGENTIC_MARKETING_SUPABASE_URL` und `AGENTIC_MARKETING_SUPABASE_SERVICE_KEY` für
   `agentic-marketing campaign`.

## Lokal entwickeln

```bash
uv sync
uv run ruff check && uv run ruff format --check && uv run mypy src tests && uv run pytest

cd app
npm ci
cp .env.example .env.local     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
npm run check && npm test
```
