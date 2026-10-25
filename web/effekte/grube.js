// Kopfszene nach dem Prinzip von 25residences.com: eine runde Terrassengrube im nächtlichen Gelände,
// unten eine leuchtende goldene Stadt (RepoCity). Beim Scrollen taucht die Kamera hinab, danach
// schrumpft der Rahmen zur runden Karte. Eine eigene Leinwand im Kopfbereich, gerendert nur solange sichtbar.
import * as THREE from "../vendor/three.module.min.js";

const GOLD = new THREE.Color("#c9a96e");
const NEBEL = new THREE.Color("#0b1a33");

// ---------- Hilfen ----------
const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const glatt = (a, b, x) => { const t = klemm((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ausEase = (t) => 1 - Math.pow(1 - t, 3);

// Pseudozufall mit Saat, damit die Stadt bei jedem Laden gleich aussieht
function zufall(saat) {
  let s = saat >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Chaikin-Glättung: rundet die Stufenkanten des Profils, Endpunkte bleiben fest
function chaikin(punkte, runden) {
  let p = punkte;
  for (let r = 0; r < runden; r++) {
    const neu = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b] = [p[i], p[i + 1]];
      neu.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    neu.push(p[p.length - 1]);
    p = neu;
  }
  return p;
}

function leuchtTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const v = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  v.addColorStop(0, "rgba(255,255,255,1)");
  v.addColorStop(0.25, "rgba(255,255,255,0.45)");
  v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Shader ----------
// Stadt: Fenster als Raster auf den Seitenflächen; jedes Fenster per Hash an oder aus.
const stadtVertex = /* glsl */ `
  varying vec3 vWelt;
  varying vec3 vNormale;
  varying vec3 vLokal;
  varying float vId;
  void main() {
    vec3 groesse = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vLokal = position * groesse;
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWelt = w.xyz;
    vNormale = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vId = float(gl_InstanceID);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const stadtFragment = /* glsl */ `
  uniform float uZeit;
  uniform vec3 uNebel;
  uniform float uDichte;
  varying vec3 vWelt;
  varying vec3 vNormale;
  varying vec3 vLokal;
  varying float vId;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 n = normalize(vNormale);
    float seite = 1.0 - step(0.5, abs(n.y));
    float u = abs(n.x) > 0.5 ? vLokal.z : vLokal.x;
    float v = vLokal.y;
    vec2 zelle = vec2(u * 10.0, v * 12.0);
    vec2 f = fract(zelle);
    vec2 id = floor(zelle);
    float fenster = step(0.2, f.x) * step(f.x, 0.8) * step(0.22, f.y) * step(f.y, 0.72);
    float h = hash(id + vec2(vId * 7.13, n.x * 3.1 + n.z * 1.7));
    float an = step(0.42, h);
    float flackern = 0.82 + 0.18 * sin(uZeit * 0.6 + h * 40.0);
    vec3 warm = mix(vec3(1.0, 0.58, 0.18), vec3(1.0, 0.84, 0.52), fract(h * 13.0));
    float hoehe = clamp(vWelt.y + 8.0, 0.0, 4.0) / 4.0;
    vec3 basis = mix(vec3(0.010, 0.016, 0.036), vec3(0.03, 0.05, 0.1), hoehe);
    float licht = 0.4 + 0.6 * max(dot(n, normalize(vec3(-0.4, 0.85, 0.3))), 0.0);
    vec3 farbe = basis * licht;
    farbe += seite * fenster * an * warm * flackern * (0.8 + 0.9 * h);
    farbe += step(0.5, n.y) * vec3(0.06, 0.04, 0.015);
    farbe += seite * vec3(0.5, 0.3, 0.1) * exp(-(vWelt.y + 8.0) * 2.5) * 0.12;
    float d = length(vWelt - cameraPosition);
    float nebel = 1.0 - exp(-d * d * uDichte * uDichte);
    gl_FragColor = vec4(mix(farbe, uNebel, nebel), 1.0);
  }
`;

// Funken: goldene Punkte steigen aus der Stadt auf, wie Zahlen, die geprüft nach oben gehen
const funkenVertex = /* glsl */ `
  attribute vec4 aSaat;
  uniform float uZeit;
  uniform float uPixel;
  varying float vAlpha;
  void main() {
    float t = fract(uZeit * (0.03 + aSaat.w * 0.05) + aSaat.z);
    float r = sqrt(aSaat.x) * 4.4 * (1.0 - t * 0.25);
    float a = aSaat.y * 6.2831853 + t * 1.2;
    vec3 p = vec3(cos(a) * r, -7.8 + t * 16.0, sin(a) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.4 + aSaat.z * 2.6) * uPixel * (24.0 / max(1.0, -mv.z));
    vAlpha = sin(t * 3.14159) * (0.5 + 0.5 * aSaat.w);
  }
`;
const funkenFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float k = smoothstep(0.5, 0.0, length(q));
    gl_FragColor = vec4(vec3(1.0, 0.72, 0.32) * k * vAlpha * 2.2, 1.0);
  }
`;

const sterneVertex = /* glsl */ `
  attribute float aSaat;
  uniform float uZeit;
  uniform float uPixel;
  varying float vHell;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.8 + aSaat * 1.8) * uPixel;
    vHell = (0.35 + 0.65 * aSaat) * (0.75 + 0.25 * sin(uZeit * (0.6 + aSaat * 2.0) + aSaat * 50.0));
  }
`;
const sterneFragment = /* glsl */ `
  varying float vHell;
  void main() {
    float k = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(vec3(0.85, 0.88, 1.0) * k * vHell, 1.0);
  }
`;

const himmelVertex = /* glsl */ `
  varying vec3 vRichtung;
  void main() {
    vRichtung = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const himmelFragment = /* glsl */ `
  uniform vec3 uHorizont;
  uniform vec3 uZenit;
  varying vec3 vRichtung;
  void main() {
    float h = vRichtung.y;
    vec3 f = mix(uHorizont, uZenit, smoothstep(-0.05, 0.6, h));
    f += vec3(0.10, 0.07, 0.03) * exp(-abs(h) * 16.0);
    gl_FragColor = vec4(f, 1.0);
  }
`;

// ---------- Nachbearbeitung: Leuchten, Tonwerte, Farbsaum, Korn ----------
const vollbildVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const helligkeitFragment = /* glsl */ `
  uniform sampler2D tBild;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tBild, vUv).rgb;
    float l = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c * smoothstep(0.7, 2.0, l), 1.0);
  }
`;
// Gauß-Weichzeichner mit 9 Abgriffen über lineare Filterung; uRichtung = (1/Breite, 0) oder (0, 1/Höhe)
const weichFragment = /* glsl */ `
  uniform sampler2D tBild;
  uniform vec2 uRichtung;
  varying vec2 vUv;
  void main() {
    vec3 s = texture2D(tBild, vUv).rgb * 0.2270270270;
    s += texture2D(tBild, vUv + uRichtung * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(tBild, vUv - uRichtung * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(tBild, vUv + uRichtung * 3.2307692308).rgb * 0.0702702703;
    s += texture2D(tBild, vUv - uRichtung * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(s, 1.0);
  }
`;
const endFragment = /* glsl */ `
  uniform sampler2D tBild;
  uniform sampler2D tLeuchten;
  uniform float uZeit;
  uniform float uAberration;
  uniform float uKorn;
  uniform float uLeuchten;
  varying vec2 vUv;
  float rauschen(uvec2 p, uint t) {
    uint h = p.x * 1664525u + p.y * 1013904223u + t * 2654435761u;
    h = (h ^ (h >> 16u)) * 2246822519u;
    h = (h ^ (h >> 13u)) * 3266489917u;
    h = h ^ (h >> 16u);
    return float(h) / 4294967295.0;
  }
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  void main() {
    vec2 d = vUv - 0.5;
    float r2 = dot(d, d);
    vec2 v = d * r2 * uAberration;
    vec3 c = vec3(texture2D(tBild, vUv + v).r, texture2D(tBild, vUv).g, texture2D(tBild, vUv - v).b);
    c += texture2D(tLeuchten, vUv).rgb * uLeuchten;
    c = aces(c * 1.15);
    c *= 1.0 - r2 * 0.9;
    float k = (rauschen(uvec2(gl_FragCoord.xy), uint(mod(uZeit * 24.0, 1024.0))) - 0.5) * uKorn;
    gl_FragColor = linearToOutputTexel(vec4(c + k, 1.0));
  }
`;

export function grube(rahmen) {
  const leinwand = document.createElement("canvas");
  leinwand.setAttribute("aria-hidden", "true");
  rahmen.appendChild(leinwand);

  const renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(NEBEL, 1);
  renderer.autoClear = true;
  const schmal = window.matchMedia("(max-width: 760px)").matches;
  let pixel = Math.min(window.devicePixelRatio || 1, schmal ? 1.5 : 1.75);
  renderer.setPixelRatio(pixel);

  const verloren = { ja: false };
  leinwand.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    verloren.ja = true;
    document.documentElement.classList.remove("fx");
    leinwand.remove();
  });

  // ---------- Szene ----------
  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2(NEBEL, 0.024);
  const kamera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

  // Himmel als Innenseite einer Kugel
  const himmel = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: himmelVertex, fragmentShader: himmelFragment, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uHorizont: { value: NEBEL.clone() }, uZenit: { value: new THREE.Color("#02040b") } }
    })
  );
  himmel.renderOrder = -2;
  szene.add(himmel);

  // Sterne auf der oberen Halbkugel
  let sterneMaterial;
  {
    const z = zufall(7);
    const anzahl = 700;
    const pos = new Float32Array(anzahl * 3);
    const saat = new Float32Array(anzahl);
    for (let i = 0; i < anzahl; i++) {
      const a = z() * Math.PI * 2;
      const h = 0.04 + Math.pow(z(), 0.7) * 0.96;
      const r = Math.sqrt(1 - h * h);
      pos.set([Math.cos(a) * r * 170, h * 170, Math.sin(a) * r * 170], i * 3);
      saat[i] = z();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSaat", new THREE.BufferAttribute(saat, 1));
    sterneMaterial = new THREE.ShaderMaterial({
      vertexShader: sterneVertex, fragmentShader: sterneFragment, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, uniforms: { uZeit: { value: 0 }, uPixel: { value: pixel } }
    });
    const sterne = new THREE.Points(g, sterneMaterial);
    sterne.renderOrder = -1;
    szene.add(sterne);
  }

  // Gelände mit Terrassengrube: ein Drehkörper aus einem gerundeten Stufenprofil (Radius, Höhe)
  const BODEN = -8;
  const profil = chaikin([
    [0, BODEN], [5.2, BODEN], [5.5, -6.3], [6.9, -6.3], [7.2, -4.3], [8.7, -4.3], [9.0, -2.2], [10.3, -2.2], [10.6, 0], [26, 0], [140, 0]
  ], 3).map(([r, y]) => new THREE.Vector2(r, y));
  const gelaende = new THREE.Mesh(
    new THREE.LatheGeometry(profil, 160),
    new THREE.MeshStandardMaterial({ color: "#1a2e5e", roughness: 0.86, metalness: 0.0, side: THREE.DoubleSide })
  );
  szene.add(gelaende);

  // Goldene Kanten an jeder Stufe: die Prüfstufen, durch die eine Zahl hinab muss
  const kantenMaterial = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const [r, y] of [[5.47, -6.27], [7.17, -4.27], [8.97, -2.17], [10.6, 0.02]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 220), kantenMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    szene.add(ring);
  }
  // Feine Kreise auf dem Gelände, wie die Radarringe der RepoCity-Marke
  const kreisMaterial = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const r of [13.5, 17.5, 23, 31]) {
    const k = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.035, 240), kreisMaterial);
    k.rotation.x = -Math.PI / 2;
    k.position.y = 0.01;
    szene.add(k);
  }

  // Die Stadt: eine Instanz-Zeichnung für alle Häuser
  const stadtMaterial = new THREE.ShaderMaterial({
    vertexShader: stadtVertex, fragmentShader: stadtFragment,
    uniforms: { uZeit: { value: 0 }, uNebel: { value: NEBEL }, uDichte: { value: 0.024 } }
  });
  {
    const z = zufall(25);
    const kiste = new THREE.BoxGeometry(1, 1, 1);
    kiste.translate(0, 0.5, 0);
    const haeuser = [];
    const abstand = 0.46;
    for (let gx = -11; gx <= 11; gx++) {
      for (let gz = -11; gz <= 11; gz++) {
        const x = gx * abstand + (z() - 0.5) * 0.12;
        const zz = gz * abstand + (z() - 0.5) * 0.12;
        const r = Math.hypot(x, zz);
        if (r > 4.7 || z() < 0.12) continue;
        const kern = Math.exp(-Math.pow(r / 1.9, 2));
        const hoehe = 0.18 + kern * (0.8 + z() * 3.4) + z() * 0.45 * (1 - r / 5);
        const breite = 0.26 + z() * 0.12;
        haeuser.push({ x, z: zz, hoehe, breite, tiefe: 0.26 + z() * 0.12, dreh: (z() < 0.2 ? 0.2 : 0) });
      }
    }
    const stadt = new THREE.InstancedMesh(kiste, stadtMaterial, haeuser.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    haeuser.forEach((h, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.dreh);
      m.compose(new THREE.Vector3(h.x, BODEN, h.z), q, new THREE.Vector3(h.breite, h.hoehe, h.tiefe));
      stadt.setMatrixAt(i, m);
    });
    stadt.frustumCulled = false;
    szene.add(stadt);
  }

  // Leuchten: Schein über der Stadt, Glühen am Grubenboden, Lichtquelle für die Wände
  const leucht = leuchtTextur();
  const schein = new THREE.Sprite(new THREE.SpriteMaterial({ map: leucht, color: "#ffb653", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
  schein.scale.set(16, 10, 1);
  schein.position.set(0, -6.2, 0);
  szene.add(schein);
  const bodenGlut = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({ map: leucht, color: "#c98a33", transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  bodenGlut.rotation.x = -Math.PI / 2;
  bodenGlut.position.y = BODEN + 0.02;
  szene.add(bodenGlut);

  const stadtLicht = new THREE.PointLight("#ffb45e", 150, 0, 2);
  stadtLicht.position.set(0, -2.2, 0);
  szene.add(stadtLicht);
  const mond = new THREE.DirectionalLight("#9db3ff", 0.55);
  mond.position.set(-12, 20, 8);
  szene.add(mond);
  szene.add(new THREE.HemisphereLight("#35589e", "#070a14", 0.9));

  // Hängeleuchten vorn links, wie die Pendel im Vorbild: Goldring mit leuchtender Perle
  const lampen = new THREE.Group();
  {
    const ringMaterial = new THREE.MeshStandardMaterial({ color: "#c9a96e", metalness: 0.7, roughness: 0.32, emissive: "#3a2808", emissiveIntensity: 0.6 });
    const perleMaterial = new THREE.MeshStandardMaterial({ color: "#f3ead6", emissive: "#ffcf86", emissiveIntensity: 0.9, roughness: 0.4 });
    const seilMaterial = new THREE.LineBasicMaterial({ color: "#8a6a32", transparent: true, opacity: 0.7 });
    for (const [x, y, zz, s] of [[4.2, 2.9, 14.2, 0.72], [3.3, 2.2, 15.4, 0.58], [5.0, 1.8, 16.0, 0.5]]) {
      const lampe = new THREE.Group();
      lampe.position.set(x, y, zz);
      lampe.scale.setScalar(s);
      lampe.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 8, 64), ringMaterial));
      const perle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), perleMaterial);
      perle.position.y = -0.12;
      lampe.add(perle);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: leucht, color: "#ffc677", transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.set(1.8, 1.8, 1);
      halo.position.y = -0.12;
      lampe.add(halo);
      const seil = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0, 14, 0)]);
      lampe.add(new THREE.Line(seil, seilMaterial));
      lampe.userData.phase = x * 1.7;
      lampen.add(lampe);
    }
    const lampenLicht = new THREE.PointLight("#ffc677", 6, 0, 2);
    lampenLicht.position.set(3.4, 2.4, 15.2);
    lampen.add(lampenLicht);
  }
  szene.add(lampen);

  // Funken
  const funkenMaterial = new THREE.ShaderMaterial({
    vertexShader: funkenVertex, fragmentShader: funkenFragment, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: { uZeit: { value: 0 }, uPixel: { value: pixel } }
  });
  {
    const z = zufall(11);
    const anzahl = 420;
    const saat = new Float32Array(anzahl * 4);
    for (let i = 0; i < anzahl * 4; i++) saat[i] = z();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(anzahl * 3), 3));
    g.setAttribute("aSaat", new THREE.BufferAttribute(saat, 4));
    const funken = new THREE.Points(g, funkenMaterial);
    funken.frustumCulled = false;
    szene.add(funken);
  }

  // ---------- Kamerafahrt ----------
  // Stützpunkte: Blick übers Gelände → über die Grube → zwischen die Stufen → über die Stadt
  const fahrt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.4, 22),
    new THREE.Vector3(0, 6.4, 13),
    new THREE.Vector3(0.8, 2.6, 8.4),
    new THREE.Vector3(0.2, -1.2, 6.2)
  ], false, "centripetal");
  const blick = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.0, 0),
    new THREE.Vector3(0, -5.6, 0),
    new THREE.Vector3(0, -7.2, 0),
    new THREE.Vector3(0, -7.4, -1.2)
  ], false, "centripetal");

  // ---------- Zwischenbilder für die Nachbearbeitung ----------
  const typ = { type: THREE.HalfFloatType, depthBuffer: true };
  const ziel = new THREE.WebGLRenderTarget(1, 1, { ...typ, samples: 4 });
  const klein = [new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }), new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false })];
  const vollKamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vollSzene = new THREE.Scene();
  const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  vollSzene.add(flaeche);
  const helligkeit = new THREE.ShaderMaterial({ vertexShader: vollbildVertex, fragmentShader: helligkeitFragment, uniforms: { tBild: { value: ziel.texture } }, depthTest: false, depthWrite: false });
  const weich = new THREE.ShaderMaterial({ vertexShader: vollbildVertex, fragmentShader: weichFragment, uniforms: { tBild: { value: null }, uRichtung: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  const ende = new THREE.ShaderMaterial({
    vertexShader: vollbildVertex, fragmentShader: endFragment, depthTest: false, depthWrite: false,
    uniforms: { tBild: { value: ziel.texture }, tLeuchten: { value: klein[0].texture }, uZeit: { value: 0 }, uAberration: { value: 0.01 }, uKorn: { value: 0.03 }, uLeuchten: { value: 0.9 } }
  });
  function durchgang(material, nach) {
    flaeche.material = material;
    renderer.setRenderTarget(nach);
    renderer.render(vollSzene, vollKamera);
  }

  // ---------- Größe ----------
  const g = { b: 1, h: 1 };
  function anpassen() {
    g.b = rahmen.clientWidth || window.innerWidth;
    g.h = rahmen.clientHeight || window.innerHeight;
    renderer.setSize(g.b, g.h, false);
    const pb = Math.round(g.b * pixel), ph = Math.round(g.h * pixel);
    ziel.setSize(pb, ph);
    klein.forEach((k) => k.setSize(Math.max(1, pb >> 2), Math.max(1, ph >> 2)));
    kamera.aspect = g.b / g.h;
    // Hochformat: weiterer Winkel, damit die Grube ganz im Bild bleibt
    kamera.fov = kamera.aspect < 1 ? 62 : 40;
    // On wide screens the text stands on the left, so the pit moves to the right of it.
    if (kamera.aspect > 1.2) kamera.setViewOffset(g.b, g.h, -g.b * 0.2, 0, g.b, g.h);
    else kamera.clearViewOffset();
    kamera.updateProjectionMatrix();
  }
  window.addEventListener("resize", anpassen);
  anpassen();

  // ---------- Rahmen: öffnen beim Laden, schrumpfen am Ende der Fahrt ----------
  const spur = rahmen.closest(".held__spur");
  const buehne = rahmen.closest(".held__buehne");
  const rand = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rand")) || 24;
  const oeffnung = { von: 0, start: -1, dauer: 1 };
  function oeffnen(dauer) {
    oeffnung.start = performance.now();
    oeffnung.dauer = dauer;
  }
  rahmen.style.setProperty("--rt", "34%");
  rahmen.style.setProperty("--rb", "34%");

  // Bildrate beobachten: läuft es zäh, sinkt die Auflösung einmalig auf 1
  let zaeh = 0;

  const v = new THREE.Vector3();
  const b = new THREE.Vector3();
  function takt(zustand) {
    if (verloren.ja) return;
    const H = window.innerHeight;
    // A caller without a scroll track passes the progress of the camera ride itself.
    const gegeben = zustand.fortschritt !== undefined;
    const p = gegeben ? klemm(zustand.fortschritt) : klemm(zustand.scrollY / Math.max(1, spur.offsetHeight - 1.3 * H));
    const sichtbar = gegeben || zustand.scrollY < spur.offsetHeight;
    if (!sichtbar || document.hidden) return;

    // Öffnen: Band von 34 % oben/unten auf volle Höhe
    let auf = 1;
    if (oeffnung.start >= 0) auf = ausEase(klemm((performance.now() - oeffnung.start) / (oeffnung.dauer * 1000)));
    else auf = 0;
    const schrumpf = ausEase(glatt(0.74, 1, p));
    const r = rand();
    const band = (1 - auf) * 0.34 * H;
    rahmen.style.setProperty("--rt", `${(band + schrumpf * r).toFixed(1)}px`);
    rahmen.style.setProperty("--rb", `${(band + schrumpf * (0.3 * H + 16)).toFixed(1)}px`);
    rahmen.style.setProperty("--rx", `${(schrumpf * r).toFixed(1)}px`);
    rahmen.style.setProperty("--rr", `${(schrumpf * 26).toFixed(1)}px`);

    // Schrift weicht der Fahrt
    const weg = glatt(0.0, 0.2, p);
    buehne.style.setProperty("--ho", (1 - weg).toFixed(3));
    buehne.style.setProperty("--hy", `${(-weg * 6).toFixed(2)}vh`);

    // Kamera
    const tauch = glatt(0, 0.76, p);
    const t = 0.5 - 0.5 * Math.cos(Math.PI * tauch);
    fahrt.getPoint(t, v);
    blick.getPoint(t, b);
    const ruhe = 1 - t;
    v.x += zustand.maus.x * 0.9 * ruhe + Math.sin(zustand.zeit * 0.13) * 0.25 * ruhe;
    v.y += -zustand.maus.y * 0.4 * ruhe;
    if (kamera.aspect < 1) { v.z += 3 * ruhe; v.y += 2.2 * ruhe; }
    kamera.position.copy(v);
    kamera.lookAt(b);
    // Der Schein über der Stadt ist ein Billboard: beim Hinabtauchen läge er vor den Dächern
    schein.material.opacity = 0.32 * (1 - glatt(0.35, 0.8, t));

    lampen.children.forEach((l) => { if (l.userData.phase !== undefined) l.rotation.z = Math.sin(zustand.zeit * 0.5 + l.userData.phase) * 0.05; });

    const zeit = zustand.zeit;
    stadtMaterial.uniforms.uZeit.value = zeit;
    funkenMaterial.uniforms.uZeit.value = zeit;
    sterneMaterial.uniforms.uZeit.value = zeit;
    ende.uniforms.uZeit.value = zeit;
    const tempo = Math.min(1, Math.abs(zustand.geschwindigkeit) * 0.7);
    ende.uniforms.uAberration.value = 0.01 + tempo * 0.035;

    // Szene → Zwischenbild → Leuchten (¼ Auflösung, zweimal weich) → Endbild
    renderer.setRenderTarget(ziel);
    renderer.render(szene, kamera);
    durchgang(helligkeit, klein[0]);
    weich.uniforms.tBild.value = klein[0].texture;
    weich.uniforms.uRichtung.value.set(1.6 / klein[0].width, 0);
    durchgang(weich, klein[1]);
    weich.uniforms.tBild.value = klein[1].texture;
    weich.uniforms.uRichtung.value.set(0, 1.6 / klein[0].height);
    durchgang(weich, klein[0]);
    durchgang(ende, null);

    if (zustand.dt > 1 / 32) zaeh++; else zaeh = Math.max(0, zaeh - 1);
    if (zaeh > 90 && pixel > 1) { pixel = 1; renderer.setPixelRatio(1); sterneMaterial.uniforms.uPixel.value = 1; funkenMaterial.uniforms.uPixel.value = 1; anpassen(); zaeh = 0; }
  }

  return { takt, oeffnen };
}
