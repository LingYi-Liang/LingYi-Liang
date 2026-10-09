// The OC who strolls through the merged-PR cards, frame by frame, beneath the card text.
// Frames live in assets/oc/*.webp (drawn sprite frames, transparent, 260x360 canvas with the feet at y=340);
// each card embeds only the frames it uses, once each — mirrored poses reuse them through <use>.
// Drawn frames switch with step-end; position and jumps are interpolated by the browser at display rate.
//
// The cards are separate images, so the journey is one global timeline: card i shows her only during
// its own window, entering from behind its left edge and leaving behind its right edge.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { C, f, esc, textWidth, sparkle } from './theme.mjs';

// Her full height (~205 units) fills the card; the sprite box keeps the 260x360 canvas aspect.
const SPRITE_H = 230, SPRITE_W = (SPRITE_H * 260) / 360, FEET = (SPRITE_H * 340) / 360;
const PX = SPRITE_W / 260; // canvas px -> card units
const WALK = Array.from({ length: 8 }, (_, i) => `walk-${i + 1}`);
const JOG = Array.from({ length: 6 }, (_, i) => `run-${i + 1}`);
// Speeds come from the drawn strides (planted foot travel per cycle, measured on the frames) so feet don't skate.
const WALK_CYCLE = 0.76, WALK_SPEED = (360 * PX) / WALK_CYCLE;
const JOG_CYCLE = 0.5, JOG_SPEED = (470 * PX) / JOG_CYCLE;
const TURN_STEP = 0.085; // seconds per drawn turning frame
const GAP = 0.35; // time spent between two cards, unseen
const MARGIN = SPRITE_W / 2 + 6; // fully hidden past the card edge

// ───────────── one card's act, in local time ─────────────

class Act {
  constructor(width) {
    this.w = width;
    this.t = 0;
    this.x = -MARGIN;
    this.dir = 1; // 1 faces right, -1 faces left
    this.frames = []; // [t, name, mirrored]
    this.xs = [[0, -MARGIN]];
    this.lifts = [[0, 0]];
    this.bubbles = [];
    this.sparks = [];
    this.says = []; // [t0, t1, key]
  }
  show(name, dur, mirrored = this.dir < 0) {
    this.frames.push([this.t, name, mirrored]);
    this.t += dur;
    this.xs.push([this.t, this.x]);
  }
  seq(names, dur, mirrored) {
    for (const n of names) this.show(n, dur, mirrored);
  }
  // Walk (or jog) to x1 at the speed that matches the drawn stride.
  move(x1, { frames = WALK, cycle = WALK_CYCLE, speed = WALK_SPEED, back = false } = {}) {
    const dx = x1 - this.x, dur = Math.abs(dx) / speed;
    const n = Math.max(1, Math.round(dur / (cycle / frames.length)));
    const seq = back ? [...frames].reverse() : frames;
    const t0 = this.t, x0 = this.x;
    for (let i = 0; i < n; i++) this.frames.push([t0 + (i * dur) / n, seq[i % seq.length], this.dir < 0]);
    this.t = t0 + dur;
    this.x = x1;
    this.xs.push([t0, x0], [this.t, x1]);
  }
  walkTo(x) { this.move(x); }
  jogTo(x) { this.move(x, { frames: JOG, cycle: JOG_CYCLE, speed: JOG_SPEED }); }
  backTo(x) { this.move(x, { speed: WALK_SPEED * 0.75, cycle: WALK_CYCLE / 0.75, back: true }); }
  lift(t, y) { this.lifts.push([t, y]); }
  // A natural turn: the head leads, the body follows with a step, hair swings after (drawn frames turn-1..5).
  toFront() {
    const m = this.dir < 0;
    this.seq(['turn-1', 'turn-2', 'turn-3', 'turn-4'], TURN_STEP, m);
    this.show('turn-5', 0.12, false);
  }
  toSide(dir) {
    this.dir = dir;
    this.seq(['turn-4', 'turn-3', 'turn-2', 'turn-1'], TURN_STEP, dir < 0);
  }
  turnAround() {
    const to = -this.dir;
    this.toFront();
    this.toSide(to);
  }
  wave(key, beats = 7) {
    const t0 = this.t;
    for (let i = 0; i < beats; i++) this.show(['front-1', 'front-2', 'front-1', 'front-3'][i % 4], 0.15, false);
    this.show('front-1', 0.2, false);
    this.says.push([t0 + 0.05, this.t, key]);
    this.show('turn-5', 0.35, false);
    this.show('turn-6', 0.12, false); // blink
    this.show('turn-5', 0.2, false);
  }
  readTitle() {
    this.show('turn-1', 0.25);
    this.show('turn-7', 1.0, false); // looks up at the PR title above her
    this.show('turn-4', 0.22, false); // nods: glance down to you…
    this.show('turn-7', 0.26, false); // …back up…
    this.show('turn-4', 0.22, false); // …and down again
    this.show('turn-5', 0.14, false);
    this.show('turn-8', 1.1, false); // thumbs-up to you
    this.show('turn-5', 0.25, false);
  }
  blow() {
    this.seq(['turn-1', 'turn-2', 'turn-3', 'turn-4'], TURN_STEP);
    this.show('front-7', 0.45, false);
    for (let k = 0; k < 2; k++) {
      const t0 = this.t;
      this.show('front-8', 0.8, false);
      for (let i = 0; i < 3; i++) this.bubbles.push({ t: t0 + 0.12 + i * 0.24, x: this.x + 34, y: -150, i: this.bubbles.length });
      if (k === 0) this.show('front-7', 0.3, false);
    }
    this.show('run-7', 1.0, false); // delighted, watching them float
    this.dir = 1;
    this.seq(['turn-4', 'turn-3', 'turn-2', 'turn-1'], TURN_STEP);
  }
  jump(h) {
    this.show('front-4', 0.22, false);
    const t0 = this.t, d = 0.5;
    this.frames.push([t0, 'front-5', false]);
    this.lift(t0, 0);
    this.lift(t0 + d / 2, -h);
    this.lift(t0 + d, 0);
    this.t = t0 + d;
    this.xs.push([this.t, this.x]);
    for (const [dt, sx, sy, r] of [[0.15, -60, -150, 8], [0.22, 58, -170, 10], [0.3, 70, -100, 7], [0.36, -66, -90, 6]])
      this.sparks.push({ t: t0 + dt, x: this.x + sx, y: sy, r });
    this.show('front-6', 0.24, false);
    this.show('turn-5', 0.2, false);
  }
  twirl() {
    const t0 = this.t;
    for (let i = 1; i <= 8; i++) this.show(`twirl-${i}`, i === 8 ? 0.5 : 0.1, false);
    for (const [dt, sx, sy, r] of [[0.2, -64, -60, 7], [0.35, 62, -90, 8], [0.5, -56, -150, 6], [0.6, 60, -160, 7]])
      this.sparks.push({ t: t0 + dt, x: this.x + sx, y: sy, r });
    this.show('turn-5', 0.15, false);
  }
}

// What she does in each card, in order. The first card says hi, the last one says bye.
const SCRIPTS = {
  hi(a) {
    a.walkTo(a.w / 2);
    a.toFront();
    a.wave('hi');
    a.toSide(1);
    a.walkTo(a.w + MARGIN);
  },
  readTurn(a) {
    a.walkTo(a.w * 0.36);
    a.readTitle(); // reads the title, nods, thumbs-up
    a.toSide(-1); // turns away…
    a.backTo(a.w * 0.66); // …and walks on backwards
    a.turnAround();
    a.walkTo(a.w + MARGIN);
  },
  bubbles(a) {
    a.walkTo(a.w * 0.4);
    a.blow();
    a.jogTo(a.w + MARGIN);
  },
  jump(a) {
    a.jogTo(a.w * 0.5);
    a.toFront();
    a.jump(6); // the air frame is already drawn off the ground
    a.twirl();
    a.toSide(1);
    a.walkTo(a.w + MARGIN);
  },
  bye(a) {
    a.walkTo(a.w / 2);
    a.toFront();
    a.wave('bye', 9);
    a.toSide(1);
    a.walkTo(a.w + MARGIN);
  },
  stroll(a) {
    a.walkTo(a.w * 0.5);
    a.toFront();
    a.show('run-8', 1.2, false); // reads a little book
    a.toSide(1);
    a.walkTo(a.w + MARGIN);
  },
};

function plan(n) {
  if (n <= 0) return [];
  if (n === 1) return ['hi'];
  const middle = ['readTurn', 'bubbles', 'jump'];
  const order = ['hi'];
  for (let i = 0; i < n - 2; i++) order.push(i < middle.length ? middle[i] : 'stroll');
  return [...order, 'bye'];
}

// ───────────── rendering ─────────────

const ALL_FRAMES = [
  ...WALK, ...Array.from({ length: 8 }, (_, i) => `run-${i + 1}`), ...Array.from({ length: 8 }, (_, i) => `turn-${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `front-${i + 1}`), ...Array.from({ length: 8 }, (_, i) => `twirl-${i + 1}`),
];
let frameCache;
function frameData(root) {
  if (frameCache) return frameCache;
  frameCache = {};
  for (const name of ALL_FRAMES) {
    const p = join(root, 'assets', 'oc', `${name}.webp`);
    if (existsSync(p)) frameCache[name] = 'data:image/webp;base64,' + readFileSync(p).toString('base64');
  }
  return frameCache;
}

const pct = (t, T) => +((Math.max(0, Math.min(t, T)) / T) * 100).toFixed(3) + '%';

// Visibility keyframes for a set of [start, end) windows, switched with step-end.
function windows(name, spans, T) {
  let k = `@keyframes ${name}{0%{opacity:0}`;
  for (const [a, b] of spans) k += `${pct(a, T)}{opacity:1}${pct(b, T)}{opacity:0}`;
  return k + '100%{opacity:0}}';
}

function track(name, stops, T, fmt) {
  const seen = new Map();
  for (const [t, v] of [...stops].sort((a, b) => a[0] - b[0])) seen.set(pct(t, T), fmt(v));
  if (!seen.has('0%')) seen.set('0%', fmt(stops[0][1]));
  return `@keyframes ${name}{${[...seen].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([p, v]) => `${p}{${v}}`).join('')}}`;
}

// Build the whole journey once; returns a renderer for each card.
export function ocJourney(root, cardCount, { cardWidth, ground, says }) {
  const names = plan(cardCount);
  const acts = names.map((n) => {
    const a = new Act(cardWidth);
    SCRIPTS[n](a);
    return a;
  });
  const starts = [];
  let t = 0;
  for (const a of acts) starts.push(t), (t += a.t + GAP);
  const T = t + 0.8; // a beat offstage before the loop
  const data = frameData(root);
  const ready = Object.keys(data).length > 0;

  const render = (i) => {
    if (!ready || i >= acts.length) return { defs: '', css: '', body: '' };
    const a = acts[i], s = starts[i], id = `oc${i}`;
    const used = new Map(); // `${name}|${mirrored}` -> spans
    a.frames.forEach(([ft, name, m], k) => {
      const end = k + 1 < a.frames.length ? a.frames[k + 1][0] : a.t;
      const key = `${name}|${m ? 1 : 0}`;
      if (!used.has(key)) used.set(key, []);
      used.get(key).push([s + ft, s + end]);
    });
    const frameNames = [...new Set([...used.keys()].map((k) => k.split('|')[0]))].filter((n) => data[n]);
    const defs = frameNames
      .map((n) => `<image id="${id}-${n}" href="${data[n]}" x="${f(-SPRITE_W / 2)}" y="${f(-FEET)}" width="${f(SPRITE_W)}" height="${f(SPRITE_H)}"/>`)
      .join('');
    let css = '', uses = '';
    [...used].forEach(([key, spans], j) => {
      const [n, m] = key.split('|');
      if (!data[n]) return;
      css += windows(`${id}f${j}`, spans, T);
      uses += `<use href="#${id}-${n}"${m === '1' ? ' transform="scale(-1 1)"' : ''} style="animation:${id}f${j} ${f(T)}s step-end infinite;opacity:0"/>`;
    });
    css += track(`${id}x`, a.xs.map(([tt, v]) => [s + tt, v]).concat([[0, -MARGIN], [T, a.w + MARGIN]]), T, (v) => `transform:translateX(${f(v)}px)`);
    css += track(`${id}y`, a.lifts.map(([tt, v]) => [s + tt, v]).concat([[0, 0], [T, 0]]), T, (v) => `transform:translateY(${f(v)}px)`);
    css += windows(`${id}v`, [[s, s + a.t]], T);

    const sayEls = a.says.map(([t0, t1, key], k) => {
      const text = says[key];
      const w = 18 + textWidth(text, 14);
      css += windows(`${id}s${k}`, [[s + t0, s + t1]], T);
      return `<g style="animation:${id}s${k} ${f(T)}s step-end infinite;opacity:0">
        <rect x="38" y="-206" width="${f(w)}" height="24" rx="12" fill="url(#say)"/>
        <path d="M44 -183.5 L38 -174 L51 -182.5 Z" fill="${C.cerulean}"/>
        <text x="${f(38 + w / 2)}" y="-189.5" text-anchor="middle" class="sans" font-size="14" font-weight="600" fill="#fff">${esc(text)}</text></g>`;
    }).join('');

    const bubbles = a.bubbles.map((b) => {
      const life = 2.2, wob = b.i % 2 ? 9 : -9, r = 6 + (b.i % 3) * 2, bt = s + b.t;
      const at = (dt, dx, dy, sc, op) => [bt + dt, `opacity:${op};transform:translate(${f(b.x + dx)}px,${f(b.y + dy)}px) scale(${sc})`];
      const stops = [[0, `opacity:0;transform:translate(${f(b.x)}px,${b.y}px) scale(.2)`], at(-0.01, 0, 0, 0.2, 0), at(0, 0, 0, 0.3, 1),
        at(0.35, 14, -10, 1, 1), at(1.1, 30 + wob, -40, 1, 1), at(life - 0.2, 42 - wob, -64, 1.05, 0.9), at(life, 43 - wob, -66, 1.5, 0),
        [T, `opacity:0;transform:translate(${f(b.x)}px,${b.y}px) scale(.2)`]];
      css += `@keyframes ${id}b${b.i}{${stops.map(([tt, v]) => `${pct(tt, T)}{${v}}`).join('')}}`;
      return `<g style="animation:${id}b${b.i} ${f(T)}s ease-out infinite;opacity:0"><circle r="${r}" fill="#e6f4ff" fill-opacity=".22" stroke="#cfe6ff" stroke-width="1.2"/><path d="M${f(-r * 0.55)} ${f(-r * 0.2)} A${f(r * 0.6)} ${f(r * 0.6)} 0 0 1 ${f(-r * 0.1)} ${f(-r * 0.6)}" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/></g>`;
    }).join('');

    const sparks = a.sparks.map((sp, k) => {
      const st = s + sp.t;
      css += `@keyframes ${id}k${k}{0%,${pct(st - 0.01, T)}{opacity:0;transform:scale(.2)}${pct(st + 0.15, T)}{opacity:1;transform:scale(1)}${pct(st + 0.55, T)}{opacity:0;transform:scale(.3)}100%{opacity:0;transform:scale(.2)}}`;
      return `<g style="animation:${id}k${k} ${f(T)}s ease-out infinite;transform-origin:${f(sp.x)}px ${f(sp.y)}px;opacity:0"><path d="${sparkle(sp.x, sp.y, sp.r, 0.14)}" fill="#fff"/></g>`;
    }).join('');

    const body = `<g transform="translate(0 ${ground})">
      <g style="animation:${id}x ${f(T)}s linear infinite">
        <g style="animation:${id}v ${f(T)}s step-end infinite;opacity:0"><ellipse cx="0" cy="0" rx="34" ry="5" fill="#020718" opacity=".35"/></g>
        <g style="animation:${id}y ${f(T)}s ease-in-out infinite">${uses}${sayEls}</g>
      </g>
      ${bubbles}
      ${sparks}
    </g>`;
    return {
      defs: `${defs}<linearGradient id="say" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cerulean}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient>`,
      css,
      body,
    };
  };
  render.loop = T;
  render.windows = acts.map((a, i) => [names[i], +starts[i].toFixed(2), +(starts[i] + a.t).toFixed(2)]);
  return render;
}
