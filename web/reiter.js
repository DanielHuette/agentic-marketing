/* Tab bar of the project page. Each tab is a section with its own anchor (#projekt,
 * #organigramm, #benchmarks, #praesentation), so a link can open a tab directly and the
 * browser's back and forward buttons move between tabs. An anchor inside a tab opens that tab.
 * Without JavaScript the sections stand one below the other and the anchors scroll to them. */
"use strict";

(function reiter() {
  const html = document.documentElement;
  const reiter = Array.from(document.querySelectorAll('[role="tab"]'));
  const tafeln = reiter.map((r) => document.getElementById(r.getAttribute("aria-controls")));
  if (!reiter.length || tafeln.some((t) => !t)) return;
  html.classList.add("reiter-aktiv");

  function tafelFuer(hash) {
    const ziel = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!ziel) return null;
    return tafeln.find((t) => t === ziel || t.contains(ziel)) || null;
  }

  function zeigen(tafel, { fokus = false, ziel = null } = {}) {
    const vorher = tafeln.find((t) => !t.hidden);
    tafeln.forEach((t, i) => {
      const an = t === tafel;
      t.hidden = !an;
      reiter[i].setAttribute("aria-selected", String(an));
      reiter[i].tabIndex = an ? 0 : -1;
    });
    tafeln.forEach((t) => html.classList.toggle(`reiter-zeigt-${t.id}`, t === tafel));
    if (vorher !== tafel) {
      tafel.classList.remove("erscheint");
      void tafel.offsetWidth;
      tafel.classList.add("erscheint");
    }
    if (ziel && ziel !== tafel) ziel.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
    if (fokus) tafel.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent("reiter", { detail: tafel.id }));
  }

  function ausAdresse() {
    const tafel = tafelFuer(location.hash) || tafeln[0];
    const ziel = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    zeigen(tafel, { ziel });
  }

  function oeffnen(id, fokus) {
    const tafel = document.getElementById(id);
    if (!tafel) return;
    if (location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
    zeigen(tafel, { fokus });
  }

  reiter.forEach((r, i) => {
    r.addEventListener("click", (e) => { e.preventDefault(); oeffnen(tafeln[i].id, false); });
    r.addEventListener("keydown", (e) => {
      const schritt = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: reiter.length - 1 - i }[e.key];
      if (schritt === undefined) return;
      e.preventDefault();
      const neu = (i + schritt + reiter.length) % reiter.length;
      reiter[neu].focus();
      oeffnen(tafeln[neu].id, false);
    });
  });
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-tab-link]");
    if (!link) return;
    e.preventDefault();
    oeffnen(link.dataset.tabLink, true);
  });
  window.addEventListener("popstate", ausAdresse);
  window.addEventListener("hashchange", ausAdresse);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  ausAdresse();
  // The browser jumps to the anchor of the address after loading; a tab opens at its top.
  window.addEventListener("load", () => requestAnimationFrame(ausAdresse), { once: true });
})();
