
(() => {
'use strict';

/* ---------- 1. helpers ---------- */
const T = 48, COLS = 36, ROWS = 26, WW = COLS * T, WH = ROWS * T, KEY = 'suscrew.v1';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const shade = (h, a) => { const n = parseInt(h.slice(1), 16), f = v => clamp(v + a, 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const show = s => $(s).classList.remove('hidden'), hide = s => $(s).classList.add('hidden');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const easeBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

let CFG, S, mode = 'menu', cut = null, TK = null, last = 0, gt = 0, W = 0, H = 0, dpr = 1, zoom = 1, camx = 0, camy = 0, snap = true, saveT = 0;
const cv = $('#game'), ctx = cv.getContext('2d');
const crew = id => CFG.crew.find(m => m.id === id);
const fresh = () => ({ started: false, unlocked: [], tasks: [], clues: [], secs: 0, voted: null, done: false, px: null, py: null });
const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY))); } catch (e) { return fresh(); } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } };

/* ---------- 2. sound (synthesised with Web Audio, no files) ---------- */
const Snd = {
  ctx: null, off: false,
  t(f, d = .12, type = 'square', v = .06, sl = 0, at = 0) {
    if (this.off) return;
    try {
      const c = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = c.createOscillator(), g = c.createGain(), n = c.currentTime + at;
      o.type = type; o.frequency.setValueAtTime(f, n);
      if (sl) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + sl), n + d);
      g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.001, n + d);
      o.connect(g); g.connect(c.destination); o.start(n); o.stop(n + d + .02);
    } catch (e) { /* audio unavailable */ }
  },
  step() { this.t(rnd(90, 130), .05, 'triangle', .05); },
  door() { this.t(300, .25, 'sawtooth', .035, -200); },
  click() { this.t(660, .05, 'square', .04); },
  bad() { this.t(160, .25, 'sawtooth', .06, -60); },
  ok() { [523, 659, 784, 1047].forEach((f, i) => this.t(f, .14, 'square', .05, 0, i * .08)); },
  unlock() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.t(f, .22, 'triangle', .08, 0, i * .1)); },
  alarm() { this.t(880, .3, 'sawtooth', .06, -300); this.t(660, .3, 'sawtooth', .06, -200, .32); },
  vote() { this.t(440, .08, 'square', .05); this.t(880, .1, 'square', .05, 0, .08); },
  eject() { this.t(500, 1.6, 'sawtooth', .06, -450); },
  boom() { this.t(90, .5, 'sawtooth', .1, -50); }
};

/* ---------- 3. the crewmate sprite (original bean-shaped astronaut, drawn in code) ---------- */
function bean(c, x, y, col, o = {}) {
  const s = o.s ?? 1, f = o.f ?? 1, t = o.t ?? 0, mv = !!o.mv, sil = o.sil;
  const body = sil ? '#0b1226' : col, dark = sil ? '#0b1226' : shade(col, -60);
  const bob = mv ? -Math.abs(Math.sin(t * 11)) * 3 : Math.sin(t * 3) * -1.5, sw = mv ? Math.sin(t * 11) : 0;
  c.save(); c.translate(x, y); c.rotate(o.r ?? 0); c.scale(s * f, s); c.globalAlpha = o.a ?? 1;
  if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 2, 18, 6, 0, 0, 7); c.fill(); }
  c.translate(0, bob); c.lineWidth = 3; c.strokeStyle = '#0d1020'; c.lineJoin = 'round'; c.fillStyle = dark;
  [[-13, -sw], [2, sw]].forEach(([lx, p]) => { c.beginPath(); c.roundRect(lx, -14 - Math.max(0, p) * 5, 11, 15, 4); c.fill(); c.stroke(); });
  c.beginPath(); c.roundRect(-23, -36, 11, 22, 5); c.fill(); c.stroke();
  c.fillStyle = body; c.beginPath(); c.roundRect(-17, -50, 34, 40, [17, 17, 8, 8]); c.fill(); c.stroke();
  if (!sil) {
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.roundRect(-12, -45, 8, 14, 4); c.fill();
    c.fillStyle = '#a9e6f5'; c.beginPath(); c.roundRect(1, -43, 19, 14, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.roundRect(10, -40, 7, 4, 2); c.fill();
  }
  c.restore();
}
const avs = [];   // animated avatar canvases currently in the DOM
function avCanvas(color, sil, size) {
  const e = document.createElement('canvas'); e.width = e.height = size; avs.push({ e, color, sil }); return e;
}

/* ---------- 4. the spaceship map ---------- */
// Rooms and hallways are rectangles in tile units; everything else is void (solid).
const ROOMS = [
  { n: 'Electrical', x: 2, y: 3, w: 7, h: 8, c: '#3a3828', a: '#ffd23f' },
  { n: 'Cafeteria', x: 14, y: 7, w: 8, h: 8, c: '#33425a', a: '#7ad7ff' },
  { n: 'Admin', x: 27, y: 3, w: 7, h: 8, c: '#2d3b3b', a: '#4dffb0' },
  { n: 'Storage', x: 2, y: 12, w: 7, h: 8, c: '#3b352f', a: '#ff9f43' },
  { n: 'MedBay', x: 27, y: 12, w: 7, h: 8, c: '#2b4046', a: '#6ee7ff' },
  { n: 'Navigation', x: 13, y: 18, w: 10, h: 6, c: '#2a2c4c', a: '#b388ff' }
];
const HALLS = [
  { x: 9, y: 8, w: 5, h: 2, d: 'h' }, { x: 22, y: 8, w: 5, h: 2, d: 'h' },
  { x: 9, y: 12, w: 5, h: 2, d: 'h' }, { x: 22, y: 12, w: 5, h: 2, d: 'h' },
  { x: 17, y: 15, w: 2, h: 3, d: 'v' }
];
// furniture blocks movement: [tileX, tileY, w, h, kind]
const SOLIDS = [
  [17, 10, 2, 2, 'table'], [3, 3, 5, 1, 'panel'], [29, 5, 3, 1, 'desk'], [3, 13, 2, 2, 'crate'], [7, 13, 1, 1, 'crate'],
  [8, 18, 1, 1, 'crate'], [30, 15, 2, 2, 'bed'], [15, 22, 6, 1, 'console'], [14, 23, 8, 1, 'window']
];
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));   // 0 void, 1 floor, 2 furniture
const tint = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const carve = (x, y, w, h, col) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { grid[j][i] = 1; tint[j][i] = col; } };
HALLS.forEach(h => carve(h.x, h.y, h.w, h.h, '#2c3544'));
ROOMS.forEach(r => carve(r.x, r.y, r.w, r.h, r.c));
SOLIDS.forEach(([x, y, w, h]) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = 2; });

const DOORS = [];   // sliding doors at both ends of every hallway
HALLS.forEach(h => {
  const ends = h.d === 'h' ? [[h.x, h.y], [h.x + h.w - 1, h.y]] : [[h.x, h.y], [h.x, h.y + h.h - 1]];
  ends.forEach(([tx, ty]) => DOORS.push({ x: tx * T, y: ty * T, w: h.d === 'h' ? T : h.w * T, h: h.d === 'h' ? h.h * T : T, v: h.d === 'h', o: 0 }));
});

const stat = document.createElement('canvas'); stat.width = WW; stat.height = WH;   // pre-rendered static layer
const mini = document.createElement('canvas'); mini.width = COLS * 4; mini.height = ROWS * 4;

function furniture(c, kind, x, y, w, h) {
  const box = (fill, r = 8) => { c.fillStyle = fill; c.strokeStyle = '#0d1020'; c.lineWidth = 3; c.beginPath(); c.roundRect(x + 3, y + 3, w - 6, h - 6, r); c.fill(); c.stroke(); };
  if (kind === 'table') { box('#d3dbed', 40); c.fillStyle = '#aab6d3'; c.beginPath(); c.roundRect(x + 14, y + 14, w - 28, h - 28, 30); c.fill(); }
  else if (kind === 'crate') { box('#b07a3e', 6); c.strokeStyle = '#5a3a17'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 6, y + 6); c.lineTo(x + w - 6, y + h - 6); c.moveTo(x + w - 6, y + 6); c.lineTo(x + 6, y + h - 6); c.stroke(); }
  else if (kind === 'bed') { box('#cfe3ee', 14); c.fillStyle = '#fff'; c.beginPath(); c.roundRect(x + 10, y + 10, w - 20, 22, 8); c.fill(); }
  else if (kind === 'desk') box('#6d7a99', 6);
  else if (kind === 'console') { box('#363e66', 8); for (let i = 0; i < 12; i++) { c.fillStyle = ['#ff3b4e', '#ffd23f', '#3ddc84', '#6ef3ff'][i % 4]; c.fillRect(x + 12 + i * 22, y + 20, 10, 8); } }
  else if (kind === 'panel') box('#2c3350', 6);
  else if (kind === 'window') box('#10142e', 6);
}

function buildStatic() {
  const c = stat.getContext('2d'), tiles = [];
  grid.forEach((r, y) => r.forEach((v, x) => { if (v) tiles.push([x, y]); }));
  [[22, '#5a6685'], [10, '#2b3250']].forEach(([m, col]) => { c.fillStyle = col; tiles.forEach(([x, y]) => c.fillRect(x * T - m, y * T - m, T + 2 * m, T + 2 * m)); });
  tiles.forEach(([x, y]) => { c.fillStyle = tint[y][x]; c.fillRect(x * T, y * T, T, T); if ((x + y) % 2) { c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(x * T, y * T, T, T); } });
  c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1; tiles.forEach(([x, y]) => c.strokeRect(x * T, y * T, T, T));
  ROOMS.forEach(r => {
    c.fillStyle = rgba(r.a, .07); c.beginPath(); c.roundRect((r.x + 1) * T, (r.y + 1) * T, (r.w - 2) * T, (r.h - 2) * T, 24); c.fill();
    c.strokeStyle = rgba(r.a, .35); c.lineWidth = 3; c.setLineDash([14, 10]); c.stroke(); c.setLineDash([]);
    c.fillStyle = rgba(r.a, .22); c.font = "34px 'Bungee',Impact,sans-serif"; c.textAlign = 'left'; c.fillText(r.n.toUpperCase(), r.x * T + 16, (r.y + r.h) * T - 14);
  });
  SOLIDS.forEach(([x, y, w, h, k]) => furniture(c, k, x * T, y * T, w * T, h * T));
  const m = mini.getContext('2d'); m.fillStyle = '#4a5578';
  tiles.forEach(([x, y]) => { m.fillStyle = grid[y][x] === 2 ? '#2b3250' : '#56628a'; m.fillRect(x * 4, y * 4, 4, 4); });
}

const blocked = (x, y) => [[-11, -14], [11, -14], [-11, 2], [11, 2], [0, 2], [0, -14]].some(([ox, oy]) => grid[Math.floor((y + oy) / T)]?.[Math.floor((x + ox) / T)] !== 1);
const stn = t => ({ x: (t.tx + .5) * T, y: (t.ty + .5) * T });
const P = { x: 16.5 * T, y: 8.5 * T, f: 1, t: 0, mv: false };

/* ---------- 5. drawing: space, world, effects ---------- */
const STARS = Array.from({ length: 190 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(.5, 2), v: rnd(.01, .05), p: rnd(0, 6) }));
const PLANETS = [{ x: .82, y: .22, r: .16, a: '#ff7a59', b: '#7a1f4d' }, { x: .12, y: .8, r: .1, a: '#5ad1ff', b: '#1b2f77' }, { x: .5, y: .1, r: .045, a: '#c7ff8a', b: '#2f6b2a' }];

function drawSpace(par = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04050f'); g.addColorStop(1, '#150b33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  PLANETS.forEach((p, i) => {
    const px = p.x * W + Math.sin(gt * .05 + i) * 12 - par * .08, py = p.y * H, r = p.r * Math.min(W, H) * 1.6;
    const gr = ctx.createRadialGradient(px - r * .3, py - r * .3, r * .1, px, py, r); gr.addColorStop(0, p.a); gr.addColorStop(1, p.b);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    if (i === 1) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(px, py, r * 1.6, r * .35, -.4, 0, 7); ctx.stroke(); }
  });
  STARS.forEach(s => {
    const x = ((s.x * W - gt * s.r * 12 - par * s.r * .25) % W + W) % W;
    ctx.fillStyle = `rgba(255,255,255,${.35 + .65 * Math.abs(Math.sin(gt * s.v * 30 + s.p))})`; ctx.fillRect(x, s.y * H, s.r, s.r);
  });
}

function drawMenuBeans() {
  const cols = [...CFG.crew.map(m => m.color), '#b36bff', '#ff9f43'];
  cols.forEach((col, i) => {
    const x = (((i * .19 + gt * .018 * (i % 2 ? 1 : -1)) % 1) + 1) % 1 * (W + 240) - 120;
    const y = H * (.12 + .76 * ((i * .37) % 1)) + Math.sin(gt * .8 + i) * 34;
    bean(ctx, x, y, col, { s: 1.4 + (i % 3) * .5, r: gt * .35 + i, sil: i === 5, noShadow: true, t: gt + i });
  });
}

function drawWorld() {
  const vw = W / zoom, vh = H / zoom;
  let tx = vw > WW + 120 ? (WW - vw) / 2 : clamp(P.x - vw / 2, -60, WW - vw + 60);
  let ty = vh > WH + 120 ? (WH - vh) / 2 : clamp(P.y - vh / 2, -60, WH - vh + 60);
  if (snap) { camx = tx; camy = ty; snap = false; } else { camx += (tx - camx) * .12; camy += (ty - camy) * .12; }
  drawSpace(camx);
  ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-camx, -camy);
  ctx.drawImage(stat, 0, 0);
  decor(ctx); drawDoors(ctx); drawMarkers(ctx);
  bean(ctx, P.x, P.y, '#b36bff', { f: P.f, t: P.t, mv: P.mv });
  ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .78);
  g.addColorStop(0, 'rgba(0,0,12,0)'); g.addColorStop(1, 'rgba(0,0,12,.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawMini();
}

function decor(c) {   // animated room details
  for (let i = 3; i <= 7; i++) {   // Electrical panel LEDs + sparks
    c.fillStyle = Math.sin(gt * 3 + i * 1.7) > .2 ? '#ffd23f' : '#5a4b14'; c.fillRect(i * T + 10, 3 * T + 10, 8, 8);
    c.fillStyle = Math.sin(gt * 5 + i) > .6 ? '#ff3b4e' : '#4d1a22'; c.fillRect(i * T + T - 20, 3 * T + 10, 8, 8);
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(i * T + 10, 3 * T + 24, T - 20, 12);
  }
  if (Math.sin(gt * 2.3) > .9) { c.strokeStyle = '#fff6a8'; c.lineWidth = 2; c.beginPath(); for (let k = 0; k < 5; k++) { c.moveTo(5.5 * T, 3.9 * T); c.lineTo(5.5 * T + rnd(-26, 26), 3.9 * T + rnd(-4, 30)); } c.stroke(); }
  for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(77,255,176,${.5 + .3 * Math.sin(gt * 2 + i)})`; c.fillRect(29 * T + 8 + i * T, 5 * T + 8, T - 16, T - 22); }   // Admin monitors
  const by = 15 * T + (Math.sin(gt * 1.5) + 1) / 2 * 2 * T;   // MedBay scanner
  c.fillStyle = 'rgba(110,231,255,.55)'; c.fillRect(30 * T + 4, by - 2, 2 * T - 8, 4); c.fillStyle = 'rgba(110,231,255,.12)'; c.fillRect(30 * T + 4, 15 * T, 2 * T - 8, by - 15 * T);
  const wx = 14 * T + 6, wy = 23 * T + 6, ww = 8 * T - 12, wh = T - 12;   // Navigation window
  c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip(); c.fillStyle = '#050714'; c.fillRect(wx, wy, ww, wh);
  STARS.slice(0, 50).forEach(s => { c.fillStyle = '#fff'; c.fillRect(wx + ((s.x * ww - gt * 40 * s.r) % ww + ww) % ww, wy + s.y * wh, s.r + .5, s.r + .5); }); c.restore();
  c.fillStyle = `rgba(255,255,255,${.03 + .03 * Math.sin(gt * 9)})`; c.beginPath(); c.arc(18 * T, 13 * T, 150, 0, 7); c.fill();   // flickering cafeteria light
}

function drawDoors(c) {
  DOORS.forEach(d => {
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2, near = Math.hypot(P.x - cx, P.y - cy) < 100, was = d.o;
    d.o = clamp(d.o + (near ? 1 : -1) * 4 * (1 / 60), 0, 1); if (was < .1 && d.o >= .1) Snd.door();
    const k = 1 - d.o; c.fillStyle = '#8f9bb5'; c.strokeStyle = '#0d1020'; c.lineWidth = 3;
    if (k < .02) return;
    if (d.v) { const hh = d.h / 2 * k; [[d.y, hh], [d.y + d.h - hh, hh]].forEach(([yy, h]) => { c.fillRect(d.x + T / 2 - 7, yy, 14, h); c.strokeRect(d.x + T / 2 - 7, yy, 14, h); }); c.fillStyle = '#ffd23f'; c.fillRect(d.x + T / 2 - 7, cy - 4, 14, 8); }
    else { const ww = d.w / 2 * k; [[d.x, ww], [d.x + d.w - ww, ww]].forEach(([xx, w]) => { c.fillRect(xx, d.y + T / 2 - 7, w, 14); c.strokeRect(xx, d.y + T / 2 - 7, w, 14); }); }
  });
}

function drawMarkers(c) {
  CFG.tasks.forEach(t => {
    const p = stn(t), done = S.tasks.includes(t.id), lock = t.unlocks == null && S.unlocked.length < 4;
    const col = done ? '#3ddc84' : lock ? '#ff3b4e' : '#ffd23f', pul = .5 + .5 * Math.sin(gt * 4);
    c.save(); c.translate(p.x, p.y);
    c.fillStyle = rgba(col, done ? .15 : .18 + .2 * pul); c.beginPath(); c.ellipse(0, 6, 34 + 4 * pul, 15 + 2 * pul, 0, 0, 7); c.fill();
    c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 6, 28, 11, 0, 0, 7); c.stroke();
    c.font = '26px serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(done ? '✅' : lock ? '🔒' : t.icon, 0, -30 + Math.sin(gt * 3) * 4); c.restore();
  });
  CFG.clues.forEach(k => {
    if (S.clues.includes(k.id)) return;
    const x = (k.tx + .5) * T, y = (k.ty + .5) * T, s = Math.sin(gt * 5);
    c.fillStyle = rgba('#6ef3ff', .18 + .12 * s); c.beginPath(); c.arc(x, y, 17 + 3 * s, 0, 7); c.fill();
    c.fillStyle = '#6ef3ff'; c.font = "700 18px 'Fredoka',sans-serif"; c.textAlign = 'center'; c.fillText('?', x, y + 6);
  });
}

function drawMini() {
  const m = $('#mini').getContext('2d'); m.clearRect(0, 0, 144, 104); m.drawImage(mini, 0, 0);
  CFG.tasks.forEach(t => { if (!S.tasks.includes(t.id)) { m.fillStyle = Math.sin(gt * 6) > 0 ? '#ffd23f' : '#8a6d00'; m.fillRect(t.tx * 4 - 1, t.ty * 4 - 1, 5, 5); } });
  m.fillStyle = '#b36bff'; m.strokeStyle = '#fff'; m.lineWidth = 1.5; m.beginPath(); m.arc(P.x / T * 4, P.y / T * 4, 4, 0, 7); m.fill(); m.stroke();
}

function text(s, x, y, size, col, font = 'Bungee', align = 'center') {
  ctx.font = `${size}px '${font}',Impact,sans-serif`; ctx.textAlign = align; ctx.lineWidth = size / 8; ctx.strokeStyle = '#0d1020'; ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
}

/* ---------- 6. tasks (each returns an object with draw/down/move/up) ---------- */
const rr = (c, x, y, w, h, r, fill, stroke) => { c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 3; c.stroke(); } };

function tWiring(c, cv, fin) {
  const cols = ['#ff3b4e', '#3d7bff', '#ffd23f', '#e44fff'], ys = [60, 140, 220, 300], R = shuffle(cols.slice());
  const link = [null, null, null, null]; let drag = null, sp = [];
  return {
    down(p) { const i = ys.findIndex(y => Math.abs(y - p.y) < 28); if (i >= 0 && p.x < 120) { link[i] = null; drag = { i, x: p.x, y: p.y }; } },
    move(p) { if (drag) { drag.x = p.x; drag.y = p.y; } },
    up(p) {
      if (!drag) return;
      const j = ys.findIndex(y => Math.abs(y - p.y) < 30);
      if (j >= 0 && p.x > 420 && R[j] === cols[drag.i] && !link.includes(j)) { link[drag.i] = j; Snd.click(); for (let k = 0; k < 14; k++) sp.push({ x: 490, y: ys[j], vx: rnd(-90, 90), vy: rnd(-90, 90), l: .5 }); } else Snd.bad();
      drag = null; if (link.every(v => v !== null)) fin();
    },
    draw(dt) {
      rr(c, 0, 0, 560, 360, 0, '#0b1024'); rr(c, 14, 14, 532, 332, 18, '#1b2033', '#3a456e');
      cols.forEach((col, i) => {
        const j = link[i]; c.lineCap = 'round';
        if (j !== null) { c.strokeStyle = '#0d1020'; c.lineWidth = 20; c.beginPath(); c.moveTo(70, ys[i]); c.bezierCurveTo(250, ys[i], 320, ys[j], 490, ys[j]); c.stroke(); c.strokeStyle = col; c.lineWidth = 13; c.stroke(); }
        if (drag && drag.i === i) { c.strokeStyle = col; c.lineWidth = 13; c.beginPath(); c.moveTo(70, ys[i]); c.lineTo(drag.x, drag.y); c.stroke(); rr(c, drag.x - 10, drag.y - 10, 20, 20, 6, col, '#0d1020'); }
        rr(c, 24, ys[i] - 18, 56, 36, 8, col, '#0d1020');
      });
      R.forEach((col, j) => { rr(c, 480, ys[j] - 18, 56, 36, 8, col, '#0d1020'); c.fillStyle = link.includes(j) ? '#3ddc84' : '#3a1218'; c.beginPath(); c.arc(462, ys[j], 6, 0, 7); c.fill(); });
      sp = sp.filter(s => (s.l -= dt) > 0); sp.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; c.fillStyle = '#fff6a8'; c.fillRect(s.x, s.y, 4, 4); });
    }
  };
}

function tSwipe(c, cv, fin) {
  let cx = 70, drag = null, t0 = 0, ev = false, msg = 'PLEASE SWIPE CARD', ok = false, bad = false;
  return {
    down(p) { if (p.x > cx && p.x < cx + 130 && p.y > 170 && p.y < 262) { drag = p.x - cx; t0 = 0; ev = false; bad = false; msg = 'SWIPE NOW'; } },
    move(p) {
      if (drag === null || ev) return; cx = clamp(p.x - drag, 40, 430);
      if (!t0 && cx > 140) t0 = performance.now();
      if (t0 && cx >= 410) { ev = true; const d = performance.now() - t0;
        if (d < 420) { msg = 'TOO FAST. TRY AGAIN'; bad = true; Snd.bad(); } else if (d > 900) { msg = 'TOO SLOW. TRY AGAIN'; bad = true; Snd.bad(); } else { msg = 'ACCEPTED. THANK YOU'; ok = true; fin(); } }
    },
    up() { drag = null; if (!ok) { cx = 70; t0 = 0; ev = false; if (!bad) msg = 'PLEASE SWIPE CARD'; } },
    draw() {
      rr(c, 0, 0, 560, 360, 0, '#0b1024'); rr(c, 14, 100, 532, 190, 20, '#242c4f', '#3a456e'); rr(c, 30, 135, 500, 110, 14, '#10142e');
      rr(c, 150, 28, 260, 56, 10, '#06140f', '#3a456e'); c.font = "700 20px 'Fredoka'"; c.textAlign = 'center'; c.fillStyle = ok ? '#3ddc84' : bad ? '#ff3b4e' : '#ffd23f'; c.fillText(msg, 280, 64);
      c.fillStyle = ok ? '#3ddc84' : bad ? '#ff3b4e' : '#444c70'; c.beginPath(); c.arc(500, 56, 12, 0, 7); c.fill();
      c.strokeStyle = '#05070f'; c.lineWidth = 6; c.beginPath(); c.moveTo(40, 190); c.lineTo(520, 190); c.stroke();
      rr(c, cx, 172, 130, 86, 10, '#e8edf7', '#0d1020'); c.fillStyle = '#1b2033'; c.fillRect(cx + 2, 186, 126, 18); rr(c, cx + 12, 214, 34, 30, 6, '#7ad7ff'); c.fillStyle = '#9aa7c7'; c.fillRect(cx + 56, 218, 62, 6); c.fillRect(cx + 56, 232, 44, 6);
      c.fillStyle = '#8fa0c9'; c.font = "600 15px 'Fredoka'"; c.fillText('swipe at a steady pace', 280, 330);
    }
  };
}

function tGarbage(c, cv, fin) {
  const N = 14, E = ['🍃', '🥫', '🍌', '🦴', '📦', '🧦'], items = Array.from({ length: N }, (_, i) => ({ x: rnd(120, 320), y: rnd(40, 300), e: E[i % E.length], r: rnd(-.6, .6) }));
  let hy = 70, drag = false, prog = 0; const lo = 70, hi = 290;
  return {
    down(p) { if (p.x > 410 && p.x < 530 && Math.abs(p.y - hy) < 50) drag = true; },
    move(p) { if (drag) hy = clamp(p.y, lo, hi); }, up() { drag = false; },
    draw(dt) {
      if (!drag && !this.ok) hy = Math.max(lo, hy - 520 * dt);
      const pulled = hy > hi - 25 && !this.ok;
      if (pulled) { prog = Math.min(1, prog + dt / 2.4); items.forEach(i => { i.y += 260 * dt; if (i.y > 330) i.y -= 300; }); if (prog >= 1) fin(); }
      rr(c, 0, 0, 560, 360, 0, '#0b1024'); rr(c, 90, 20, 280, 320, 16, '#161c38', '#3a456e');
      c.save(); c.beginPath(); c.rect(94, 24, 272, 312); c.clip(); c.font = '34px serif'; c.textAlign = 'center';
      items.forEach((i, k) => { if (k / N >= prog) { c.save(); c.translate(i.x, i.y); c.rotate(i.r + (pulled ? i.y / 40 : 0)); c.fillText(i.e, 0, 0); c.restore(); } }); c.restore();
      rr(c, 440, 50, 20, 270, 10, '#05070f'); rr(c, 410, hy - 28, 80, 56, 14, pulled ? '#3ddc84' : '#ff3b4e', '#0d1020');
      rr(c, 390, 330, 140, 14, 6, '#16224b'); rr(c, 390, 330, 140 * prog, 14, 6, '#3ddc84');
      c.fillStyle = '#8fa0c9'; c.font = "600 15px 'Fredoka'"; c.fillText('PULL DOWN AND HOLD', 460, 24);
    }
  };
}

function tUpload(c, cv, fin) {
  let st = 'idle', prog = 0, si = 0, bugs = []; const stall = [.33, .68];
  return {
    down(p) {
      if (st === 'idle' && p.x > 200 && p.x < 360 && p.y > 255 && p.y < 315) { st = 'run'; Snd.click(); }
      else if (st === 'stall') { const b = bugs.find(b => Math.hypot(b.x - p.x, b.y - p.y) < 34); if (b) { bugs.splice(bugs.indexOf(b), 1); Snd.click(); if (!bugs.length) { st = 'run'; si++; } } }
    },
    draw(dt) {
      if (st === 'run') { prog += dt * .17; if (prog >= 1) { prog = 1; st = 'done'; fin(); } else if (si < 2 && prog >= stall[si]) { st = 'stall'; Snd.bad(); bugs = Array.from({ length: 3 }, () => ({ x: rnd(100, 460), y: rnd(120, 230) })); } }
      rr(c, 0, 0, 560, 360, 0, '#0b1024'); rr(c, 20, 20, 150, 90, 14, '#1b2033', '#3a456e'); rr(c, 390, 20, 150, 90, 14, '#1b2033', '#3a456e');
      c.font = '40px serif'; c.textAlign = 'center'; c.fillText('💻', 95, 78); c.fillText('🛰️', 465, 78);
      c.font = "600 14px 'Fredoka'"; c.fillStyle = '#8fa0c9'; c.fillText('YOUR FILE', 95, 102); c.fillText('SHIP SERVER', 465, 102);
      for (let i = 0; i < 6; i++) { const x = 190 + ((gt * 120 + i * 32) % 180); c.fillStyle = rgba('#6ef3ff', st === 'run' ? .8 : .15); c.fillRect(x, 62, 14, 10); }
      rr(c, 40, 150, 480, 30, 15, '#16224b', '#3a456e'); if (prog > 0) rr(c, 43, 153, Math.max(24, 474 * prog), 24, 12, st === 'stall' ? '#ff3b4e' : '#3ddc84');
      c.fillStyle = '#fff'; c.font = "700 20px 'Fredoka'"; c.fillText(Math.floor(prog * 100) + '%', 280, 205);
      if (st === 'idle') { rr(c, 200, 255, 160, 60, 14, '#ff3b4e', '#0d1020'); c.fillStyle = '#fff'; c.font = "700 26px 'Fredoka'"; c.fillText('UPLOAD', 280, 295); }
      if (st === 'stall') { c.fillStyle = '#ff3b4e'; c.font = "700 22px 'Fredoka'"; c.fillText('CONNECTION LOST - squash the glitches!', 280, 340); c.font = '40px serif'; bugs.forEach((b, k) => c.fillText('🐛', b.x + Math.sin(gt * 9 + k) * 6, b.y + 14)); }
    }
  };
}

function tNav(c, cv, fin) {
  let mx = 90, my = 300, drag = false, prog = 0, t = 0;
  return {
    down(p) { drag = true; mx = p.x; my = p.y; }, move(p) { if (drag) { mx = p.x; my = p.y; } }, up() { drag = false; },
    draw(dt) {
      t += dt; const tx = 280 + 170 * Math.sin(t * .7), ty = 170 + 100 * Math.sin(t * 1.1 + 1), inn = Math.hypot(mx - tx, my - ty) < 30;
      if (!this.ok) { prog = clamp(prog + (inn ? dt / 3 : -dt / 6), 0, 1); if (prog >= 1) fin(); }
      rr(c, 0, 0, 560, 360, 0, '#050714'); STARS.slice(0, 60).forEach(s => { c.fillStyle = '#fff'; c.fillRect(s.x * 560, s.y * 360, s.r, s.r); });
      c.strokeStyle = 'rgba(110,243,255,.18)'; c.lineWidth = 1; for (let i = 0; i < 560; i += 40) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 360); c.stroke(); } for (let i = 0; i < 360; i += 40) { c.beginPath(); c.moveTo(0, i); c.lineTo(560, i); c.stroke(); }
      c.strokeStyle = inn ? '#3ddc84' : '#ffd23f'; c.lineWidth = 4; c.beginPath(); c.arc(tx, ty, 30, 0, 7); c.stroke(); c.beginPath(); c.arc(tx, ty, 14, 0, 7); c.stroke();
      c.beginPath(); c.moveTo(tx - 44, ty); c.lineTo(tx + 44, ty); c.moveTo(tx, ty - 44); c.lineTo(tx, ty + 44); c.stroke();
      c.fillStyle = '#b388ff'; c.beginPath(); c.moveTo(mx, my - 16); c.lineTo(mx + 12, my + 12); c.lineTo(mx - 12, my + 12); c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
      rr(c, 40, 330, 480, 14, 7, '#16224b'); rr(c, 40, 330, Math.max(14, 480 * prog), 14, 7, '#3ddc84');
      c.fillStyle = '#fff'; c.font = "700 16px 'Fredoka'"; c.textAlign = 'center'; c.fillText(inn ? 'LOCKING ON...' : 'DRAG THE MARKER ONTO THE TARGET', 280, 318);
    }
  };
}
const TASKS = { wiring: tWiring, swipe: tSwipe, garbage: tGarbage, upload: tUpload, nav: tNav };

function openTask(t) {
  const tc = $('#tc'), c = tc.getContext('2d'); $('#tTitle').textContent = t.title; $('#tHint').textContent = t.hint; show('#task');
  const finish = () => { if (!TK || TK.ok) return; TK.ok = true; Snd.ok(); setTimeout(() => { closeTask(); completeTask(t); }, 1000); };
  TK = TASKS[t.id](c, tc, finish); TK.ok = false; TK.def = t;
  const pt = e => { const r = tc.getBoundingClientRect(); return { x: (e.clientX - r.left) * tc.width / r.width, y: (e.clientY - r.top) * tc.height / r.height }; };
  tc.onpointerdown = e => { tc.setPointerCapture(e.pointerId); if (TK && !TK.ok && TK.down) TK.down(pt(e)); };
  tc.onpointermove = e => { if (TK && !TK.ok && TK.move) TK.move(pt(e)); };
  tc.onpointerup = tc.onpointercancel = e => { if (TK && !TK.ok && TK.up) TK.up(pt(e)); };
}
function closeTask() { TK = null; hide('#task'); }
function drawTaskDone() {
  const c = $('#tc').getContext('2d'); c.fillStyle = 'rgba(8,40,24,.82)'; c.fillRect(0, 0, 560, 360);
  c.fillStyle = '#3ddc84'; c.font = "400 44px 'Bungee',sans-serif"; c.textAlign = 'center'; c.fillText('TASK COMPLETE', 280, 190);
}

function completeTask(t) {
  if (!S.tasks.includes(t.id)) S.tasks.push(t.id);
  if (t.unlocks && !S.unlocked.includes(t.unlocks)) S.unlocked.push(t.unlocks);
  save(); hud();
  if (t.unlocks) startUnlock(crew(t.unlocks)); else startAlarm();
}

/* ---------- 7. cutscenes: unlock reveal, red alert, ejection ---------- */
function startUnlock(m) { cut = { type: 'unlock', m, t: 0, parts: [], spawned: false, btns: false }; Snd.boom(); }
function startAlarm() {
  cut = { type: 'alarm', t: 0 }; Snd.alarm(); cut.siren = setInterval(() => Snd.alarm(), 650);
}
function startEject() { cut = { type: 'eject', t: 0, btns: false }; Snd.eject(); }
function endCut() { if (cut && cut.siren) clearInterval(cut.siren); cut = null; hide('#cutBtns'); }
function cutBtns(list) {
  const box = $('#cutBtns'); box.innerHTML = '';
  list.forEach(([label, fn, big]) => { const b = document.createElement('button'); b.className = 'btn' + (big ? ' big' : ''); b.textContent = label; b.onclick = () => { Snd.click(); fn(); }; box.appendChild(b); }); show('#cutBtns');
}

function updateCut(dt) {
  cut.t += dt; const t = cut.t;
  if (cut.type === 'unlock') {
    if (t >= 1 && !cut.spawned) { cut.spawned = true; Snd.unlock(); for (let i = 0; i < 140; i++) cut.parts.push({ x: W / 2, y: H * .45, vx: rnd(-420, 420), vy: rnd(-620, -80), c: pick([cut.m.color, '#fff', '#ffd23f', '#6ef3ff']), r: rnd(0, 6) }); }
    cut.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt; p.r += 6 * dt; });
    if (t > 2.6 && !cut.btns) { cut.btns = true; const m = cut.m; cutBtns([['View profile', () => { endCut(); openDb(m.id); }, true], ['Keep exploring', () => { endCut(); if (S.unlocked.length === 4) toast('All crew found! The Navigation console is now online.'); }]]); }
  } else if (cut.type === 'alarm') {
    if (t > 3.4) { endCut(); openMeeting(); }
  } else if (cut.type === 'eject') {
    if (t > 7.5 && !cut.btns) { cut.btns = true; cutBtns([['See final results', () => { endCut(); openResults(); }, true]]); }
  }
}

function drawCut() {
  const t = cut.t;
  if (cut.type === 'unlock') {
    const m = cut.m; ctx.fillStyle = `rgba(3,4,14,${clamp(t / .5, 0, 1) * .88})`; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H * .5); ctx.rotate(t * .4); const L = Math.max(W, H);
    for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = rgba(m.color, clamp(t, 0, 1) * .14); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-50, -L); ctx.lineTo(50, -L); ctx.fill(); } ctx.restore();
    const u = Math.min(W, H) / 330;
    if (t > .3) text('CREWMATE FOUND', W / 2, H * .14, Math.min(54, W / 11), '#ffd23f');
    if (t < 1) { bean(ctx, W / 2, H * .62, '#000', { s: 3.2 * u, sil: true, t }); text('???', W / 2, H * .3, 70 * u, '#6ef3ff'); }
    else {
      const k = clamp((t - 1) / .6, 0, 1), s = easeBack(k) * 3.2 * u;
      const revealY = H * .62 - Math.sin(Math.min(1, (t - 1) / .6) * Math.PI) * 30 * u;
      if (m.id === 'm1') {
        if (!cut.harleyImage) { cut.harleyImage = new Image(); cut.harleyImage.src = '/images/harley2.jpg'; }
        if (cut.harleyImage.complete && cut.harleyImage.naturalWidth) ctx.drawImage(cut.harleyImage, W / 2 - 17 * s, revealY - 50 * s, 34 * s, 50 * s);
        else bean(ctx, W / 2, revealY, m.color, { s, t, mv: false });
      } else bean(ctx, W / 2, revealY, m.color, { s, t, mv: false });
      if (t < 1.25) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 1) / .25})`; ctx.fillRect(0, 0, W, H); }
      if (t > 1.4) { const k2 = clamp((t - 1.4) / .25, 0, 1), sc = 2.6 - 1.6 * k2; ctx.save(); ctx.translate(W / 2, H * .76); ctx.scale(sc, sc); ctx.globalAlpha = k2; text(m.name, 0, 0, Math.min(50, W / 10), m.color); text(`"${m.nickname}"`, 0, 36, Math.min(24, W / 22), '#fff', 'Fredoka'); text(m.role, 0, 66, Math.min(18, W / 26), '#ffd23f', 'Fredoka'); ctx.restore(); }
    }
    cut.parts.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); });
  } else if (cut.type === 'alarm') {
    const a = .18 + .22 * Math.abs(Math.sin(t * 6)); ctx.fillStyle = `rgba(255,20,40,${a})`; ctx.fillRect(0, 0, W, H);
    const k = clamp(t / .3, 0, 1), sc = 3 - 2 * k; ctx.save(); ctx.translate(W / 2 + rnd(-3, 3), H / 2 + rnd(-3, 3)); ctx.scale(sc, sc); ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(-W, -60, 2 * W, 120); text('EMERGENCY MEETING', 0, 16, Math.min(70, W / 9), '#ff3b4e'); ctx.restore();
  } else if (cut.type === 'eject') {
    const imp = crew(CFG.impostorId); drawSpace(t * 40);
    const k = clamp(t / 6, 0, 1), x = -100 + (W + 200) * k, y = H * .42 + Math.sin(t * 1.5) * 40;
    bean(ctx, x, y, imp.color, { s: Math.min(3.2, W / 260), r: t * 5, noShadow: true });
    const l1 = `${imp.name} was The Impostor.`, l2 = imp.ejectReason || '';
    if (t > 1.2) text(l1.slice(0, Math.floor((t - 1.2) * 28)), W / 2, H * .8, Math.min(40, W / 15), '#fff', 'Bungee');
    if (t > 3.6) text(l2.slice(0, Math.floor((t - 3.6) * 40)), W / 2, H * .87, Math.min(20, W / 28), '#ffd23f', 'Fredoka');
  }
}

/* ---------- 8. UI: HUD, toast, database, meeting, results ---------- */
let toastT, bannerT;
function toast(msg, bad) { const e = $('#toast'); e.textContent = msg; e.className = bad ? 'bad' : ''; clearTimeout(toastT); toastT = setTimeout(() => hide('#toast'), 3600); }
function harleyClueMarkup() { return '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px;text-align:center;font-size:14px"><figure style="margin:0"><img src="/images/harley3.jpg" alt="Chill Guys" style="display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px"><figcaption>Chill Guys</figcaption></figure><figure style="margin:0"><img src="/images/harley6.jpg" alt="nababaliw pag hindi nakakain" style="display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px"><figcaption>nababaliw pag hindi nakakain</figcaption></figure></div>'; }
function harleyClueToast() { const e = $('#toast'); e.innerHTML = `<b>Clue found in Electrical</b>${harleyClueMarkup()}`; e.className = ''; clearTimeout(toastT); toastT = setTimeout(() => hide('#toast'), 3600); }
function banner(a, b) { const e = $('#banner'); e.innerHTML = `<b>${a}</b><span>${b}</span>`; e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; show('#banner'); clearTimeout(bannerT); bannerT = setTimeout(() => hide('#banner'), 3500); }

function hud() {
  $('#tasklist').innerHTML = '<b>Tasks</b>' + CFG.tasks.map(t => { const d = S.tasks.includes(t.id), lock = t.unlocks == null && S.unlocked.length < 4; return `<div class="${d ? 'done' : lock ? 'lock' : ''}"><i></i><span>${t.title}</span><small>${t.room}</small></div>`; }).join('');
  const n = S.tasks.length, N = CFG.tasks.length; $('#prog i').style.width = n / N * 100 + '%'; $('#prog span').textContent = `Tasks ${n}/${N}`;
}

function openDb(sel) { show('#db'); setTab('crew'); renderDb(sel); route('/crew'); }
function setTab(t) { $$('.term nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); $('#dbCrew').classList.toggle('hidden', t !== 'crew'); $('#dbClues').classList.toggle('hidden', t !== 'clues'); }
function renderDb(sel) {
  $('#dbCount').textContent = `${S.unlocked.length}/4 crewmates found`;
  const box = $('#slots'); box.innerHTML = '';
  CFG.crew.forEach(m => {
    const u = S.unlocked.includes(m.id), d = document.createElement('div'); d.className = 'slot' + (u ? '' : ' locked') + (sel === m.id ? ' sel' : ''); d.style.setProperty('--c', m.color);
    d.appendChild(avCanvas(m.color, !u, 84)); d.insertAdjacentHTML('beforeend', `<b>${u ? m.name : '???'}</b><small>${u ? m.nickname : 'ACCESS DENIED'}</small>`);
    d.onclick = () => { Snd.click(); u ? renderDb(m.id) : toast(`Access denied. Complete "${CFG.tasks.find(t => t.id === m.taskId).title}" in ${CFG.tasks.find(t => t.id === m.taskId).room}.`, true); };
    box.appendChild(d);
  });
  const p = $('#profile'), m = sel && S.unlocked.includes(sel) ? crew(sel) : null;
  if (!m) { p.innerHTML = '<div class="denied">Select an unlocked crewmate to open their file.<br><small>Locked files unlock by completing tasks on the ship.</small></div>'; }
  else {
    const li = a => a.map(x => `<li>${x}</li>`).join(''), ch = a => a.map(x => `<span>${x}</span>`).join('');
    p.innerHTML = `<div class="pf" style="--c:${m.color}"><div class="pfTop"><div id="pfAv"></div><div><h3>${m.name}</h3><p class="nick">"${m.nickname}"</p><p class="role">${m.role}</p></div></div>
      <div><h4>Personality</h4><p>${m.personality}</p></div>
      <div class="pfGrid"><div><h4>Hobbies</h4><div class="chips">${ch(m.hobbies)}</div></div><div><h4>Skills</h4><div class="chips">${ch(m.skills)}</div></div></div>
      <div><h4>Stats</h4>${Object.entries(m.stats).map(([k, v]) => `<div class="bar"><span>${k}</span><b><i style="width:${v}%"></i></b></div>`).join('')}</div>
      <div class="pfGrid"><div><h4>Strengths</h4><ul>${li(m.strengths)}</ul></div><div><h4>Weaknesses</h4><ul>${li(m.weaknesses)}</ul></div>
      <div><h4>Random facts</h4><ul>${li(m.funFacts)}</ul></div>${m.id === 'm1' ? '<div><h4>Another fact about me</h4><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><figure style="margin:0"><img src="/images/harley5.jpg" alt="A cat giving a shaka sign" style="display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px"><figcaption>I am a nerd</figcaption></figure><figure style="margin:0"><img src="/images/harley4.jpg" alt="A cat wearing glasses" style="display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px"><figcaption>I am cool and flexible</figcaption></figure></div></div>' : `<div><h4>Inside jokes</h4><ul>${li(m.insideJokes)}</ul></div>`}</div>
      <div><h4>Special crew assignment</h4><p>${m.assignment}</p></div></div>`;
    if (m.id === 'm1') $('#pfAv').innerHTML = '<img src="/images/harley1.jpg" alt="Harley" style="display:block;width:150px;height:150px;object-fit:cover;border-radius:12px">';
    else $('#pfAv').appendChild(avCanvas(m.color, false, 150));
  }
  const harleyUnlocked = S.unlocked.includes('m1');
  const notebookClues = CFG.clues.filter(k => S.clues.includes(k.id) && !(harleyUnlocked && k.id === 'c2'));
  $('#dbClues').innerHTML = (harleyUnlocked ? harleyClueMarkup() : '')
    + (notebookClues.length ? notebookClues.map(k => `<div class="clue"><small>${k.room}</small><br>${k.text}</div>`).join('') + `<p>${S.clues.length}/${CFG.clues.length} clues found.</p>`
      : harleyUnlocked ? `<p>${S.clues.length}/${CFG.clues.length} clues found.</p>`
        : '<div class="denied">No clues yet. Look for glowing "?" spots on the ship.</div>');
}

function openMeeting() {
  show('#meeting'); $('#chat').innerHTML = ''; hide('#voteBox'); $('#vote').innerHTML = ''; $('#tally').innerHTML = '';
  const lines = CFG.crew.map(m => ({ m, t: m.meetingLine }));
  const found = CFG.clues.filter(k => S.clues.includes(k.id));
  lines.push({ m: null, t: found.length ? `Evidence on file (${found.length}/${CFG.clues.length}): ` + found.map(k => k.text).join(' ') : 'No evidence on file. You never searched the ship. Bold strategy.' });
  lines.forEach((l, i) => setTimeout(() => {
    if ($('#meeting').classList.contains('hidden')) return; Snd.click();
    const b = document.createElement('div'); b.className = 'bub' + (l.m ? '' : ' sys');
    if (l.m) b.appendChild(avCanvas(l.m.color, false, 48)); else b.appendChild(avCanvas('#6ef3ff', true, 48));
    b.insertAdjacentHTML('beforeend', `<div class="t"><b style="color:${l.m ? shade(l.m.color, -40) : '#6ef3ff'}">${l.m ? l.m.name : 'SHIP COMPUTER'}</b>${l.t}</div>`);
    $('#chat').appendChild(b); $('#chat').scrollTop = 9999;
    if (i === lines.length - 1) setTimeout(openVote, 900);
  }, 700 + i * 2100));
}
function openVote() {
  show('#voteBox'); const v = $('#vote'); v.innerHTML = '';
  CFG.crew.forEach(m => { const b = document.createElement('button'); b.appendChild(avCanvas(m.color, false, 60)); b.insertAdjacentHTML('beforeend', m.name); b.onclick = () => castVote(m.id); v.appendChild(b); });
  const s = document.createElement('button'); s.textContent = 'Skip vote'; s.onclick = () => castVote('skip'); v.appendChild(s);
}
function castVote(id) {
  S.voted = id; save(); Snd.vote(); $$('#vote button').forEach(b => b.disabled = true);
  const imp = CFG.impostorId, others = CFG.crew.filter(m => m.id !== imp);
  const rows = others.map(m => [m.name, crew(imp).name]); rows.push([crew(imp).name, others[0].name]); rows.push(['You', id === 'skip' ? 'Skip' : crew(id).name]);
  rows.forEach(([a, b], i) => setTimeout(() => { Snd.vote(); $('#tally').insertAdjacentHTML('beforeend', `<div>${a} voted for <b>${b}</b></div>`); }, 600 + i * 650));
  setTimeout(() => { hide('#meeting'); startEject(); }, 600 + rows.length * 650 + 900);
}

function openResults() {
  S.done = true; save(); show('#results'); route('/results');
  const imp = crew(CFG.impostorId), right = S.voted === imp.id, cl = S.clues.length;
  const rank = right && cl === CFG.clues.length ? 'Certified Space Detective' : right ? 'Sharp-Eyed Crewmate' : 'Suspiciously Trusting Recruit';
  $('#resBox').innerHTML = `<div class="res"><h2>MISSION COMPLETE</h2><div class="rank">${rank}</div>
    <div class="stats"><div><b>${S.tasks.length}/${CFG.tasks.length}</b>Tasks done</div><div><b>${S.unlocked.length}/4</b>Crew found</div><div><b>${cl}/${CFG.clues.length}</b>Clues found</div><div><b>${mmss(S.secs)}</b>Mission time</div></div>
    <p>${right ? 'You voted for the real Impostor. Nicely done.' : 'You missed the Impostor, but the crew had your back.'} The Impostor was <b>${imp.name}</b>. ${imp.ejectReason}</p>
    <div class="crewRow" id="rc"></div>
    <p>Thank you for flying with <b>${CFG.shipName}</b>. We are <b>${CFG.groupName}</b>, and that was our crew.</p>
    <div class="btns"><button class="btn big" id="rAgain">Play again</button><button class="btn" id="rDb">Crew Database</button><button class="btn" id="rMenu">Main menu</button></div></div>`;
  const rc = $('#rc'); CFG.crew.forEach(m => { const d = document.createElement('div'); d.style.setProperty('--c', m.color); d.appendChild(avCanvas(m.color, false, 84)); d.insertAdjacentHTML('beforeend', `<b>${m.name}</b><br><small>${m.role}</small>`); rc.appendChild(d); });
  $('#rAgain').onclick = () => { hide('#results'); play(true); };
  $('#rDb').onclick = () => { hide('#results'); openDb(); };
  $('#rMenu').onclick = () => { hide('#results'); toMenu(); };
}

/* ---------- 9. game flow, input ---------- */
function route(p) { try { if (location.pathname !== p) history.pushState({}, '', p); } catch (e) { /* ignore */ } }
function spawn() { P.x = 16.5 * T; P.y = 8.5 * T; snap = true; }
function toMenu() { mode = 'menu'; hide('#hud'); show('#menu'); route('/'); $('#bStart').textContent = S.started && !S.done ? 'Continue' : 'Start Game'; }
function play(isNew) {
  if (isNew) { S = fresh(); S.started = true; spawn(); }
  else if (S.px != null) { P.x = S.px; P.y = S.py; snap = true; }
  mode = 'play'; hide('#menu'); show('#hud'); hud(); S.started = true; save(); route('/play'); snap = true;
  if (S.done) { openResults(); return; }
  if (S.voted) { startEject(); return; }
  if (S.tasks.includes('nav')) { startAlarm(); return; }
  if (isNew) banner('WELCOME ABOARD!', 'Complete your tasks. Discover your crew. Find the impostor!');
}

const keys = new Set(), JV = { x: 0, y: 0 };
function nearest() {
  let best = null, bd = 72;
  CFG.tasks.forEach(t => { const d = dist(P, stn(t)); if (d < bd) { bd = d; best = { k: 't', t }; } });
  CFG.clues.forEach(k => { if (!S.clues.includes(k.id)) { const d = dist(P, { x: (k.tx + .5) * T, y: (k.ty + .5) * T }); if (d < bd) { bd = d; best = { k: 'c', c: k }; } } });
  return best;
}
function use() {
  if (mode !== 'play' || TK || cut || $('.ov:not(.hidden)')) return;
  const n = nearest(); if (!n) return;
  if (n.k === 'c') { S.clues.push(n.c.id); save(); Snd.ok(); if (n.c.id === 'c2' && S.unlocked.includes('m1')) harleyClueToast(); else toast(`Clue found in ${n.c.room}: ${n.c.text}`); return; }
  const t = n.t;
  if (S.tasks.includes(t.id)) toast('Task already completed.');
  else if (t.unlocks == null && S.unlocked.length < 4) { Snd.bad(); toast(`Console offline. Find all four crewmates first (${S.unlocked.length}/4).`, true); }
  else { Snd.click(); openTask(t); }
}

addEventListener('keydown', e => {
  const k = e.code; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault();
  keys.add(k);
  if (!e.repeat && (k === 'KeyE' || k === 'Space' || k === 'Enter')) use();
  if (k === 'KeyF') fs(); if (k === 'KeyM') mute();
  if (k === 'Escape') { if (TK && !TK.ok) closeTask(); else $$('.ov:not(.hidden)').forEach(o => { if (o.id === 'db' || o.id === 'how') { o.classList.add('hidden'); if (mode === 'menu') route('/'); } }); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const joy = $('#joy'), knob = $('#knob'); let jid = null;
function jm(e) { const r = joy.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const m = Math.hypot(dx, dy); if (m > R) { dx *= R / m; dy *= R / m; } JV.x = dx / R; JV.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; }
joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); jm(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === jid) jm(e); });
['pointerup', 'pointercancel'].forEach(ev => joy.addEventListener(ev, () => { jid = null; JV.x = JV.y = 0; knob.style.transform = ''; }));
$('#useBtn').addEventListener('pointerdown', e => { e.preventDefault(); use(); });

function fs() { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) { /* unsupported */ } }
function mute() { Snd.off = !Snd.off; $('#bSnd').textContent = Snd.off ? 'Muted' : 'Sound'; }

function bind() {
  $('#bStart').onclick = () => { Snd.click(); if (!document.fullscreenElement) fs(); const cont = S.started && !S.done; play(!cont); };
  $('#bDb').onclick = () => { Snd.click(); openDb(); };
  $('#bHow').onclick = () => { Snd.click(); show('#how'); };
  $('#bReset').onclick = () => { if (confirm('Reset all game progress?')) { S = fresh(); save(); $('#bStart').textContent = 'Start Game'; toast('Progress reset.'); } };
  $('#bNotes').onclick = () => openDb(); $('#bSnd').onclick = mute; $('#bFs').onclick = fs; $('#bMenu').onclick = toMenu;
  $('#tClose').onclick = () => { if (TK && !TK.ok) closeTask(); };
  $$('[data-close]').forEach(b => b.onclick = () => { hide(b.dataset.close); if (mode === 'menu') route('/'); else if (mode === 'play') route('/play'); });
  $$('.term nav button').forEach(b => b.onclick = () => { Snd.click(); setTab(b.dataset.tab); });
  addEventListener('resize', resize);
}
function resize() {
  dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
  zoom = clamp(Math.min(W / 900, H / 620), .8, 1.5);
}

/* ---------- 10. main loop ---------- */
let stepT = 0, promptTxt = '';
function update(dt) {
  if (mode !== 'play') return;
  const busy = TK || cut || $('.ov:not(.hidden)');
  if (!busy || TK) S.secs += dt;
  if ((saveT += dt) > 4) { saveT = 0; S.px = P.x; S.py = P.y; save(); }
  let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + JV.x;
  let iy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + JV.y;
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  P.mv = !busy && m > .2;
  if (P.mv) {
    const sp = 235 * dt, nx = P.x + ix * sp, ny = P.y + iy * sp;
    if (!blocked(nx, P.y)) P.x = nx; if (!blocked(P.x, ny)) P.y = ny;
    if (Math.abs(ix) > .15) P.f = ix > 0 ? 1 : -1;
    P.t += dt; if ((stepT -= dt) < 0) { stepT = .26; Snd.step(); }
  } else P.t += dt * .3;
  const n = !busy && nearest(), txt = n ? (n.k === 'c' ? 'Press E: Investigate' : 'Press E: ' + n.t.title) : '';
  if (txt !== promptTxt) { promptTxt = txt; $('#prompt').textContent = txt; $('#prompt').classList.toggle('hidden', !txt); }
  if (cut) updateCut(dt);
}
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (mode === 'menu') { drawSpace(); drawMenuBeans(); }
  else {
    if (cut && cut.type === 'alarm') ctx.translate(rnd(-4, 4), rnd(-4, 4));
    drawWorld(); if (cut) drawCut();
  }
  if (TK) { TK.draw(Math.min(.05, 1 / 60)); if (TK.ok) drawTaskDone(); }
  avs.forEach((a, i) => {
    if (!document.body.contains(a.e)) { avs.splice(i, 1); return; }
    const c = a.e.getContext('2d'); c.clearRect(0, 0, a.e.width, a.e.height); bean(c, a.e.width / 2, a.e.height * .9, a.color, { s: a.e.width / 70, t: gt, sil: a.sil });
  });
}
function frame(ts) { const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; gt += dt; update(dt); render(); requestAnimationFrame(frame); }

/* ---------- boot: fetch the crew data from Spring, then start ---------- */
fetch('/api/config').then(r => r.json()).then(cfg => {
  CFG = cfg; S = load(); buildStatic(); resize(); bind(); hud();
  $('#bStart').textContent = S.started && !S.done ? 'Continue' : 'Start Game';
  const scr = document.body.dataset.screen;
  if (scr === 'play') play(!S.started);
  else if (scr === 'crew') openDb();
  else if (scr === 'results') { if (S.done) { mode = 'play'; hide('#menu'); show('#hud'); openResults(); } }
  requestAnimationFrame(frame);
}).catch(() => { document.querySelector('.tag').textContent = 'Could not reach the Spring server. Start it with: mvn spring-boot:run'; });
})();
