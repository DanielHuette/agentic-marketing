/* Renders the live benchmark and the example run from the JSON files next to the page.
 * Context: every figure on the page comes from benchmark/results.json, benchmark/cases.yaml
 * and the bundled example run, exported into data/. | Input: data/benchmark.json,
 * data/example.json | Output: KPI tiles, the case table, the finding cards. */
"use strict";

const TEXT = {
  de: {
    figurePass: "Fälle richtig eingestuft, Zahlenabgleich", modelPass: "Fälle richtig eingestuft, mit Modell",
    missed: "unbelegte Befunde übersehen", falseAlarm: "belegte Befunde zu Unrecht markiert",
    statement: "Aussage", kindH: "Veränderung", figureH: "Zahlenabgleich", modelH: "Modell", quote: "Zitat des Modells",
    kinds: {truthful: "wie veröffentlicht", variant: "andere Schreibweise", fabricated: "eine Ziffer geändert",
      mixed: "echt und erfunden", semantic: "Zahl richtig, Aussage umgedreht", unreachable: "Adresse antwortet nicht"},
    verdicts: {supported: "belegt", partial: "teilweise", unsupported: "nicht belegt", unreachable: "nicht erreichbar", not_checked: "offen"},
    expected: "erwartet",
    findings: "Befunde", kept: "behalten", share: "Anteil der gepflegten Datei am Lauf", tokens: "Tokens Sitzungskontext",
    evidence: "Beleg aus der Quelle", missing: "nicht gefunden", keep: "Behalten", drop: "Verworfen", source: "Quelle",
  },
  en: {
    figurePass: "cases classified correctly, figure pass", modelPass: "cases classified correctly, with model",
    missed: "unbacked findings missed", falseAlarm: "backed findings wrongly flagged",
    statement: "Statement", kindH: "Alteration", figureH: "Figure pass", modelH: "Model", quote: "Model's quote",
    kinds: {truthful: "as published", variant: "other spelling", fabricated: "one digit changed",
      mixed: "real and invented", semantic: "figure right, statement reversed", unreachable: "address does not answer"},
    verdicts: {supported: "supported", partial: "partial", unsupported: "unsupported", unreachable: "unreachable", not_checked: "open"},
    expected: "expected",
    findings: "findings", kept: "kept", share: "curated file as share of the run", tokens: "tokens of session context",
    evidence: "Evidence from the source", missing: "not found", keep: "Kept", drop: "Dropped", source: "Source",
  },
};

let lang = "de";
let bench = null;
let example = null;

function t(key) { return TEXT[lang][key]; }

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

function number(value, digits = 0) {
  return value.toLocaleString(lang === "de" ? "de-DE" : "en-US",
    {minimumFractionDigits: digits, maximumFractionDigits: digits});
}

function badge(verdict) {
  return el("span", {class: `badge v-${verdict}`, text: t("verdicts")[verdict] || verdict});
}

function tile(value, label) {
  return el("div", {class: "kpi"}, [el("b", {text: value}), el("span", {text: label})]);
}

function drawBenchmark() {
  const cases = bench.cases;
  const backed = (verdict) => verdict === "supported";
  const missed = cases.filter((c) => !backed(c.model.expected) && backed(c.model.actual)).length;
  const wrong = cases.filter((c) => backed(c.model.expected) && !backed(c.model.actual)).length;
  document.getElementById("kpis").replaceChildren(
    tile(`${cases.filter((c) => c.figure.correct).length}/${cases.length}`, t("figurePass")),
    tile(`${cases.filter((c) => c.model.correct).length}/${cases.length}`, t("modelPass")),
    tile(String(missed), t("missed")),
    tile(String(wrong), t("falseAlarm")),
  );
  const head = el("thead", {}, el("tr", {}, [t("statement"), t("kindH"), t("figureH"), t("modelH")].map((h) => el("th", {text: h}))));
  const rows = cases.map((c) => {
    const source = bench.sources[c.source];
    const quote = (c.model.quote || "").replace(/\s+/g, " ").trim();
    const statement = el("td", {class: "stmt"}, [
      document.createTextNode(c.statement),
      el("div", {class: "kind"}, [el("a", {href: source.url, rel: "noopener", text: source.title})]),
      quote && c.kind !== "unreachable"
        ? el("details", {}, [el("summary", {text: t("quote")}), el("p", {text: quote.slice(0, 320) + (quote.length > 320 ? " …" : "")})])
        : null,
    ]);
    return el("tr", {class: c.kind === "semantic" ? "semantic" : ""}, [
      statement,
      el("td", {class: "kind", text: t("kinds")[c.kind]}),
      el("td", {}, badge(c.figure.actual)),
      el("td", {}, badge(c.model.actual)),
    ]);
  });
  document.getElementById("cases").replaceChildren(head, el("tbody", {}, rows));
}

function drawExample() {
  const findings = example.findings;
  const report = example.report;
  document.getElementById("example-kpis").replaceChildren(
    tile(String(findings.length), t("findings")),
    tile(`${findings.filter((f) => f.keep).length}`, t("kept")),
    tile(`${number(report.share, 1)} %`, t("share")),
    tile(number(report.pack_tokens), t("tokens")),
  );
  const cards = findings.map((f) => el("article", {class: "finding" + (f.keep ? "" : " dropped")}, [
    el("div", {}, [badge(f.verdict), ...f.missing.map((m) => el("span", {class: "badge v-unsupported", style: "margin-left:.4rem", text: `${t("missing")}: ${m}`}))]),
    el("h3", {text: f.title}),
    el("p", {text: f.detail}),
    f.evidence ? el("p", {class: "evidence"}, [el("strong", {text: `${t("evidence")}: `}), document.createTextNode(f.evidence)]) : null,
    el("p", {class: "kind", text: `${t("source")}: ${f.publisher}, ${f.source_title}`}),
    el("p", {class: "decision " + (f.keep ? "keep" : "drop"), text: (f.keep ? t("keep") : t("drop")) + (f.note ? ` — ${f.note}` : "")}),
  ]));
  document.getElementById("findings").replaceChildren(...cards);
}

function draw() {
  if (bench) drawBenchmark();
  if (example) drawExample();
}

function setLanguage(code) {
  lang = code === "en" ? "en" : "de";
  document.documentElement.lang = lang;
  for (const button of document.querySelectorAll(".lang button")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  }
  try { localStorage.setItem("lang", lang); } catch (error) { /* storage unavailable */ }
  draw();
}

async function main() {
  let stored = null;
  try { stored = localStorage.getItem("lang"); } catch (error) { /* storage unavailable */ }
  const preferred = new URLSearchParams(location.search).get("lang") || stored
    || (navigator.language || "de").slice(0, 2);
  for (const button of document.querySelectorAll(".lang button")) {
    button.addEventListener("click", () => setLanguage(button.dataset.lang));
  }
  setLanguage(preferred);
  [bench, example] = await Promise.all([
    fetch("data/benchmark.json").then((r) => r.json()),
    fetch("data/example.json").then((r) => r.json()),
  ]);
  draw();
}

main();
