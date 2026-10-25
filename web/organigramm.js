/* Organigram: a pulse travels down the spine from station to station and lights each one up,
 * so the path of the figure reads as a flow. Runs only while the tab is open and the diagram is
 * on screen; with reduced motion every station is shown as reached and nothing moves. */
"use strict";

(function organigramm() {
  const org = document.querySelector("[data-org]");
  if (!org) return;
  const stationen = Array.from(org.querySelectorAll(".station"));
  const puls = org.querySelector(".org__puls");
  const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAKT = 2200;
  for (const liste of org.querySelectorAll(".org__stationen")) {
    Array.from(liste.children).forEach((s, i) => s.classList.add(i % 2 === 0 ? "links" : "rechts"));
  }

  if (ruhig) {
    stationen.forEach((s) => s.classList.add("war-dran"));
    return;
  }
  org.classList.add("org-laeuft");
  let index = -1;
  let uhr = null;
  let sichtbar = false;

  function setzen(neu) {
    if (neu === 0) stationen.forEach((s) => s.classList.remove("war-dran"));
    stationen.forEach((s, i) => s.classList.toggle("ist-dran", i === neu));
    for (let i = 0; i <= neu; i++) stationen[i].classList.add("war-dran");
    const nr = stationen[neu].querySelector(".station__nr");
    const y = nr.getBoundingClientRect().top + nr.offsetHeight / 2 - org.getBoundingClientRect().top - 6;
    puls.style.setProperty("--puls-y", `${y.toFixed(0)}px`);
    index = neu;
  }

  function weiter() { setzen((index + 1) % stationen.length); }

  function steuern() {
    const laufen = sichtbar && !document.getElementById("organigramm").hidden && !document.hidden;
    if (laufen && uhr === null) { weiter(); uhr = window.setInterval(weiter, TAKT); }
    if (!laufen && uhr !== null) { window.clearInterval(uhr); uhr = null; }
  }

  new IntersectionObserver((eintraege) => { sichtbar = eintraege[0].isIntersecting; steuern(); }).observe(org);
  document.addEventListener("reiter", steuern);
  document.addEventListener("visibilitychange", steuern);
  window.addEventListener("resize", () => { if (index >= 0) setzen(index); });
  stationen.forEach((s, i) => s.addEventListener("pointerenter", () => { if (uhr !== null) setzen(i); }));
})();
