/* Draws the measurements and the example run from the JSON files next to the page.
 * Context: every figure comes from benchmark/results.json and benchmark/cases.yaml (exported to
 * data/benchmark.json) and from the example run in tests/fixtures/workspace (data/example.json).
 * | Input: data/benchmark.json, data/example.json | Output: hero figures, the pass comparison,
 * the cases by kind, the full case list, the findings of the example run, the size bars. */
"use strict";

(function messungen() {
  const TEXT = {
    de: {
      pass: { figure: "Zahlenabgleich", model: "mit Sprachmodell" },
      rows: {
        correct: "wie erwartet eingestuft", flagged: "unbelegte Aussagen erkannt",
        missed: "unbelegte Aussagen übersehen", alarm: "belegte Aussagen zu Unrecht markiert",
      },
      of: (a, b) => `${a} von ${b}`,
      kinds: {
        truthful: "wie veröffentlicht", variant: "andere Schreibweise", fabricated: "eine Ziffer geändert",
        mixed: "echt und erfunden gemischt", semantic: "Zahl richtig, Aussage umgedreht", unreachable: "Adresse antwortet nicht",
      },
      cases: (n) => (n === 1 ? "1 Fall" : `${n} Fälle`),
      semanticNote: "Hier trennen sich die Schritte: Nur das Sprachmodell sieht, dass die Aussage umgedreht ist.",
      verdicts: { supported: "belegt", partial: "teilweise", unsupported: "nicht belegt", unreachable: "nicht erreichbar", "not-checked": "offen" },
      run: (d) => `Lauf vom ${d} gegen die Live-Seiten; Abzüge der Quellen liegen in benchmark/snapshots/.`,
      findings: "Befunde im Lauf", supported: "davon vollständig belegt", kept: "vom Menschen behalten",
      raw: "Rohlauf", curated: "gepflegte Datei", pack: "Kontext, mit dem eine Sitzung startet",
      chars: (n) => `${n} Zeichen`, share: (s) => `${s} % des Rohlaufs`, tokens: (n) => `rund ${n} Tokens`,
      barsLabel: "Länge in Zeichen: Rohlauf, gepflegte Datei, Sitzungskontext",
      keep: "behalten", drop: "verworfen", missing: "nicht in der Quelle", source: "Quelle", evidence: "Beleg",
    },
    en: {
      pass: { figure: "Figure pass", model: "with language model" },
      rows: {
        correct: "classified as expected", flagged: "unbacked statements caught",
        missed: "unbacked statements missed", alarm: "backed statements wrongly flagged",
      },
      of: (a, b) => `${a} of ${b}`,
      kinds: {
        truthful: "as published", variant: "other spelling", fabricated: "one digit changed",
        mixed: "real and invented mixed", semantic: "figure right, statement reversed", unreachable: "address does not answer",
      },
      cases: (n) => (n === 1 ? "1 case" : `${n} cases`),
      semanticNote: "This is where the passes part: only the language model sees that the statement is reversed.",
      verdicts: { supported: "supported", partial: "partial", unsupported: "unsupported", unreachable: "unreachable", "not-checked": "open" },
      run: (d) => `Run of ${d} against the live pages; source snapshots are in benchmark/snapshots/.`,
      findings: "findings in the run", supported: "fully supported", kept: "kept by the person",
      raw: "Raw run", curated: "Curated file", pack: "Context a session starts with",
      chars: (n) => `${n} characters`, share: (s) => `${s} % of the raw run`, tokens: (n) => `about ${n} tokens`,
      barsLabel: "Length in characters: raw run, curated file, session context",
      keep: "kept", drop: "dropped", missing: "not in the source", source: "Source", evidence: "Evidence",
    },
  };
  const GLYPH = { supported: "✓", partial: "½", unsupported: "✕", unreachable: "–", "not-checked": "?" };
  const KIND_ORDER = ["truthful", "variant", "fabricated", "mixed", "semantic", "unreachable"];
  let bench = null;
  let example = null;

  const lang = () => (document.documentElement.lang === "en" ? "en" : "de");
  const t = () => TEXT[lang()];
  const fmt = (value, digits = 0) => value.toLocaleString(lang() === "en" ? "en-US" : "de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child !== null && child !== undefined) node.append(child);
    return node;
  }

  function chip(verdict, title) {
    return el("span", { class: `chip chip--${verdict}`, title: title || t().verdicts[verdict], "aria-label": t().verdicts[verdict], text: GLYPH[verdict] || "?" });
  }

  /** The four counts README and RESULTS.md report, computed per pass from the cases. */
  function summary(pass) {
    const cases = bench.cases.map((c) => c[pass]);
    const backed = (v) => v === "supported";
    const unbacked = cases.filter((c) => !backed(c.expected));
    return {
      correct: cases.filter((c) => c.correct).length,
      total: cases.length,
      unbacked: unbacked.length,
      flagged: unbacked.filter((c) => !backed(c.actual)).length,
      missed: unbacked.filter((c) => backed(c.actual)).length,
      alarm: cases.filter((c) => backed(c.expected) && !backed(c.actual)).length,
    };
  }

  function value(text, note, extra = "") {
    return el("span", { class: `wert ${extra}` }, [document.createTextNode(text), note ? el("small", { text: note }) : null]);
  }

  function drawComparison() {
    const f = summary("figure");
    const m = summary("model");
    const head = el("div", { class: "vergleich__kopf", "aria-hidden": "true" }, [el("span"), el("span", { text: t().pass.figure }), el("span", { text: t().pass.model })]);
    const row = (label, a, b) => el("div", { class: "vergleich__zeile", role: "row" }, [el("span", { role: "rowheader", text: label }), a, b]);
    const zero = (n) => (n === 0 ? "wert--null" : "");
    document.getElementById("vergleich").replaceChildren(
      head,
      row(t().rows.correct, value(`${f.correct}/${f.total}`, null, "wert--gold"), value(`${m.correct}/${m.total}`, null, "wert--gold")),
      row(t().rows.flagged, value(t().of(f.flagged, f.unbacked)), value(t().of(m.flagged, m.unbacked))),
      row(t().rows.missed, value(String(f.missed), null, zero(f.missed)), value(String(m.missed), null, zero(m.missed))),
      row(t().rows.alarm, value(String(f.alarm), null, zero(f.alarm)), value(String(m.alarm), null, zero(m.alarm))),
    );
    for (const node of document.querySelectorAll('[data-kpi="model"]')) node.textContent = `${m.correct}/${m.total}`;
    for (const node of document.querySelectorAll('[data-kpi="missed"]')) node.textContent = String(m.missed);
  }

  function drawKinds() {
    const items = KIND_ORDER.map((kind) => {
      const cases = bench.cases.filter((c) => c.kind === kind);
      if (!cases.length) return null;
      const strip = (pass) => el("div", { class: "art__reihe" }, [
        el("span", { text: t().pass[pass] }),
        el("span", { class: "art__chips" }, cases.map((c) => chip(c[pass].actual, `${t().verdicts[c[pass].actual]}: ${c.statement}`))),
      ]);
      const split = cases.some((c) => c.figure.actual !== c.model.actual);
      return el("li", { class: `art${split ? " art--hervor" : ""}` }, [
        el("span", { class: "art__name" }, [document.createTextNode(t().kinds[kind]), el("small", { text: t().cases(cases.length) })]),
        el("div", { class: "art__reihen" }, [strip("figure"), strip("model")]),
        split ? el("p", { class: "art__notiz", text: t().semanticNote }) : null,
      ]);
    });
    document.getElementById("arten").replaceChildren(...items.filter(Boolean));
  }

  function drawCases() {
    const items = bench.cases.map((c) => {
      const source = bench.sources[c.source];
      return el("li", { class: "fall" }, [
        el("p", { class: "fall__satz", text: c.statement }),
        el("div", { class: "fall__urteile" }, [
          el("span", { text: t().kinds[c.kind] }),
          el("span", {}, [document.createTextNode(`${t().pass.figure}:`), chip(c.figure.actual)]),
          el("span", {}, [document.createTextNode(`${t().pass.model}:`), chip(c.model.actual)]),
          el("a", { class: "fall__quelle", href: source.url, rel: "noopener", text: source.title }),
        ]),
      ]);
    });
    document.getElementById("faelle").replaceChildren(...items);
    const day = new Date(bench.run_at).toLocaleDateString(lang() === "en" ? "en-GB" : "de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    document.getElementById("laufzeit").textContent = t().run(day);
  }

  function drawExample() {
    const findings = example.findings;
    const report = example.report;
    const items = findings.map((f) => el("li", { class: `befund${f.keep ? "" : " befund--weg"}` }, el("details", {}, [
      el("summary", {}, [
        chip(f.verdict),
        el("span", { class: "titel", text: f.title }),
        el("span", { class: "entscheid", text: (f.keep ? t().keep : t().drop) + (f.missing.length ? ` · ${t().missing}: ${f.missing.join(", ")}` : "") }),
      ]),
      el("div", { class: "befund__mehr" }, [
        el("p", { text: f.detail }),
        f.evidence ? el("p", { class: "befund__beleg", text: `${t().evidence}: ${f.evidence}` }) : null,
        el("p", { class: "befund__beleg", text: `${t().source}: ${f.publisher}, ${f.source_title}` }),
      ]),
    ])));
    document.getElementById("befunde").replaceChildren(...items);

    const tile = (n, label) => el("div", {}, [el("b", { text: String(n) }), el("span", { text: label })]);
    document.getElementById("trichter").replaceChildren(
      tile(findings.length, t().findings),
      tile(findings.filter((f) => f.verdict === "supported").length, t().supported),
      tile(findings.filter((f) => f.keep).length, t().kept),
    );
    const widest = report.raw;
    const bar = (name, chars, note, quiet) => el("div", { class: "balken__zeile" }, [
      el("div", { class: "balken__name" }, [el("span", { text: name }), el("span", {}, [el("b", { text: t().chars(fmt(chars)) }), note ? document.createTextNode(` · ${note}`) : null])]),
      el("div", { class: "balken__spur" }, el("div", { class: `balken__fuell${quiet ? " balken__fuell--leise" : ""}`, style: `--w:${((chars / widest) * 100).toFixed(1)}%` })),
    ]);
    const bars = document.getElementById("balken");
    bars.setAttribute("aria-label", t().barsLabel);
    bars.replaceChildren(
      bar(t().raw, report.raw, null, true),
      bar(t().curated, report.curated, t().share(fmt(report.share, 1))),
      bar(t().pack, report.pack_chars, t().tokens(fmt(report.pack_tokens))),
    );
  }

  function draw() {
    if (bench) { drawComparison(); drawKinds(); drawCases(); }
    if (example) drawExample();
  }

  // Content of a closed <details> still has a layout box in Chromium; hiding the list keeps its
  // links out of reach until the reader opens it.
  const faelle = document.getElementById("faelle");
  const klappe = faelle.closest("details");
  const klappen = () => { faelle.hidden = !klappe.open; };
  klappe.addEventListener("toggle", klappen);
  klappen();

  document.addEventListener("sprache", draw);
  Promise.all([
    fetch("data/benchmark.json").then((r) => r.json()),
    fetch("data/example.json").then((r) => r.json()),
  ]).then(([b, e]) => { bench = b; example = e; draw(); });
})();
