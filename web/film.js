/* Presentation as a self-running film: scenes play one after another with their own motion,
 * chapters jump to a scene, the button pauses and resumes. It starts when its tab opens and,
 * once the last scene has played out, opens the project tab; with reduced motion it waits for
 * the viewer, shows each scene without movement and never switches tabs by itself. */
"use strict";

(function film() {
  const wurzel = document.querySelector("[data-film]");
  if (!wurzel) return;
  const buehne = wurzel.querySelector(".film__buehne");
  const szenen = Array.from(wurzel.querySelectorAll(".szene"));
  const liste = wurzel.querySelector("[data-kapitelliste]");
  const knopf = wurzel.querySelector("[data-spielen]");
  const knopfText = wurzel.querySelector("[data-spielen-text]");
  const ansage = wurzel.querySelector("[data-ansage]");
  const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DAUER = 5600;
  const DAUER_ENDE = 9000;
  const lang = () => (document.documentElement.lang === "en" ? "en" : "de");
  const name = (szene) => szene.dataset.kapitel.split("|")[lang() === "en" ? 1 : 0];

  let index = 0;
  let laeuft = !ruhig;
  let start = 0;
  let verstrichen = 0;
  let rahmen = null;

  const knoepfe = szenen.map((szene, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.addEventListener("click", () => { zeigen(i); verstrichen = 0; start = performance.now(); });
    const li = document.createElement("li");
    li.append(b);
    liste.append(li);
    return b;
  });

  function beschriften() {
    knoepfe.forEach((b, i) => { b.textContent = name(szenen[i]); });
    const de = laeuft ? "Pause" : "Abspielen";
    const en = laeuft ? "Pause" : "Play";
    knopfText.textContent = lang() === "en" ? en : de;
    knopf.setAttribute("aria-label", knopfText.textContent);
  }

  function zeigen(neu) {
    szenen.forEach((s, i) => {
      const an = i === neu;
      s.classList.toggle("ist-aktiv", an);
      s.setAttribute("aria-hidden", String(!an));
    });
    knoepfe.forEach((b, i) => b.setAttribute("aria-current", String(i === neu)));
    const leiste = liste.getBoundingClientRect();
    const aktiv = knoepfe[neu].getBoundingClientRect();
    if (aktiv.left < leiste.left || aktiv.right > leiste.right) liste.scrollBy({ left: aktiv.left - leiste.left - 8, behavior: ruhig ? "auto" : "smooth" });
    index = neu;
    const text = szenen[neu].querySelector(`.szene__text .${lang()}`) || szenen[neu].querySelector(".abspann__name");
    ansage.textContent = `${name(szenen[neu])}: ${text ? text.textContent : ""}`;
  }

  const dauer = () => (index === szenen.length - 1 ? DAUER_ENDE : DAUER);

  function bild(jetzt) {
    rahmen = null;
    if (!laeuft) return;
    const anteil = Math.min(1, (verstrichen + jetzt - start) / dauer());
    buehne.style.setProperty("--fortschritt", ((index + anteil) / szenen.length).toFixed(4));
    if (anteil >= 1) {
      const ende = index === szenen.length - 1;
      zeigen((index + 1) % szenen.length);
      verstrichen = 0;
      start = jetzt;
      if (ende && !ruhig) { zumProjekt(); return; }
    }
    rahmen = requestAnimationFrame(bild);
  }

  // A film that has played to the end hands over to the project tab, through the tab itself so
  // address, history and tab bar follow; the film waits on its first scene for the next visit.
  function zumProjekt() {
    const reiter = document.querySelector('[role="tab"][aria-controls="projekt"]');
    if (reiter) reiter.click();
    else rahmen = requestAnimationFrame(bild);
  }

  function sichtbar() { return !document.getElementById("praesentation").hidden && !document.hidden; }

  function steuern() {
    if (laeuft && sichtbar() && rahmen === null) { start = performance.now(); rahmen = requestAnimationFrame(bild); }
    if ((!laeuft || !sichtbar()) && rahmen !== null) { cancelAnimationFrame(rahmen); rahmen = null; verstrichen += performance.now() - start; }
  }

  knopf.addEventListener("click", () => {
    laeuft = !laeuft;
    knopf.setAttribute("aria-pressed", String(laeuft));
    beschriften();
    steuern();
  });
  buehne.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") zeigen((index + 1) % szenen.length);
    if (e.key === "ArrowLeft") zeigen((index - 1 + szenen.length) % szenen.length);
  });
  buehne.tabIndex = 0;
  knopf.setAttribute("aria-pressed", String(laeuft));
  document.addEventListener("reiter", (e) => { if (e.detail === "praesentation") { zeigen(index); } steuern(); });
  document.addEventListener("visibilitychange", steuern);
  document.addEventListener("sprache", () => { beschriften(); zeigen(index); });
  beschriften();
  zeigen(0);
  steuern();
})();
