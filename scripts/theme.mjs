// Shared palette + SVG helpers for the observatory art.
// Azure sky (青空) with deep-blue and violet ink-wash (墨染) accents.
import { readFileSync } from 'node:fs';

export const LANGS = ['en', 'zh'];

export const C = {
  azure: '#4fb3ff',
  sky: '#a8dcff',
  haze: '#e4f5ff',
  violet: '#7c5cff',
  lilac: '#b9a8ff',
  review: '#5cc4ff',
  text: '#f1f8ff',
  textDim: '#bcd5f2',
  textFaint: '#7f9cc6',
  label: '#93ccff',
};

export const FONT_CSS = `
.sans{font-family:'Segoe UI','Helvetica Neue',-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans','Microsoft YaHei',sans-serif}
.serif{font-family:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,'Songti SC','SimSun',serif}
.mono{font-family:'Cascadia Mono','SF Mono',Menlo,Consolas,'Liberation Mono','Microsoft YaHei',monospace}
.tw{animation:tw 4s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.22}50%{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(3.2)}}
`;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const f = (n) => +n.toFixed(2);

export function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const isWide = (ch) => ch.codePointAt(0) > 0x2e80;

// Rough rendered width, good enough for layout decisions.
export function textWidth(s, size, mono = false) {
  let w = 0;
  for (const ch of s) {
    if (isWide(ch)) w += 1;
    else if (mono) w += 0.6;
    else if (ch === ' ') w += 0.28;
    else if (/[A-Z]/.test(ch)) w += 0.64;
    else if (/[mwMW]/.test(ch)) w += 0.78;
    else if (/[iljtf.,:;'|!()[\]]/.test(ch)) w += 0.3;
    else w += 0.53;
  }
  return w * size;
}

export function fit(s, maxW, size, mono = false) {
  if (textWidth(s, size, mono) <= maxW) return s;
  let t = s;
  while (t.length > 1 && textWidth(t + '…', size, mono) > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

// Random starfield; a fraction of stars twinkle with their own period and phase.
export function starfield(rand, { x = 0, y = 0, w, h, n, maxR = 1.5, twinkle = 0.35, tint = 0.25, skip } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const cx = x + rand() * w;
    const cy = y + rand() * h;
    const r = 0.35 + Math.pow(rand(), 2.4) * maxR;
    const op = 0.3 + rand() * 0.6;
    const tw = rand() < twinkle;
    const dur = 2.5 + rand() * 4.5;
    const delay = -rand() * 7;
    const fill = rand() < tint ? C.sky : '#fff';
    if (skip && skip(cx, cy)) continue;
    s += tw
      ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" class="tw" style="animation-duration:${f(dur)}s;animation-delay:${f(delay)}s"/>`
      : `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" opacity="${f(op)}"/>`;
  }
  return s;
}

// Four-point sparkle (the anime "kira" star).
export function sparkle(cx, cy, r, k = 0.12) {
  const q = r * k;
  return `M${f(cx)} ${f(cy - r)}Q${f(cx + q)} ${f(cy - q)} ${f(cx + r)} ${f(cy)}Q${f(cx + q)} ${f(cy + q)} ${f(cx)} ${f(cy + r)}Q${f(cx - q)} ${f(cy + q)} ${f(cx - r)} ${f(cy)}Q${f(cx - q)} ${f(cy - q)} ${f(cx)} ${f(cy - r)}Z`;
}

// Pentagram through the coset t + <6> of Z_30, drawn on a circle of radius R at the origin.
// The six cosets are translates of one tile A = {0,6,12,18,24}; together they tile Z_30.
export function z30Point(k, R) {
  const a = ((-90 + 12 * k) * Math.PI) / 180;
  return [R * Math.cos(a), R * Math.sin(a)];
}
export function pentagram(t, R) {
  const ks = [t, t + 12, t + 24, t + 6, t + 18];
  return 'M' + ks.map((k) => z30Point(k, R).map(f).join(' ')).join('L') + 'Z';
}

export const glowFilter = (id, sd = 3) =>
  `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// Panels sit on a darkened slice of the hero's painted sky (assets/art, see tools/art), so the page reads as
// one night sky. `flip` mirrors it, so neighbouring panels don't repeat the same clouds.
const PANEL_SKY = 'data:image/webp;base64,' + readFileSync(new URL('../assets/art/panel-sky.webp', import.meta.url)).toString('base64');
export function panel(id, w, h, { rx = 20, flip = false } = {}) {
  return {
    defs: `<clipPath id="${id}Clip"><rect width="${w}" height="${h}" rx="${rx}"/></clipPath>`,
    bg: `<rect width="${w}" height="${h}" fill="#050c26"/>
      <image href="${PANEL_SKY}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${flip ? ` transform="translate(${w} 0) scale(-1 1)"` : ''}/>`,
    border: `<rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="${rx - 0.5}" fill="none" stroke="${C.sky}" stroke-opacity=".2" stroke-width="1.5"/>`,
  };
}

export const svgOpen = (w, h, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;

export const clean = (s) => s.replace(/\n\s+/g, '\n');
