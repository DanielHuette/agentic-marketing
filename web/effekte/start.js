// Starts the 3D pit behind the hero once the page has loaded and the browser is idle, so the
// text of the first view never waits for it. Renders only while the project tab is open and the
// hero is on screen. vorab.js sets "fx" before the first paint when WebGL 2 is there and motion
// is allowed; without it the hero keeps its painted background.
const html = document.documentElement;
const rahmen = document.querySelector("[data-grube]");

function spaeter(arbeit) {
  const los = () => ("requestIdleCallback" in window ? requestIdleCallback(arbeit, { timeout: 1500 }) : setTimeout(arbeit, 300));
  if (document.readyState === "complete") los();
  else window.addEventListener("load", los, { once: true });
}

if (html.classList.contains("fx") && rahmen) {
  spaeter(() => {
    import("./grube.js").then(({ grube }) => starten(grube(rahmen))).catch((fehler) => {
      console.warn("3D scene not started:", fehler);
      html.classList.remove("fx");
    });
  });
}

function starten(szene) {
  szene.oeffnen(1.2);
  const held = rahmen.closest(".held");
  const maus = { x: 0, y: 0 };
  const ziel = { x: 0, y: 0 };
  let sichtbar = true;
  new IntersectionObserver((e) => { sichtbar = e[0].isIntersecting; }).observe(held);
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    ziel.x = (e.clientX / window.innerWidth) * 2 - 1;
    ziel.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let zuletzt = performance.now();
  function bild(jetzt) {
    requestAnimationFrame(bild);
    const dt = Math.min(0.05, (jetzt - zuletzt) / 1000);
    zuletzt = jetzt;
    if (!sichtbar || !html.classList.contains("fx") || document.getElementById("projekt").hidden) return;
    maus.x += (ziel.x - maus.x) * Math.min(1, dt * 3);
    maus.y += (ziel.y - maus.y) * Math.min(1, dt * 3);
    // The camera rests looking down into the pit, so the far edge of the ground stays out of view;
    // scrolling past the hero lets it sink a little deeper. The frame never shrinks.
    const fortschritt = 0.24 + Math.min(1, window.scrollY / Math.max(1, held.offsetHeight)) * 0.3;
    szene.takt({ zeit: jetzt / 1000, dt, scrollY: window.scrollY, geschwindigkeit: 0, maus, fortschritt });
  }
  requestAnimationFrame(bild);
}
