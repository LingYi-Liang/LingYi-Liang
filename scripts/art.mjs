// Static art for the profile, in English and Chinese:
//   assets/{en,zh}/  header, footer, dividers     assets/lang/  the EN | 中文 switch
// Content lives in scripts/content.mjs; after editing it run:  node scripts/art.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LANGS, C, FONT_CSS, rng, esc, f, mix, textWidth, wrap, starfield, sparkle, pentagram, z30Point,
  glowFilter, inkFilter, panel, svgOpen, clean,
} from './theme.mjs';
import { HEADER, DIVIDERS, FOOTER, tr } from './content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p, s) => {
  const fp = join(ROOT, 'assets', p);
  mkdirSync(dirname(fp), { recursive: true });
  writeFileSync(fp, clean(s));
  console.log('wrote assets/' + p);
};
// ───────────────────────── ART ─────────────────────────


// Tile A = {0,6,12,18,24} hopping through its six translates A+t; together they tile Z_30.
function hopKeyframes(name) {
  let k = `@keyframes ${name}{`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 100, b = ((i + 1) / 6) * 100 - 5;
    k += `${f(a)}%{transform:rotate(${12 * i}deg)}${f(b)}%{transform:rotate(${12 * i}deg)}`;
  }
  return k + '100%{transform:rotate(72deg)}}';
}

function z30Figure(R, { ticks = true, glowId = 'glow', dur = 10.8, tint = true } = {}) {
  const big = R > 90;
  let s = '';
  if (ticks) {
    let t = '';
    for (let i = 0; i < 60; i++) {
      const a = ((i * 6 - 90) * Math.PI) / 180, long = i % 5 === 0;
      const r1 = R + 15, r2 = R + (long ? 27 : 20);
      t += `<line x1="${f(r1 * Math.cos(a))}" y1="${f(r1 * Math.sin(a))}" x2="${f(r2 * Math.cos(a))}" y2="${f(r2 * Math.sin(a))}"/>`;
    }
    s += `<circle r="${R + 15}" fill="none" stroke="#fff" stroke-opacity=".22"/>
      <g stroke="#fff" stroke-opacity=".38" style="animation:spin 240s linear infinite">${t}</g>
      <circle r="${R + 44}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-dasharray="2 7"/>`;
  }
  s += `<circle r="${R}" fill="none" stroke="#fff" stroke-opacity=".14"/>`;
  for (let t = 0; t < 6; t++) {
    const h = tint ? mix(C.sky, C.lilac, t / 5) : '#ffffff';
    s += `<path d="${pentagram(t, R)}" fill="none" stroke="${h}" stroke-opacity=".42" stroke-width="1" stroke-linejoin="round"/>`;
  }
  for (let k = 0; k < 30; k++) {
    const [x, y] = z30Point(k, R);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${big ? 1.8 : 1.3}" fill="#fff" opacity=".85"/>`;
  }
  let hi = `<path d="${pentagram(0, R)}" fill="#fff" fill-opacity=".06" stroke="#fff" stroke-width="${big ? 2 : 1.5}" stroke-linejoin="round"/>`;
  for (let j = 0; j < 5; j++) {
    const [x, y] = z30Point(6 * j, R);
    hi += `<circle cx="${f(x)}" cy="${f(y)}" r="${big ? 3.6 : 2.5}" fill="#fff"/>`;
  }
  return s + `<g filter="url(#${glowId})" style="animation:hop ${dur}s ease-in-out infinite">${hi}</g>`;
}

// Back-view silhouette: a girl pointing at the sky beside a small telescope. Feet at the origin.
const OBSERVER = `
  <path d="M-3.5 -16 L-3.1 0 L-1.5 0 L-1.2 -16 Z M1.2 -16 L1.5 0 L3.1 0 L3.5 -16 Z"/>
  <path d="M-4.4 0.2 h4 v-1.6 h-3 Z M0.4 0.2 h4 l-1 -1.6 h-3 Z"/>
  <path d="M-6.4 -44 Q-6.4 -49 -2.6 -49.8 L2.6 -49.8 Q6.4 -49 6.4 -44 L5.2 -32 L10 -15.5 Q0 -12.6 -10 -15.5 L-5.2 -32 Z"/>
  <circle cx="0" cy="-58" r="6.6"/>
  <path d="M-6.2 -61.5 C-8.8 -55 -9 -45 -8.6 -38 Q-6.4 -35 -4.2 -37.2 Q-2.2 -34.4 0 -36.4 Q2.2 -34.4 4.2 -37.2 Q6.4 -35 8.6 -38 C9 -45 8.8 -55 6.2 -61.5 Z"/>
  <path d="M-0.6 -64.2 Q0.6 -70.6 5.4 -70.4 Q2 -69.2 0.8 -64.4 Z"/>
  <g style="transform-origin:8px -50px;animation:sway 4.2s ease-in-out infinite">
    <path d="M7.6 -52 Q12.6 -50.6 16.4 -52.6 Q13 -48.8 8 -48.6 Z"/>
    <path d="M8.4 -44 Q12.4 -42.2 15.2 -43.8 Q12.4 -40.4 8.6 -40.6 Z"/>
  </g>
  <path d="M-6.8 -47 Q-10.4 -55 -13.6 -65" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="-13.9" cy="-65.8" r="1.7"/>
  <g stroke="${C.ink}" stroke-linecap="round" fill="none">
    <path d="M-27 -18 L-33.5 0 M-27 -18 L-27 0 M-27 -18 L-20.5 0" stroke-width="1.3"/>
    <path d="M-25.4 -20.4 L-33.2 -41.2" stroke-width="3.4"/>
    <path d="M-33.6 -42.4 L-34.2 -44" stroke-width="4.4"/>
    <path d="M-24.6 -19 L-23.4 -15.8" stroke-width="1.6"/>
  </g>`;

function header(lang) {
  const W = 1200, H = 460, rand = rng(101);
  const FX = 905, FY = 180, R = 108;
  const T = (v) => tr(v, lang);

  // Star trails, laid out in screen space then rotated into the trail direction.
  const ROT = -13, rad = (-ROT * Math.PI) / 180, cx = 600, cy = 230;
  let trails = '';
  for (let i = 0; i < 150; i++) {
    const sx = -40 + rand() * 1280, sy = -10 + rand() * 390;
    const len = 6 + Math.pow(rand(), 1.7) * 84;
    const w = 0.5 + rand() * 1.15;
    const g = rand() < 0.14 ? 'trL' : rand() < 0.5 ? 'trS' : 'trW';
    const op = 0.22 + rand() * 0.65;
    const move = rand() < 0.38;
    const dur = 7 + rand() * 9, delay = -rand() * 14;
    if (sx < 640 && sy > 70 && sy < 375 && rand() < 0.6) continue; // keep the text calm
    const lx = cx + (sx - cx) * Math.cos(rad) - (sy - cy) * Math.sin(rad);
    const ly = cy + (sx - cx) * Math.sin(rad) + (sy - cy) * Math.cos(rad);
    trails += `<rect x="${f(lx)}" y="${f(ly)}" width="${f(len)}" height="${f(w)}" rx="${f(w / 2)}" fill="url(#${g})" fill-opacity="${f(op)}"${
      move ? ` class="dr" style="animation-duration:${f(dur)}s;animation-delay:${f(delay)}s"` : ''}/>`;
  }
  let sparkles = '';
  for (let i = 0; i < 9; i++) {
    const x = 40 + rand() * 1120, y = 24 + rand() * 330;
    if ((x > 760 && x < 1060 && y < 330) || (x < 640 && y > 80 && y < 370)) continue;
    sparkles += `<path d="${sparkle(x, y, 3.5 + rand() * 5)}" fill="${rand() < 0.5 ? '#fff' : C.sky}" class="tw" style="animation-duration:${f(3 + rand() * 3)}s;animation-delay:${f(-rand() * 5)}s"/>`;
  }

  const labelW = textWidth(T(HEADER.nowLabel), 12.5, true) + 2.5 * [...T(HEADER.nowLabel)].length;
  const trailGrad = (id, c) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".85" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="#fff"/></linearGradient>`;

  const svg = `${svgOpen(W, H, `${HEADER.name} — ${HEADER.roles.map(T).join(' · ')}`)}
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#030a20"/><stop offset=".3" stop-color="#08204f"/><stop offset=".55" stop-color="#12489a"/>
      <stop offset=".75" stop-color="#2a7fd4"/><stop offset=".88" stop-color="#63b6f0"/><stop offset=".96" stop-color="#b8e3ff"/><stop offset="1" stop-color="${C.haze}"/>
    </linearGradient>
    <radialGradient id="horizon"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="${C.haze}"/><stop offset="1" stop-color="${C.sky}"/></linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="met" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-140" y2="-34"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${C.sky}" stop-opacity="0"/></linearGradient>
    ${trailGrad('trW', '#ffffff')}${trailGrad('trS', C.sky)}${trailGrad('trL', C.lilac)}
    ${glowFilter('glow', 3)}
    ${glowFilter('soft', 7)}
    ${inkFilter('ink', { freq: 0.009, scale: 95, blur: 12, seed: 8 })}
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <style>${FONT_CSS}
      ${hopKeyframes('hop')}
      @keyframes dr{0%{transform:translateX(-50px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateX(70px);opacity:0}}
      .dr{animation:dr 10s linear infinite}
      @keyframes meteor{0%{transform:translate(520px,40px);opacity:0}2%{opacity:1}10%{transform:translate(760px,98px);opacity:0}100%{transform:translate(760px,98px);opacity:0}}
      .meteor{opacity:0;animation:meteor 8s ease-out 2s infinite}
      @keyframes sway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(7deg)}}
    </style>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <ellipse cx="740" cy="470" rx="820" ry="150" fill="url(#horizon)"/>
    <g filter="url(#ink)">
      <ellipse cx="150" cy="0" rx="430" ry="135" fill="${C.inkBlue}" opacity=".9"/>
      <ellipse cx="1070" cy="6" rx="340" ry="125" fill="#2a1760" opacity=".82"/>
      <ellipse cx="1190" cy="140" rx="170" ry="95" fill="#5134a8" opacity=".42"/>
      <ellipse cx="640" cy="262" rx="440" ry="28" fill="#3d2a86" opacity=".3" transform="rotate(-8 640 262)"/>
      <ellipse cx="40" cy="330" rx="230" ry="70" fill="#0a1a4c" opacity=".45"/>
    </g>
    <g transform="rotate(${ROT} ${cx} ${cy})">${trails}</g>
    ${starfield(rand, { w: W, h: 380, n: 110, maxR: 1.4, twinkle: 0.4 })}
    ${sparkles}
    <g class="meteor"><line x1="0" y1="0" x2="-140" y2="-34" stroke="url(#met)" stroke-width="1.6" stroke-linecap="round"/><circle r="1.6" fill="#fff"/></g>

    <g transform="translate(${FX} ${FY})">${z30Figure(R)}</g>
    <text x="1046" y="90" class="serif" font-size="21" font-style="italic" fill="#fff">A ⊕ T = ℤ₃₀</text>
    <text x="1047" y="110" class="mono" font-size="10.5" letter-spacing="2" fill="${C.sky}">${esc(T(HEADER.note))}</text>

    <text x="80" y="106" class="mono" font-size="13" letter-spacing="4" fill="${C.sky}">${esc(T(HEADER.label))}</text>
    <text x="74" y="192" class="serif" font-size="96" fill="url(#nameGrad)" filter="url(#soft)">${esc(HEADER.name)}</text>
    <path d="${sparkle(372, 124, 11)}" fill="#fff" class="tw" style="animation-duration:3.4s"/>
    <path d="${sparkle(390, 147, 5)}" fill="${C.sky}" class="tw" style="animation-duration:2.6s;animation-delay:-1s"/>
    ${HEADER.roles.map((r, i) => `
      <text x="80" y="${248 + i * 40}" class="serif" font-size="15" font-style="italic" fill="${C.sky}">${i ? 'II' : 'I'}</text>
      <text x="112" y="${248 + i * 40}" class="sans" font-size="25" fill="#fff">${esc(T(r))}</text>`).join('')}
    <rect x="80" y="314" width="330" height="1" fill="url(#rule)"/>
    <circle cx="86" cy="345" r="4" fill="#fff"/>
    <circle cx="86" cy="345" r="4" fill="none" stroke="#fff" stroke-width="1.5" style="transform-origin:86px 345px;animation:pulse 2.4s ease-out infinite"/>
    <text x="100" y="350" class="mono" font-size="12.5" letter-spacing="2.5" fill="${C.haze}">${esc(T(HEADER.nowLabel))}</text>
    <text x="${f(100 + labelW + 12)}" y="350.5" class="sans" font-size="17.5" fill="#fff">${esc(T(HEADER.now))}</text>

    <path d="M0 412 C140 396 300 408 460 400 C620 392 760 406 900 398 C1000 392 1110 402 1200 394 V${H} H0 Z" fill="#1b4c94" opacity=".55"/>
    <path d="M0 432 C220 420 430 438 650 430 C840 423 940 414 1040 420 C1110 424 1160 426 1200 422 V${H} H0 Z" fill="${C.ink}"/>
    <g transform="translate(1030 421) scale(1.22)" fill="${C.ink}">${OBSERVER}</g>
  </g>
</svg>`;
  out(`${lang}/header.svg`, svg);
}

// Transparent section title: readable on both GitHub light and dark themes.
function divider(key, text, lang) {
  const W = 1200, H = 64;
  const half = (textWidth(text, 16, true) + 4 * [...text].length) / 2;
  const sl = 600 - half - 22, sr = 600 + half + 18;
  const svg = `${svgOpen(W, H, text)}
  <defs>
    <linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cerulean}" stop-opacity="0"/><stop offset="1" stop-color="${C.cerulean}" stop-opacity=".75"/></linearGradient>
    <linearGradient id="r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.violet}" stop-opacity=".75"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></linearGradient>
    <style>${FONT_CSS}</style>
  </defs>
  <rect x="${f(sl - 290)}" y="31.5" width="270" height="1.2" fill="url(#l)"/>
  <rect x="${f(sr + 20)}" y="31.5" width="270" height="1.2" fill="url(#r)"/>
  <path d="${sparkle(sl, 32, 7, 0.16)}" fill="${C.cerulean}"/>
  <path d="${sparkle(sr, 32, 7, 0.16)}" fill="${C.violet}"/>
  <text x="600" y="38" text-anchor="middle" class="mono" font-size="16" letter-spacing="4" fill="${C.mid}">${esc(text)}</text>
</svg>`;
  out(`${lang}/dividers/${key}.svg`, svg);
}

function footer(lang) {
  const W = 1200, H = 190, rand = rng(5);
  const T = (v) => tr(v, lang);
  const svg = `${svgOpen(W, H, T(FOOTER.line))}
  <defs>
    <linearGradient id="fSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#061433"/><stop offset=".5" stop-color="#143f8f"/><stop offset=".82" stop-color="#3f8fd8"/><stop offset="1" stop-color="#b8e3ff"/></linearGradient>
    <radialGradient id="moonGlow"><stop offset="0" stop-color="${C.haze}" stop-opacity=".5"/><stop offset="1" stop-color="${C.haze}" stop-opacity="0"/></radialGradient>
    <mask id="crescent"><circle cx="300" cy="66" r="30" fill="#fff"/><circle cx="314" cy="57" r="27" fill="#000"/></mask>
    ${inkFilter('ink', { freq: 0.01, scale: 70, blur: 10, seed: 2 })}
    <clipPath id="fClip"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <style>${FONT_CSS}@keyframes tail{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}</style>
  </defs>
  <g clip-path="url(#fClip)">
    <rect width="${W}" height="${H}" fill="url(#fSky)"/>
    <g filter="url(#ink)">
      <ellipse cx="1060" cy="10" rx="300" ry="70" fill="#2a1760" opacity=".7"/>
      <ellipse cx="120" cy="0" rx="300" ry="60" fill="${C.inkBlue}" opacity=".7"/>
    </g>
    ${starfield(rand, { w: W, h: 140, n: 90, maxR: 1.3, twinkle: 0.45 })}
    <circle cx="300" cy="66" r="70" fill="url(#moonGlow)"/>
    <rect width="${W}" height="${H}" fill="#f2f9ff" mask="url(#crescent)"/>
    <text x="640" y="88" text-anchor="middle" class="${lang === 'zh' ? 'sans' : 'serif'}" font-size="30" font-style="${lang === 'zh' ? 'normal' : 'italic'}" fill="#fff">${esc(T(FOOTER.line))}</text>
    <text x="640" y="118" text-anchor="middle" class="mono" font-size="13.5" letter-spacing="1.5" fill="${C.haze}">${esc(T(FOOTER.sub))}</text>
    <g fill="${C.ink}">
      <path d="M0 168 C200 150 380 172 600 162 C820 152 1000 170 1200 158 V${H} H0 Z"/>
      <ellipse cx="380" cy="150" rx="9" ry="11"/>
      <circle cx="380" cy="135" r="7.5"/>
      <path d="M373.6 132 L374.6 122.6 L379 129 Z M381 129 L385.4 122.6 L386.4 132 Z"/>
      <path d="M387 158 q 15 0 12 -15" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" style="transform-origin:387px 158px;animation:tail 3.6s ease-in-out infinite"/>
    </g>
  </g>
</svg>`;
  out(`${lang}/footer.svg`, svg);
}

// EN | 中文 segmented switch, one image per segment so each can carry its own link.
function langSwitch() {
  const H = 30, r = 15;
  const seg = (text, w, side, on) => {
    const d = side === 'left'
      ? `M${r} .75 H${w} V${H - 0.75} H${r} A${r - 0.75} ${r - 0.75} 0 0 1 ${r} .75 Z`
      : `M0 .75 H${w - r} A${r - 0.75} ${r - 0.75} 0 0 1 ${w - r} ${H - 0.75} H0 Z`;
    return `${svgOpen(w, H, text)}
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cerulean}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient><style>${FONT_CSS}</style></defs>
    <path d="${d}" fill="${on ? 'url(#g)' : 'none'}" stroke="${on ? 'none' : C.mid}" stroke-width="1.5"/>
    <text x="${w / 2 + (side === 'left' ? 3 : -3)}" y="19.5" text-anchor="middle" class="sans" font-size="13" font-weight="600" fill="${on ? '#fff' : C.mid}">${text}</text>
  </svg>`;
  };
  out('lang/en-on.svg', seg('EN', 58, 'left', true));
  out('lang/en-off.svg', seg('EN', 58, 'left', false));
  out('lang/zh-on.svg', seg('中文', 64, 'right', true));
  out('lang/zh-off.svg', seg('中文', 64, 'right', false));
}

for (const lang of LANGS) {
  header(lang);
  Object.entries(DIVIDERS).forEach(([k, t]) => divider(k, tr(t, lang), lang));
  footer(lang);
}
langSwitch();
