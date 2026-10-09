// Shared palette + SVG helpers for the observatory art.
// Azure sky (青空) with deep-blue and violet ink-wash (墨染) accents.

export const LANGS = ['en', 'zh'];

export const C = {
  abyss: '#040b22',
  deep: '#0a1f52',
  cobalt: '#1650a8',
  cerulean: '#2a7fd4',
  azure: '#4fb3ff',
  sky: '#a8dcff',
  haze: '#e4f5ff',
  inkBlue: '#050c2a',
  inkPurple: '#2c1a5e',
  violet: '#7c5cff',
  lilac: '#b9a8ff',
  merged: '#a98bff',
  review: '#5cc4ff',
  text: '#f1f8ff',
  textDim: '#bcd5f2',
  textFaint: '#7f9cc6',
  label: '#93ccff',
  ink: '#030a1e', // silhouettes
  mid: '#6b80dc', // readable on both GitHub light and dark backgrounds
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

export function wrap(s, maxW, size, maxLines = 3) {
  const words = s.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (textWidth(next, size) <= maxW || !cur) cur = next;
    else lines.push(cur), (cur = w);
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + ' …';
  }
  return lines;
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

// Ink-wash: turbulence-displaced, blurred blobs.
export const inkFilter = (id, { freq = 0.011, scale = 70, blur = 9, seed = 3 } = {}) =>
  `<filter id="${id}" x="-30%" y="-40%" width="160%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${blur}"/></filter>`;

// Deep-blue glass panel with violet ink in the corners, shared by cards and data panels.
export function panel(id, w, h, { rx = 20, seed = 5, ink = true } = {}) {
  return {
    defs: `<linearGradient id="${id}Bg" x1="0" y1="0" x2=".35" y2="1">
      <stop offset="0" stop-color="#071433"/><stop offset=".6" stop-color="#0b1f52"/><stop offset="1" stop-color="#132a6c"/></linearGradient>
      <radialGradient id="${id}Hi" cx=".25" cy="0" r=".9"><stop offset="0" stop-color="${C.azure}" stop-opacity=".16"/><stop offset="1" stop-color="${C.azure}" stop-opacity="0"/></radialGradient>
      ${inkFilter(id + 'Ink', { seed, scale: 60, blur: 10 })}
      <clipPath id="${id}Clip"><rect width="${w}" height="${h}" rx="${rx}"/></clipPath>`,
    bg: `<rect width="${w}" height="${h}" rx="${rx}" fill="url(#${id}Bg)"/>
      <rect width="${w}" height="${h}" fill="url(#${id}Hi)"/>
      ${ink ? `<g filter="url(#${id}Ink)">
        <ellipse cx="${f(w * 0.92)}" cy="${f(h * 0.95)}" rx="${f(Math.min(380, w * 0.4))}" ry="${f(Math.min(150, h * 0.45))}" fill="#3a2478" opacity=".55"/>
        <ellipse cx="${f(w * 0.05)}" cy="${f(h * 0.02)}" rx="${f(Math.min(300, w * 0.3))}" ry="${f(Math.min(110, h * 0.35))}" fill="${C.inkBlue}" opacity=".7"/>
      </g>` : ''}`,
    border: `<rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="${rx - 0.5}" fill="none" stroke="${C.sky}" stroke-opacity=".2" stroke-width="1.5"/>`,
  };
}

export const svgOpen = (w, h, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;

export const clean = (s) => s.replace(/\n\s+/g, '\n');

export const numGrad = `<linearGradient id="num" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${C.sky}"/></linearGradient>
  <linearGradient id="numM" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${C.lilac}"/></linearGradient>`;

// Big number + small caps label + caption.
export function stat(x, y, value, label, sub, grad = 'num') {
  return `<text x="${f(x)}" y="${y}" class="serif" font-size="46" fill="url(#${grad})">${esc(value)}</text>
    <text x="${f(x)}" y="${y + 24}" class="mono" font-size="11.5" letter-spacing="2.2" fill="${C.label}">${esc(label)}</text>
    <text x="${f(x)}" y="${y + 42}" class="sans" font-size="13" fill="${C.textFaint}">${esc(sub)}</text>`;
}
