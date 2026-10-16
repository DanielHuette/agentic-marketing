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
│ metrics · reports · hits                                      │
│ Trigger: Freigabe gesperrt bei Zahl ohne Beleg, Termine       │
│ Funktionen: start_campaign, pause_campaign, record_hit        │
└───────┬───────────────────────────────┬───────────────────────┘
        │ angemeldeter Betreiber        │ Service-Schlüssel
        ▼                               ▼
┌── Cockpit (PWA) ──────────┐   ┌── GitHub Actions ─────────────────┐
│ Preact, Vite, Cloudflare  │   │ stündlich: publish                │
│ prüfen, freigeben,        │   │ täglich: metrics, montags report  │
│ starten, eintragen        │   └──────────────┬────────────────────┘
└───────────────────────────┘                  │ ein Commit je Lauf
                                               ▼
                          ┌── Zielrepositories ──────────────────────┐
                          │ RepoCity-RadarAuditor: site/blog/        │
                          │ agentic-marketing: web/beispiel-blog/    │
                          │ Push → Cloudflare Pages                  │
                          └──────────────┬───────────────────────────┘
                                         │ zaehler.js, öffentlicher Schlüssel
                                         ▼
                                  record_hit → hits
```

## Module des Pakets

| Modul | Aufgabe |
|---|---|
| `campaign` | Kampagnenordner lesen, Befunde der Läufe mit Urteil und Entscheidung sammeln, Zahlenwächter, Übergabe ins Cockpit |
| `cockpit` | schmaler Client für die REST-Schnittstelle des Schemas `marketing`, mit Zeitlimit und Wiederholung bei vorübergehenden Fehlern |
| `blog` | Ziele lesen, Beitragsseite, Übersicht, Feed und Zählerskript rendern |
| `github` | mehrere Dateien in einem Commit über die Git-Datenschnittstelle schreiben, bei bewegtem Zweig neu ansetzen |
| `publisher` | fällige Blogbeiträge veröffentlichen, fällige LinkedIn-Beiträge melden, abgelaufene Kampagnen schließen |
| `metrics` | Zählerdaten eines Tages zu Ergebnissen je Beitrag falten; Simulation für Beispielkampagnen |
| `campaign_report` | Wochenbericht gegen die Ziele schreiben |
| `example_run` | Beispielkampagne mit simulierter Uhr durchspielen, verweigert echte Kampagnen |

Die Recherchemodule (`verify`, `judge`, `review`, `compact`, `pack`, `freshness`) sind
unverändert; die Kampagne setzt auf ihren Ergebnissen auf.

## Datenmodell

| Tabelle | Inhalt | Schlüssel |
|---|---|---|
| `campaigns` | Ziel, Zielgruppe, Ziel-Blog, Laufzeit, Uhrzeit, Kennzahlenziele, Status, Start und Ende | `slug` |
| `findings` | Befunde der Kampagne mit Zahlen, Quelle, Urteil, Prüfsatz | `(campaign_id, key)` |
| `posts` | Kanal, Text, Versatz, Status, Zahlen ohne Beleg, freie Zahlen, Termin, Fassung | `(campaign_id, channel, slug)` |
| `post_findings` | welche Befunde ein Beitrag zitiert | `(post_id, finding_id)` |
| `events` | Verlauf: wer hat wann was getan | |
| `metrics` | Aufrufe, Klicks, Anfragen je Beitrag und Tag, mit Herkunft | `(post_id, day, source)` |
| `reports` | Wochenberichte | `(campaign_id, period_end)` |
| `hits` | Rohzählung: Tag, Host, Pfad, Kampagnenparameter | |

Herkunft eines Ergebnisses: `counter` (gezählt), `manual` (eingetragen), `simulated` (Beispiel).

Jeder Schreibvorgang ist wiederholbar: Übernahme, Zusammenfassung und Bericht schreiben über
eindeutige Schlüssel und erzeugen bei einem zweiten Lauf keine Dubletten.

## Sicherheit

| Regel | Umsetzung |
|---|---|
| Nur der Betreiber entscheidet | Row Level Security: angemeldete Nutzer dürfen alles, anonyme nichts; Registrierung abgeschaltet |
| Keine Zahl ohne Beleg | Wächter beim Übernehmen, beim Bearbeiten in der App und im Datenbank-Trigger, der die Freigabe auch mit Service-Schlüssel verweigert |
| Service-Schlüssel nie im Browser | nur als GitHub-Secret und in der lokalen `.env` |
| Öffentlicher Schlüssel kann nur zählen | anonyme Rolle hat Ausführungsrecht auf `record_hit` und sonst nichts; die Funktion prüft Host und Feldlängen |
| Kein automatisches Posten auf LinkedIn | LinkedIn-Beiträge werden von Hand gepostet und markiert |
| Beispiel trifft nie Echtes | `example_run` verweigert Kampagnen ohne Beispielkennzeichen und veröffentlicht nur für die eine Kampagne |

## Entwurfsentscheidungen

| Entscheidung | Verworfene Alternative | Grund |
|---|---|---|
| GitHub Actions als Zeitplan | n8n auf Hugging Face, Zapier, Make | läuft zuverlässig und kostenlos, ist versioniert und prüfbar; der n8n-Space schläft nach 48 Stunden ein, Zapier und Make kosten je Ausführung und liegen außerhalb des Repositorys |
| Veröffentlichung als Commit | Schreiben über eine Hosting-Schnittstelle | jede Veröffentlichung ist nachvollziehbar und umkehrbar, die Seite bleibt statisch |
| Zähler ohne Cookies in Supabase | Cloudflare-Analytics | der vorhandene Cloudflare-Schlüssel hat keine Leserechte für Analytics; der eigene Zähler braucht keinen weiteren Schlüssel, keine Einwilligung und zählt Klicks je Beitrag |
| LinkedIn von Hand | LinkedIn-Schnittstelle | das Posten im Namen einer Person braucht eine geprüfte LinkedIn-App; der Aufwand steht in keinem Verhältnis zu drei Beiträgen im Monat |
| Wächter auch in der Datenbank | nur in Python und App | eine Regel, die nur der Client prüft, umgeht jeder andere Client |
| Termine aus Starttag und Versatz | feste Daten je Beitrag | eine Kampagne kann Wochen vorher fertig sein, ohne dass beim Start ein Datum angepasst wird |
| Simulierte Uhr für das Beispiel | Beispiel drei Wochen echt laufen lassen | ein vollständiger Lauf ist sofort sichtbar und benutzt denselben Code wie der Echtbetrieb |
| Marketing-Tabellen im RadarAuditor-Projekt | eigenes Supabase-Projekt | der kostenlose Tarif erlaubt zwei Projekte; das eigene Schema trennt die Daten |

## Einrichtung von Grund auf

1. **Supabase:** Projekt anlegen (oder bestehendes nutzen), im SQL-Editor
   `supabase/migrations/001_marketing.sql` bis `004_free_figures.sql` der Reihe nach ausführen.
   Unter Authentication die Registrierung abschalten, ein Betreiberkonto anlegen und unter
   **URL Configuration** die Adresse der App als Redirect-URL eintragen
   (`https://app.agenticmarketing.speedofthespirit.dev/**`).
2. **Ziele:** `config/targets.yaml` anpassen, je Ziel ein Vorlagenordner unter
   `config/templates/<name>/` mit `post.html` und `index.html`. Im Zielrepository liegt die
   statische `blog.css`; Übersicht, Feed und `zaehler.js` schreibt
   `agentic-marketing site <ziel> --out <checkout>`.
3. **GitHub-Secrets** im Repository `agentic-marketing`:
   `AGENTIC_MARKETING_SUPABASE_URL`, `AGENTIC_MARKETING_SUPABASE_SERVICE_KEY`,
   `AGENTIC_MARKETING_SUPABASE_ANON_KEY`, `AGENTIC_MARKETING_GITHUB_TOKEN` (Schreibrecht auf die
   Zielrepositories). Im Zielrepository, das selbst ausrollt, `CLOUDFLARE_API_TOKEN` und
   `CLOUDFLARE_ACCOUNT_ID`.
4. **App:** Cloudflare-Pages-Projekt mit diesem Repository verbinden, Stammordner `app`,
   Build `npm ci && npm run build`, Ausgabe `dist`, Variablen `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=22`. Eigene Domain eintragen.
5. **Prüfen:** Ablauf „Publish due posts“ und „Measure and report“ von Hand starten; beide
   müssen grün durchlaufen.

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
