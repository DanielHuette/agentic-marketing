/* Language switch for the bilingual page: both languages are in the markup, the switch only
 * sets <html lang>. Order: ?lang=, the stored choice, the browser language. Other scripts
 * listen for the "sprache" event to redraw text they generate. */
"use strict";

(function sprache() {
  const html = document.documentElement;

  function setzen(code, merken) {
    const lang = code === "en" ? "en" : "de";
    html.lang = lang;
    for (const knopf of document.querySelectorAll(".sprache button")) {
      knopf.setAttribute("aria-pressed", String(knopf.dataset.lang === lang));
    }
    for (const bild of document.querySelectorAll("img[data-alt-en]")) {
      if (bild.dataset.altDe === undefined) bild.dataset.altDe = bild.alt;
      bild.alt = lang === "en" ? bild.dataset.altEn : bild.dataset.altDe;
    }
    if (merken) {
      try { localStorage.setItem("lang", lang); } catch (fehler) { /* storage unavailable: the choice holds for this visit */ }
    }
    document.dispatchEvent(new CustomEvent("sprache", { detail: lang }));
  }

  let gespeichert = null;
  try { gespeichert = localStorage.getItem("lang"); } catch (fehler) { /* storage unavailable */ }
  const gewuenscht = new URLSearchParams(location.search).get("lang") || gespeichert || (navigator.language || "de").slice(0, 2);
  for (const knopf of document.querySelectorAll(".sprache button")) {
    knopf.addEventListener("click", () => setzen(knopf.dataset.lang, true));
  }
  setzen(gewuenscht, false);
})();
