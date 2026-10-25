/* Runs blocking in the head before the first paint and sets the classes, so nothing flashes:
 * "bewegt" = motion allowed; "fx" = also WebGL 2 for the 3D pit. Reduced motion and the data
 * saver keep the painted background. */
(function () {
  var html = document.documentElement;
  var ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sparen = navigator.connection && navigator.connection.saveData;
  if (ruhig) return;
  html.classList.add("bewegt");
  if (sparen) return;
  try {
    var probe = document.createElement("canvas").getContext("webgl2");
    if (!probe) return;
    var verlust = probe.getExtension("WEBGL_lose_context");
    if (verlust) verlust.loseContext();
  } catch (e) { return; }
  html.classList.add("fx");
})();
