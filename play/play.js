// Race the champion: the player drives a kart on the road of a real SuperTuxKart track (cornfield_crossing, exported by
// scripts/evolve/play_export.py into track.js) against a replay of the frozen champion's recorded lap.
// The player's kart uses the game kart's limits: top speed 25 m/s, the acceleration measured in the recorded lap and the
// full-lock turning radius by speed (dualbrain.timetrial.TURN_RADIUS); no drift, no nitro, slow off the road.
import * as THREE from 'three';

const P = window.PLAY;
// The engine is left-handed, three.js right-handed: mirror x (scenery/ is exported mirrored too); the lateral offset flips.
if (!P.mirrored) {
  for (const q of P.quads) for (const v of q) v[0] = -v[0];
  for (const c of P.centre) c[0] = -c[0];
  for (const g of P.ghost) g[2] = -g[2];
  P.mirrored = true;
}
const C = P.centre, N = C.length, L = P.length, G = P.ghost, LAP = P.lap_s;
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- track geometry ---------------- */
const sOf = k => (k < N ? C[k][3] : L);
const node = k => C[((k % N) + N) % N];
function segAt(s) {                       // index k with C[k].s <= s < C[k+1].s
  s = ((s % L) + L) % L; let lo = 0, hi = N - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (C[m][3] <= s) lo = m; else hi = m - 1; }
  return lo;
}
function tangent(k) {
  const a = node(k), b = node(k + 1); const dx = b[0] - a[0], dz = b[2] - a[2], n = Math.hypot(dx, dz) || 1;
  return [dx / n, dz / n];
}
function frameAt(s) {                     // centre point, height, width and a smoothed tangent at arc length s
  const k = segAt(s), a = node(k), b = node(k + 1), s0 = sOf(k), s1 = sOf(k + 1);
  const t = clamp((((s % L) + L) % L - s0) / Math.max(s1 - s0, 1e-6), 0, 1);
  const t0 = tangent(k - 1), t1 = tangent(k), t2 = tangent(k + 1);
  let tx = t < .5 ? lerp(t0[0], t1[0], t + .5) : lerp(t1[0], t2[0], t - .5);
  let tz = t < .5 ? lerp(t0[1], t1[1], t + .5) : lerp(t1[1], t2[1], t - .5);
  const n = Math.hypot(tx, tz) || 1; tx /= n; tz /= n;
  return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), z: lerp(a[2], b[2], t), w: lerp(a[4], b[4], t), tx, tz };
}
function posAt(s, lat) {                  // lateral > 0 is to the left of the driving direction (normal = (tz, -tx))
  const f = frameAt(s); return { x: f.x + lat * f.tz, y: f.y, z: f.z - lat * f.tx, f };
}
function project(x, z, hint) {            // nearest centre segment around hint: arc s, lateral offset, height, width
  let best = null;
  for (let d = -10; d <= 24; d++) {
    const k = ((hint + d) % N + N) % N, a = node(k), b = node(k + 1);
    const ex = b[0] - a[0], ez = b[2] - a[2], l2 = ex * ex + ez * ez || 1;
    const t = clamp(((x - a[0]) * ex + (z - a[2]) * ez) / l2, 0, 1);
    const px = a[0] + ex * t, pz = a[2] + ez * t, dist = Math.hypot(x - px, z - pz);
    if (!best || dist < best.dist) {
      const l = Math.sqrt(l2), tx = ex / l, tz = ez / l;
      best = { k, dist, s: sOf(k) + t * (sOf(k + 1) - sOf(k)), lat: (x - px) * tz - (z - pz) * tx,
        y: lerp(a[1], b[1], t), w: lerp(a[4], b[4], t), tx, tz };
    }
  }
  return best;
}

/* ---------------- the champion's recorded lap ---------------- */
const GT = G.map(r => r[0]);
const T0 = G[Math.max(0, G.findIndex(r => r[3] > .2) - 1)][0];       // green light: the recorded kart starts moving
const FINISH = G[G.length - 1][1];
function ghostAt(t) {
  if (t <= GT[0]) return { s: G[0][1], lat: G[0][2], v: 0 };
  if (t >= GT[GT.length - 1]) { const r = G[G.length - 1]; return { s: r[1], lat: r[2], v: r[3] }; }
  let lo = 0, hi = GT.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (GT[m] <= t) lo = m; else hi = m; }
  const a = G[lo], b = G[hi], u = (t - a[0]) / (b[0] - a[0]);
  return { s: lerp(a[1], b[1], u), lat: lerp(a[2], b[2], u), v: lerp(a[3], b[3], u) };
}
// time at which the champion reached arc length s (for the gap)
const GS = []; { let m = -1; for (const r of G) { if (r[0] >= T0 && r[1] > m) { m = r[1]; GS.push([m, r[0]]); } } }
function ghostTimeAt(s) {
  if (s <= GS[0][0]) return GS[0][1];
  let lo = 0, hi = GS.length - 1; if (s >= GS[hi][0]) return GS[hi][1];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (GS[m][0] <= s) lo = m; else hi = m; }
  const a = GS[lo], b = GS[hi]; return lerp(a[1], b[1], (s - a[0]) / (b[0] - a[0]));
}
const SEC = P.sections;
const secAt = s => SEC.find(x => s >= x.s0 && s < x.s1) || SEC[SEC.length - 1];

/* ---------------- kart physics (the game kart's limits) ---------------- */
let GRIP = 21, SCRUB = 1.5;   // lateral grip (m/s²) and slide scrub: a perfect autopilot laps in about 55.9 s, the champion 56.9, the game AI 54.0
const VMAX = 25, BRAKE = 12, OFF_VMAX = 9;
const TR = P.turn_radius;
function turnRadius(v) {
  v = Math.abs(v); for (let i = 1; i < TR.length; i++) if (v <= TR[i][0])
    return lerp(TR[i - 1][1], TR[i][1], (v - TR[i - 1][0]) / (TR[i][0] - TR[i - 1][0]));
  return TR[TR.length - 1][1];
}
const accel = v => Math.max(0, 13.5 * (1 - v / 29));     // fitted to the recorded lap: 0 to 25 m/s in about 4 s

const keys = { gas: 0, brake: 0, left: 0, right: 0 };
const me = { x: 0, z: 0, y: 0, h: 0, v: 0, steer: 0, k: 0, s: 0, lat: 0, prog: 0, on: true, off_t: 0, frozen: 0, done: null };
function placeAt(s, lat) {
  const p = posAt(s, lat); me.x = p.x; me.z = p.z; me.y = p.y; me.h = Math.atan2(p.f.tz, p.f.tx);
  me.k = segAt(s); me.s = s; me.lat = lat;
}
function rescue() {
  if (me.frozen > 0) return;
  placeAt(me.s, 0); me.v = 0; me.steer = 0; me.frozen = 1.2; me.off_t = 0; warn('Back on the road', 1.4);
}
function stepKart(dt, t) {
  if (me.frozen > 0) { me.frozen -= dt; return; }
  const target = keys.left && !keys.right ? -1 : keys.right && !keys.left ? 1 : 0;
  const rate = target === 0 || Math.sign(target) !== Math.sign(me.steer) ? 8 : 4.5;
  me.steer += clamp(target - me.steer, -rate * dt, rate * dt);
  let a;
  if (keys.gas && !keys.brake) a = me.v >= 0 ? accel(me.v) : BRAKE;
  else if (keys.brake) a = me.v > .3 ? -BRAKE : (me.v > -5 ? -4 : 0);
  else a = -Math.sign(me.v) * Math.min(Math.abs(me.v) / dt, 1.2 + .01 * me.v * me.v);
  if (!me.on && Math.abs(me.v) > OFF_VMAX) a = Math.min(a, -14 * Math.sign(me.v));
  else if (!me.on) a *= .5;
  me.v = clamp(me.v + a * dt, -5, VMAX);
  // full lock follows the game kart's turning radius at this speed; past the grip limit the kart slides and scrubs speed
  let yaw = me.steer * me.v / turnRadius(me.v);
  const lim = GRIP / Math.max(Math.abs(me.v), 1);
  if (Math.abs(yaw) > lim) { me.v -= Math.sign(me.v) * Math.min(Math.abs(me.v), (Math.abs(yaw) - lim) * Math.abs(me.v) * SCRUB * dt); yaw = Math.sign(yaw) * lim; }
  me.h += yaw * dt;
  me.x += Math.cos(me.h) * me.v * dt; me.z += Math.sin(me.h) * me.v * dt;
  const pr = project(me.x, me.z, me.k);
  const fence = pr.w / 2 + 4.5;
  if (Math.abs(pr.lat) > fence) {                 // a fence beside the road: no cutting across the infield
    const back = Math.abs(pr.lat) - fence, sg = Math.sign(pr.lat);
    me.x -= sg * pr.tz * back; me.z += sg * pr.tx * back;
    me.v = Math.min(me.v, 6); pr.lat = sg * fence;
    const th = Math.atan2(pr.tz, pr.tx); let d = th - me.h; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < Math.PI / 2) me.h += d * .25;
  }
  let ds = pr.s - me.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
  me.prog += ds; me.s = pr.s; me.k = pr.k; me.lat = pr.lat; me.y = pr.y;
  me.on = Math.abs(pr.lat) <= pr.w / 2 + .4;
  me.off_t = me.on ? 0 : me.off_t + dt;
  if (me.off_t > 3) rescue();
  const fw = Math.cos(me.h) * pr.tx + Math.sin(me.h) * pr.tz;
  if (fw < -.3 && me.v > 2) warn('Wrong way', .3);
  else if (!me.on) warn('Off the road: slow', .3);
  if (me.prog >= FINISH && !me.done) me.done = t;
}

/* ---------------- scene ---------------- */
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const SKY = new THREE.Color('#9fc8e4');
scene.background = SKY; scene.fog = new THREE.Fog(SKY, 70, 300);
scene.add(new THREE.HemisphereLight('#e8f3ff', '#5a5130', 1.15));
const sun = new THREE.DirectionalLight('#fff1d2', 1.5); sun.position.set(80, 140, 50); scene.add(sun);
const camera = new THREE.PerspectiveCamera(66, 1, .3, 600);

function mesh(pos, col, idx, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const Q = P.quads;
const standin = new THREE.Group(); scene.add(standin);    // simple scenery, replaced by the real track once it loads
{ // road, kerbs, verges
  const road = [], ri = [], kerb = [], kc = [], ki = [], verge = [], vi = [], vc = [];
  const red = new THREE.Color('#d8463a'), white = new THREE.Color('#eef0f2');
  const grass = [new THREE.Color('#6f8f3c'), new THREE.Color('#678836')];
  Q.forEach((q, n) => {
    const b = road.length / 3; road.push(...q[0], ...q[1], ...q[2], ...q[3]); ri.push(b, b + 1, b + 2, b, b + 2, b + 3);
    // edges: q[0]→q[3] is one side, q[1]→q[2] the other
    for (const [a, d, o] of [[q[0], q[3], q[1]], [q[1], q[2], q[0]]]) {
      const ox = a[0] - o[0], oz = a[2] - o[2], l = Math.hypot(ox, oz) || 1, ux = ox / l, uz = oz / l;
      const off = (p, m, dy) => [p[0] + ux * m, p[1] + dy, p[2] + uz * m];
      let kb = kerb.length / 3; kerb.push(...off(a, 0, .03), ...off(d, 0, .03), ...off(d, .9, .06), ...off(a, .9, .06));
      ki.push(kb, kb + 1, kb + 2, kb, kb + 2, kb + 3);
      const c = (n % 2 ? red : white); for (let i = 0; i < 4; i++) kc.push(c.r, c.g, c.b);
      let vb = verge.length / 3; verge.push(...off(a, .9, -.02), ...off(d, .9, -.02), ...off(d, 46, -1.2), ...off(a, 46, -1.2));
      vi.push(vb, vb + 1, vb + 2, vb, vb + 2, vb + 3);
      const gc = grass[n % 2]; for (let i = 0; i < 4; i++) vc.push(gc.r, gc.g, gc.b);
    }
  });
  standin.add(mesh(road, null, ri, new THREE.MeshLambertMaterial({ color: '#50555d', side: THREE.DoubleSide })));
  standin.add(mesh(kerb, kc, ki, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  const vm = mesh(verge, vc, vi, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
  standin.add(vm);
  // centre dashes
  const dash = [], di = [];
  for (let s = 4; s < L; s += 9) {
    const a = posAt(s, 0), b = posAt(s + 3.5, 0), f = a.f;
    const w = .14, nx = f.tz * w, nz = -f.tx * w, bb = dash.length / 3;
    dash.push(a.x + nx, a.y + .04, a.z + nz, a.x - nx, a.y + .04, a.z - nz, b.x - nx, b.y + .04, b.z - nz, b.x + nx, b.y + .04, b.z + nz);
    di.push(bb, bb + 1, bb + 2, bb, bb + 2, bb + 3);
  }
  standin.add(mesh(dash, null, di, new THREE.MeshBasicMaterial({ color: '#d9d4c4', side: THREE.DoubleSide })));
  let minY = Infinity; for (const c of C) minY = Math.min(minY, c[1]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: '#7d8a3c' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = minY - 6; standin.add(ground);
}
{ // the cornfield: instanced stalks, kept off every part of the road
  const grid = new Map(), cell = 12, key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  for (let s = 0; s < L; s += 2) { const p = posAt(s, 0); const k = key(p.x, p.z); (grid.get(k) || grid.set(k, []).get(k)).push([p.x, p.z, p.f.w]); }
  const clear = (x, z) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of grid.get(`${cx + i},${cz + j}`) || [])
      if (Math.hypot(x - p[0], z - p[1]) < p[2] / 2 + 5) return false;
    return true;
  };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spots = [];
  for (let s = 0; s < L; s += 1.6) for (const side of [-1, 1]) for (let r = 0; r < 3; r++) {
    const f = frameAt(s), d = f.w / 2 + 6 + rnd() * 36, j = (rnd() - .5) * 1.5;
    const x = f.x + side * d * f.tz + j * f.tx, z = f.z - side * d * f.tx + j * f.tz;
    if (clear(x, z)) spots.push([x, f.y - .05 - (d / 46) * 1.2, z, .8 + rnd() * .6]);
  }
  const geo = new THREE.BoxGeometry(.7, 1, .7); geo.translate(0, .5, 0);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), spots.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), pal = ['#c7a64a', '#b99b3f', '#a8b04a', '#d1b458', '#98a443'];
  spots.forEach((p, i) => {
    m4.makeScale(1, 1.8 * p[3] + .6, 1); m4.setPosition(p[0], p[1], p[2]); im.setMatrixAt(i, m4);
    im.setColorAt(i, col.set(pal[i % pal.length]));
  });
  standin.add(im);
}
{ // start / finish line and gantry
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 2; const cx = cv.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { cx.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; cx.fillRect(i, j, 1, 1); }
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const f = frameAt(FINISH - 1), w = f.w;
  const yaw = Math.PI / 2 - Math.atan2(f.tz, f.tx);     // local +z along the track
  const lg = new THREE.PlaneGeometry(w, 1.6); lg.rotateX(-Math.PI / 2);
  const line = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: tex }));
  line.position.set(f.x, f.y + .05, f.z); line.rotation.y = yaw; standin.add(line);
  const mat = new THREE.MeshLambertMaterial({ color: '#2a3542' });
  for (const sd of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.5, 6, .5), mat);
    post.position.set(f.x + sd * (w / 2 + 1.4) * f.tz, f.y + 3, f.z - sd * (w / 2 + 1.4) * f.tx); standin.add(post);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(w + 3.4, 1.1, .4), new THREE.MeshLambertMaterial({ color: '#38d0e2' }));
  banner.position.set(f.x, f.y + 5.6, f.z); banner.rotation.y = yaw; standin.add(banner);
}
// the real track: every model of the track's scene, merged by texture (scripts/evolve/play_scenery.py; CC-BY-SA 4.0)
async function loadScenery() {
  try {
    const meta = await fetch('scenery/scenery.json').then(r => r.json());
    const res = await fetch('scenery/scenery.bin'); if (!res.ok) throw new Error(res.status);
    const total = +res.headers.get('content-length') || 0, reader = res.body.getReader(), chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      chunks.push(value); got += value.length;
      if (total) startBtn.textContent = `Loading the track… ${Math.round(got / total * 100)}%`;
    }
    const bin = new Uint8Array(got); { let o = 0; for (const c of chunks) { bin.set(c, o); o += c.length; } }
    const real = new THREE.Group(), loader = new THREE.TextureLoader();
    for (const m of meta.materials) {
      const g = new THREE.BufferGeometry();
      const B = bin.buffer;
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(B, m.pos, m.n * 3), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(B, m.uv, m.n * 2), 2));
      g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(B, m.col, m.n * 3), 3, true));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(B, m.idx, m.m), 1));
      g.computeVertexNormals();
      const opt = { vertexColors: true, side: m.alpha ? THREE.DoubleSide : THREE.FrontSide };
      if (m.tex) {
        const t = loader.load('scenery/' + m.tex); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; opt.map = t;
        if (m.alpha) opt.alphaTest = .5;
      }
      real.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial(opt)));
    }
    scene.add(real); standin.visible = false;
    scene.fog.near = 120; scene.fog.far = 520; camera.far = 900; camera.updateProjectionMatrix();
  } catch (e) { console.warn('scenery not loaded, keeping the simple one', e); }
  startBtn.disabled = false; startBtn.textContent = 'Start the race';
}
const startBtn = $('start'); startBtn.disabled = true; startBtn.textContent = 'Loading the track…';
loadScenery();

function makeKart(body, ghost) {
  const g = new THREE.Group(), o = ghost ? { transparent: true, opacity: .72 } : {};
  const M = c => new THREE.MeshLambertMaterial({ color: c, ...o });
  const box = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };
  box(1.25, .38, 2.0, 0, .42, 0, body);              // chassis
  box(1.0, .22, .55, 0, .46, 1.05, body);             // nose
  box(.7, .5, .6, 0, .78, -.35, '#20262e');           // seat
  box(.46, .46, .46, 0, 1.18, -.25, ghost ? '#bff4fa' : '#ffe2b0');   // helmet
  for (const [x, z] of [[-.72, .68], [.72, .68], [-.72, -.68], [.72, -.68]]) box(.32, .5, .55, x, .27, z, '#15191f');
  box(1.4, .12, .3, 0, .62, -1.05, '#20262e');        // rear wing
  return g;
}
const youKart = makeKart('#ffb23e', false), champKart = makeKart('#38d0e2', true);
scene.add(youKart, champKart);

/* ---------------- HUD: minimap, picture-in-picture, decisions ---------------- */
const map = $('map');
{
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const c of C) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); z0 = Math.min(z0, c[2]); z1 = Math.max(z1, c[2]); }
  const pad = 14, S = 170, k = (S - 2 * pad) / Math.max(x1 - x0, z1 - z0);
  const ox = pad + ((S - 2 * pad) - (x1 - x0) * k) / 2, oz = pad + ((S - 2 * pad) - (z1 - z0) * k) / 2;
  map.toMap = (x, z) => [ox + (x - x0) * k, oz + (z - z0) * k];
  map.setAttribute('viewBox', `0 0 ${S} ${S}`);
  const d = C.map((c, i) => (i ? 'L' : 'M') + map.toMap(c[0], c[2]).map(v => v.toFixed(1)).join(' ')).join('') + 'Z';
  const st = map.toMap(posAt(FINISH - 1, 0).x, posAt(FINISH - 1, 0).z);
  map.innerHTML = `<path d="${d}" fill="none" stroke="#2a3542" stroke-width="7" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#6f7c8c" stroke-width="2" stroke-linejoin="round"/>
    <rect x="${st[0] - 3}" y="${st[1] - 3}" width="6" height="6" fill="#e9eef3"/>
    <circle id="mC" r="4.5" fill="#38d0e2"/><circle id="mY" r="4.5" fill="#ffb23e" stroke="#11161d" stroke-width="1.5"/>`;
}
const pip = $('pip');
let lastSec = null;
function showDecision(s) {
  const sec = secAt(s); if (sec === lastSec) return; lastSec = sec;
  $('dSec').textContent = `Jev's answers · section ${sec.id} (${sec.type})`;
  const ch = sec.choice || {};
  $('dChips').innerHTML = Object.entries(ch).map(([k, v]) =>
    `<span><i>${k.replace(/_/g, ' ')}</i> ${String(v).toLowerCase().replace(/_/g, ' ')}</span>`).join('') || '<span>–</span>';
}
let warnUntil = 0, warnClock = 0;
function warn(text, dur) { $('hWarn').textContent = text; warnUntil = warnClock + dur; }

/* ---------------- race control ---------------- */
let state = 'intro', t = 0;
const BEST_KEY = 'raceahead-play-best';
function readBest() { try { return parseFloat(localStorage.getItem(BEST_KEY)) || null; } catch { return null; } }
function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch {} }
function showBest() { const b = readBest(); $('best').textContent = b ? `Your best: ${b.toFixed(2)} s` : ''; }
$('iLap').textContent = LAP.toFixed(1) + ' s';
showBest();

function reset() {
  t = 0; me.v = 0; me.steer = 0; me.prog = 0; me.frozen = 0; me.done = null; me.off_t = 0; me.on = true;
  placeAt(G[0][1], G[0][2] < 0 ? 1.8 : -1.8);     // the grid slot beside the champion
  me.prog = 0; lastSec = null; showDecision(0);
  pip.pause(); try { pip.currentTime = 0; } catch {}
  for (const k in keys) keys[k] = 0;
}
function start() {
  reset(); state = 'race';
  $('intro').classList.add('hide'); $('result').classList.add('hide');
  pip.play().catch(() => {});
}
function finish() {
  state = 'over'; pip.pause();
  const won = me.done != null && me.done < LAP;
  const head = $('rHead'); head.textContent = won ? 'You win' : 'You lose'; head.className = 'big px ' + (won ? 'win' : 'lose');
  const oracle = P.oracle_s;
  if (won) {
    const prev = readBest(); if (!prev || me.done < prev) saveBest(me.done);
    $('rText').innerHTML = `You beat the frozen champion by <b>${(LAP - me.done).toFixed(2)} s</b>.` +
      (oracle && me.done < oracle ? ' You were faster than the game\'s own AI too.' : ` The game's own AI, which knows the track, needs ${oracle.toFixed(1)} s.`);
  } else {
    const left = Math.max(0, FINISH - me.prog);
    $('rText').innerHTML = `The champion crossed the line while you still had <b>${left.toFixed(0)} m</b> to go. It learned this pace from its own laps on other tracks; this one is new to it.`;
  }
  $('rTimes').innerHTML =
    `<tr class="you"><td>You</td><td>${won ? me.done.toFixed(2) + ' s' : 'not finished'}</td></tr>` +
    `<tr class="ch"><td>Champion (frozen, round 40)</td><td>${LAP.toFixed(2)} s</td></tr>` +
    (oracle ? `<tr class="or"><td>Game AI (privileged, for reference)</td><td>${oracle.toFixed(2)} s</td></tr>` : '');
  $('result').classList.remove('hide'); showBest();
  setTimeout(() => $('again').focus(), 50);
}
$('start').onclick = start; $('again').onclick = start;

/* ---------------- input ---------------- */
const KEYMAP = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', e => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = 1; e.preventDefault(); }
  else if (e.code === 'KeyR' && state === 'race' && t > T0) rescue();
  else if ((e.code === 'Enter' || e.code === 'Space') && state !== 'race' && !startBtn.disabled) { e.preventDefault(); start(); }
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = 0; });
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });
for (const b of document.querySelectorAll('#touch button')) {
  const on = v => e => { e.preventDefault(); keys[b.dataset.k] = v; b.classList.toggle('on', !!v); };
  b.addEventListener('pointerdown', on(1)); b.addEventListener('pointerup', on(0));
  b.addEventListener('pointercancel', on(0)); b.addEventListener('pointerleave', on(0));
}

/* ---------------- loop ---------------- */
function resize() {
  const w = innerWidth, h = innerHeight, px = w > 1100 ? 2 : 1.5;
  renderer.setSize(Math.round(w / px), Math.round(h / px), false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const cam = new THREE.Vector3(), look = new THREE.Vector3();
let camInit = false;
function placeKart(obj, x, y, z, h) {
  obj.position.set(x, y, z); obj.rotation.set(0, Math.PI / 2 - h, 0);
}
function render(dt) {
  // player kart
  placeKart(youKart, me.x, me.y, me.z, me.h);
  youKart.rotation.z = -me.steer * Math.min(1, Math.abs(me.v) / 25) * .06;
  // champion: position from its recorded arc length and lateral offset
  const g = ghostAt(t), gp = posAt(g.s, g.lat), ga = ghostAt(t + .12), gq = posAt(ga.s, ga.lat);
  const gh = Math.hypot(gq.x - gp.x, gq.z - gp.z) > .05 ? Math.atan2(gq.z - gp.z, gq.x - gp.x) : Math.atan2(gp.f.tz, gp.f.tx);
  placeKart(champKart, gp.x, gp.y, gp.z, gh);
  // chase camera
  const fx = Math.cos(me.h), fz = Math.sin(me.h);
  const want = new THREE.Vector3(me.x - fx * 6.8, me.y + 2.7, me.z - fz * 6.8);
  const lk = new THREE.Vector3(me.x + fx * 6, me.y + 1.1, me.z + fz * 6);
  if (!camInit || dt > .5) { cam.copy(want); look.copy(lk); camInit = true; }
  const a = 1 - Math.exp(-dt * 7); cam.lerp(want, a); look.lerp(lk, 1 - Math.exp(-dt * 12));
  camera.position.copy(cam); camera.lookAt(look);
  renderer.render(scene, camera);
  // HUD
  $('hTime').textContent = t.toFixed(2);
  $('hSpeed').textContent = Math.max(0, me.v).toFixed(0);
  const gap = $('hGap');
  if (t > T0 + .5 && me.prog > 1) {
    const d = t - ghostTimeAt(Math.min(me.prog, FINISH));
    gap.textContent = (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' s'; gap.className = d > 0 ? 'behind' : 'ahead';
  } else { gap.textContent = '–'; gap.className = ''; }
  $('hProgYou').style.left = `calc(${clamp(me.prog / FINISH, 0, 1) * 100}% - 2px)`;
  $('hProgChamp').style.left = `calc(${clamp((t >= T0 ? g.s : 0) / FINISH, 0, 1) * 100}% - 2px)`;
  const my = map.toMap(me.x, me.z), mc = map.toMap(gp.x, gp.z);
  const mY = $('mY'), mC = $('mC'); mY.setAttribute('cx', my[0]); mY.setAttribute('cy', my[1]); mC.setAttribute('cx', mc[0]); mC.setAttribute('cy', mc[1]);
  showDecision(g.s);
  warnClock = t; if (t > warnUntil) $('hWarn').textContent = '';
  // countdown
  const cd = $('count');
  if (state === 'race' && t < T0) { const n = Math.ceil(T0 - t); cd.textContent = n > 3 ? 'Ready' : String(n); cd.className = 'count px'; }
  else if (state === 'race' && t < T0 + .9) { cd.textContent = 'Go!'; cd.className = 'count px go'; }
  else cd.textContent = '';
  // keep the recorded footage in step with the race clock
  if (state === 'race' && pip.readyState >= 2) {
    if (Math.abs(pip.currentTime - t) > .25) pip.currentTime = Math.min(t, pip.duration || t);
    if (pip.paused) pip.play().catch(() => {});
  }
}
let last = performance.now(), acc = 0;
const DT = 1 / 120;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (state === 'race') {
    acc += dt;
    while (acc >= DT) {
      acc -= DT; t += DT;
      if (t > T0) stepKart(DT, t);
      if (me.done != null || t >= LAP) { finish(); break; }
    }
  }
  render(dt);
  requestAnimationFrame(frame);
}
reset();
requestAnimationFrame(frame);
