// The hero plate: role, name, one umbrella line and the organisations that merged the work, over a painted
// night sky, with the Z30 emblem and the OC stargazing on the painted hill.
// Time 0 is a complete still, and prefers-reduced-motion shows exactly that still.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  C, FONT_CSS, rng, esc, f, mix, textWidth, fit, pentagram, z30Point, sparkle, starfield, glowFilter, svgOpen,
} from './theme.mjs';
import { IDENTITY, OC, SKY, tr } from './content.mjs';

const W = 1200, H = 300;
const EMBLEM = { x: 1000, y: 104, r: 56 };
// OC sprite: 260x360 canvas with the feet at 340/360. Box 100 units tall.
const OC_H = 100, OC_W = (OC_H * 260) / 360, OC_FEET = (OC_H * 340) / 360;
const HOME = 860, AWAY = 1130;
const TEXT_END = HOME - OC_W / 2 - 22; // text never reaches the stargazer
const LOOP = 32;
const WALK_FRAMES = Array.from({ length: 8 }, (_, i) => `walk-${i + 1}`);
const WALK_CYCLE = 0.76, WALK_SPEED = (360 * (OC_W / 260)) / WALK_CYCLE; // matches the drawn stride
const TURN = 0.085;

// Painted skies (tools/art): 4:1 bands cut from Codex paintings. `ground` is the grass line measured on the
// band at HOME and at AWAY, so the stargazer walks on the painted hill; `trail` is the angle of the painted
// star trails, which the meteor follows.
export const SKIES = {
  galaxy: { file: 'assets/art/sky-galaxy.webp', ground: [281, 255], trail: 24 },
  azure: { file: 'assets/art/sky-azure.webp', ground: [278, 271], trail: 25 },
};

const pct = (t, T) => +((Math.max(0, Math.min(t, T)) / T) * 100).toFixed(3) + '%';

// The highlighted tile A = {0,6,12,18,24} steps to its next translate (12°) every 4 s; together they tile Z_30.
function hopKeyframes() {
  const T = 24, move = 0.7;
  let k = '@keyframes hop{';
  for (let i = 0; i < 6; i++)
    k += `${pct(i * 4, T)}{transform:rotate(${12 * i}deg)}${pct((i + 1) * 4 - move, T)}{transform:rotate(${12 * i}deg)}`;
  return k + '100%{transform:rotate(72deg)}}';
}

function emblem() {
  const { r } = EMBLEM;
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const a = ((i * 6 - 90) * Math.PI) / 180, long = i % 5 === 0;
    const r1 = r + 14, r2 = r + (long ? 26 : 19);
    ticks += `<line x1="${f(r1 * Math.cos(a))}" y1="${f(r1 * Math.sin(a))}" x2="${f(r2 * Math.cos(a))}" y2="${f(r2 * Math.sin(a))}"/>`;
  }
  let s = `<circle r="${r + 14}" fill="none" stroke="#fff" stroke-opacity=".22"/>
    <g stroke="#fff" stroke-opacity=".36" style="animation:spin 240s linear infinite">${ticks}</g>
    <circle r="${r + 40}" fill="none" stroke="#fff" stroke-opacity=".1" stroke-dasharray="2 7"/>
    <circle r="${r}" fill="none" stroke="#fff" stroke-opacity=".14"/>`;
  for (let t = 0; t < 6; t++)
    s += `<path d="${pentagram(t, r)}" fill="none" stroke="${mix(C.sky, C.lilac, t / 5)}" stroke-opacity=".42" stroke-width="1" stroke-linejoin="round"/>`;
  for (let k = 0; k < 30; k++) {
    const [x, y] = z30Point(k, r);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="1.3" fill="#fff" opacity=".85"/>`;
  }
  let tile = `<path d="${pentagram(0, r)}" fill="#fff" fill-opacity=".04" stroke="#fff" stroke-opacity=".8" stroke-width="1.1" stroke-linejoin="round"/>`;
  for (let j = 0; j < 5; j++) {
    const [x, y] = z30Point(6 * j, r);
    tile += `<circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#fff"/>`;
  }
  return `<g transform="translate(${EMBLEM.x} ${EMBLEM.y})">${s}<g filter="url(#glow)" style="animation:hop 24s ease-in-out infinite">${tile}</g></g>`;
}

// ── the OC's 32 s loop: frame windows plus an x track relative to HOME ──
function ocTimeline() {
  const frames = []; // [t, name, mirrored]
  const xs = [[0, 0]];
  let t = 0, x = 0;
  const show = (name, dur, m) => { frames.push([t, name, m]); t += dur; xs.push([t, x]); };
  const seq = (names, m) => names.forEach((n) => show(n, TURN, m));
  const walk = (to, m) => {
    const dur = Math.abs(to - x) / WALK_SPEED, step = WALK_CYCLE / WALK_FRAMES.length, n = Math.max(1, Math.round(dur / step));
    const t0 = t, x0 = x;
    for (let i = 0; i < n; i++) frames.push([t0 + (i * dur) / n, WALK_FRAMES[i % 8], m]);
    t += dur; x = to;
    xs.push([t0, x0], [t, x]);
  };
  const D = AWAY - HOME;
  show('turn-7', 10, false); // stargazing; the emblem is up to her right
  show('turn-4', 0.3, false); // a glance at you
  show('turn-5', 0.4, false);
  show('turn-6', 0.12, false); // blink
  show('turn-5', 0.4, false);
  seq(['turn-4', 'turn-3', 'turn-2', 'turn-1'], false); // turns right
  walk(D, false); // strolls under the constellation
  seq(['turn-1', 'turn-2', 'turn-3', 'turn-4'], true);
  show('turn-5', 0.12, false);
  show('turn-7', 2.6, true); // looks back up; the emblem is now on her left
  seq(['turn-4', 'turn-3', 'turn-2', 'turn-1'], true); // turns left
  walk(0, true);
  seq(['turn-1', 'turn-2', 'turn-3', 'turn-4'], false);
  show('turn-5', 0.12, false);
  // The loop ends on at least a second of the rest pose, so the wrap back to t=0 is invisible.
  if (t > LOOP - 1) throw new Error(`stargazer timeline runs ${f(t)} s, too long for the ${LOOP} s loop`);
  show('turn-7', LOOP - t, false); // stargazing until the loop ends
  return { frames, xs };
}

function frameData(root, names) {
  const out = {}, missing = [];
  for (const n of names) {
    const p = join(root, 'assets', 'oc', 'hero', `${n}.webp`);
    if (existsSync(p)) out[n] = 'data:image/webp;base64,' + readFileSync(p).toString('base64');
    else missing.push(n);
  }
  if (missing.length) throw new Error(`missing stargazer frames: ${missing.join(', ')}`);
  return out;
}

function oc(root, sky) {
  if (OC.mode === 'off') return { defs: '', css: '', body: '' };
  const [g0, g1] = sky.ground;
  const lift = (x) => f(((g1 - g0) * x) / (AWAY - HOME)); // painted hill height at HOME + x, relative to HOME
  const img = (n, src) => `<image id="oc-${n}" href="${src}" x="${f(-OC_W / 2)}" y="${f(-OC_FEET)}" width="${f(OC_W)}" height="${f(OC_H)}"/>`;
  const shadow = `<ellipse cx="0" cy="1" rx="22" ry="3.4" fill="#020718" opacity=".45"/>`;
  if (OC.mode === 'still') {
    const data = frameData(root, ['turn-7']);
    return { defs: img('turn-7', data['turn-7']), css: '', body: `<g transform="translate(${HOME} ${g0})">${shadow}<use href="#oc-turn-7"/></g>` };
  }

  const { frames, xs } = ocTimeline();
  const data = frameData(root, [...new Set(frames.map(([, n]) => n))]);
  const used = new Map();
  frames.forEach(([t, n, m], k) => {
    const end = k + 1 < frames.length ? frames[k + 1][0] : LOOP;
    const key = `${n}|${m ? 1 : 0}`;
    if (!used.has(key)) used.set(key, []);
    used.get(key).push([t, end]);
  });
  let css = '', uses = '';
  [...used].forEach(([key, spans], j) => {
    const [n, m] = key.split('|');
    let k = `@keyframes f${j}{0%{opacity:0}`;
    for (const [a, b] of spans) k += `${pct(a, LOOP)}{opacity:1}${pct(b, LOOP)}{opacity:0}`;
    css += k + '100%{opacity:0}}';
    // The rest pose (t=0, and under reduced motion) carries no inline opacity, so a renderer that ignores
    // CSS animation still shows her; every other frame starts hidden.
    const rest = n === 'turn-7' && m === '0';
    uses += `<use href="#oc-${n}"${m === '1' ? ' transform="scale(-1 1)"' : ''}${rest ? ' class="rest"' : ''} style="animation:f${j} ${LOOP}s step-end infinite${rest ? '' : ';opacity:0'}"/>`;
  });
  const seen = new Map();
  for (const [t, v] of [...xs].sort((a, b) => a[0] - b[0])) seen.set(pct(t, LOOP), `transform:translate(${f(v)}px,${lift(v)}px)`);
  css += `@keyframes ocx{${[...seen].map(([p, v]) => `${p}{${v}}`).join('')}100%{transform:translate(0px,0px)}}`;
  return {
    defs: Object.entries(data).map(([n, src]) => img(n, src)).join(''),
    css,
    body: `<g transform="translate(${HOME} ${g0})"><g style="animation:ocx ${LOOP}s linear infinite">${shadow}${uses}</g></g>`,
  };
}

// brands: hero labels of the organisations whose repositories merged the work (already checked).
export function heroSvg(root, lang, { brands, alt, sky = SKIES[SKY] }) {
  const T = (v) => tr(v, lang);
  const rand = rng(301);
  const zh = lang === 'zh';
  const role = zh ? T(IDENTITY.role) : T(IDENTITY.role).toUpperCase();
  const kicker = zh ? '代码合并进' : 'MERGED UPSTREAM';
  const kickerW = textWidth(kicker, 12.5) + (zh ? 1.5 : 2.8) * [...kicker].length;
  const brandLine = fit(brands.join('  ·  '), TEXT_END - 64 - kickerW - 16, 19);
  const nameW = textWidth(IDENTITY.name, 84) * 0.92;

  const skyFile = join(root, sky.file);
  if (!existsSync(skyFile)) throw new Error(`missing sky painting ${sky.file}`);
  const painting = 'data:image/webp;base64,' + readFileSync(skyFile).toString('base64');
  // A meteor along the painted trails, fading out well before the text.
  const th = (sky.trail * Math.PI) / 180, mx = Math.cos(th), my = Math.sin(th);
  const m0 = [400, 16], m1 = [400 + 250 * mx, 16 + 250 * my];
  const o = oc(root, sky);

  return `${svgOpen(W, H, alt)}
  <defs>
    <linearGradient id="veil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#020818" stop-opacity=".66"/><stop offset=".4" stop-color="#020818" stop-opacity=".4"/><stop offset=".68" stop-color="#020818" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="${C.haze}"/><stop offset="1" stop-color="${C.sky}"/></linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="met" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(-130 * mx)}" y2="${f(-130 * my)}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${C.sky}" stop-opacity="0"/></linearGradient>
    ${glowFilter('glow', 2.2)}
    ${glowFilter('soft', 5)}
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    ${o.defs}
    <style>${FONT_CSS}
      ${hopKeyframes()}
      ${o.css}
      @keyframes meteor{0%{transform:translate(${m0[0]}px,${m0[1]}px);opacity:0}2%{opacity:1}10%{transform:translate(${f(m1[0])}px,${f(m1[1])}px);opacity:0}100%{transform:translate(${f(m1[0])}px,${f(m1[1])}px);opacity:0}}
      .meteor{opacity:0;animation:meteor 9s ease-out 3s infinite}
      @media (prefers-reduced-motion: reduce){*{animation:none!important}.rest{opacity:1!important}.meteor{opacity:0!important}}
    </style>
  </defs>
  <g clip-path="url(#frame)">
    <image href="${painting}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${W}" height="${H}" fill="url(#veil)"/>
    ${starfield(rand, { x: 0, y: 0, w: W, h: 230, n: 46, maxR: 1.2, twinkle: 0.6, skip: (x, y) => (x < TEXT_END && y > 40) || Math.hypot(x - EMBLEM.x, y - EMBLEM.y) < EMBLEM.r + 28 })}
    <g class="meteor"><line x1="0" y1="0" x2="${f(-130 * mx)}" y2="${f(-130 * my)}" stroke="url(#met)" stroke-width="1.5" stroke-linecap="round"/><circle r="1.5" fill="#fff"/></g>
    ${emblem()}
    ${o.body}
    <text x="64" y="66" class="sans" font-size="14" letter-spacing="${zh ? 2 : 3.2}" fill="#9CC4F0">${esc(role)}</text>
    <text x="60" y="142" class="serif" font-size="84" fill="url(#nameGrad)" filter="url(#soft)">${esc(IDENTITY.name)}</text>
    <path d="${sparkle(64 + nameW + 18, 86, 9)}" fill="#fff" class="tw" style="animation-duration:3.6s"/>
    <text x="64" y="184" class="sans" font-size="23" fill="#D4E3F7">${esc(fit(T(IDENTITY.line), TEXT_END - 64, 23))}</text>
    <rect x="64" y="206" width="${f(Math.min(470, TEXT_END - 64))}" height="1" fill="url(#rule)"/>
    <text x="64" y="241" class="sans" font-size="12.5" letter-spacing="${zh ? 1.5 : 2.8}" fill="#9CC4F0">${esc(kicker)}</text>
    <text x="${f(64 + kickerW + 16)}" y="241.5" class="sans" font-size="19" font-weight="600" fill="#FFFFFF">${esc(brandLine)}</text>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="none" stroke="#fff" stroke-opacity=".1"/>
</svg>`;
}
