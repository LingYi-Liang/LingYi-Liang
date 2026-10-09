// Research universe. Ring I (mathematics) and ring II (your projects) come from content.mjs;
// ring III is one planet per upstream project your pull requests went to.
import { C, FONT_CSS, rng, esc, f, mix, textWidth, starfield, sparkle, glowFilter, inkFilter, svgOpen } from './theme.mjs';
import { RING_MATH, RING_PROJECTS, UNIVERSE_TEXT as U, tr } from './content.mjs';

const knockout = `paint-order:stroke;stroke:#0a1a46;stroke-width:5px;stroke-linejoin:round`;

const SPHERES = {
  L: ['#ffffff', C.lilac, '#6d55d8', '#2a1a6e'], // mathematics
  A: ['#ffffff', C.sky, C.cerulean, '#0d2a6b'], // my projects
  M: ['#ffffff', '#cbb8ff', C.violet, '#2c1670'], // merged PR
  R: ['#ffffff', '#bfe8ff', C.azure, '#0f3a80'], // PR in review
};
const sphereDefs = Object.entries(SPHERES)
  .map(([k, [a, b, c, d]]) => `<radialGradient id="sph${k}" cx=".35" cy=".32" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".25" stop-color="${b}"/><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient>`)
  .join('');

// Label placement around an ellipse: sides get side labels, top and bottom get centred ones.
// Only the outer ring sits near the canvas edge, so only it centres labels at its far left/right.
function place(a, r, outer) {
  const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
  const edge = outer && Math.abs(c) > 0.88;
  if (s < -0.85 || (edge && s < 0)) return { anchor: 'middle', dx: 0, dy: -r - 26, subDy: 16 };
  if (s > 0.85 || edge) return { anchor: 'middle', dx: 0, dy: r + 19, subDy: 16 };
  return { anchor: c > 0 ? 'start' : 'end', dx: (c > 0 ? 1 : -1) * (r + 10), dy: s < 0 ? -5 : 9, subDy: 16 };
}

// upstream: [{ repo, stars, prs, merged }]
export function universeSvg(lang, upstream) {
  const W = 1200, H = 640, CX = 600, CY = 340, rand = rng(23);
  const T = (v) => tr(v, lang);

  const ring3 = [...upstream]
    .sort((a, b) => b.stars - a.stars)
    .map((u, i, all) => ({
      label: u.repo.split('/')[1],
      sub: U.prs[lang](u.prs, u.merged),
      a: -90 + (i * 360) / all.length,
      kind: u.merged ? 'merged' : 'review',
      r: 4.5 + 1.25 * Math.log10(Math.max(u.stars, 10)),
    }));
  const rings = [
    { ...RING_MATH, color: C.lilac, rx: 170, ry: 64, sphere: 'L' },
    { ...RING_PROJECTS, color: C.azure, rx: 330, ry: 128, sphere: 'A' },
    { name: U.ring3, note: U.ring3Note, color: '#d6ecff', rx: 480, ry: 200, planets: ring3 },
  ];
  const pos = (ring, a) => {
    const t = (a * Math.PI) / 180;
    return [CX + ring.rx * Math.cos(t), CY + ring.ry * Math.sin(t)];
  };
  const ellipsePath = (r) => `M${CX - r.rx} ${CY}a${r.rx} ${r.ry} 0 1 1 ${2 * r.rx} 0a${r.rx} ${r.ry} 0 1 1 ${-2 * r.rx} 0`;

  let orbits = '', planets = '', labels = '';
  rings.forEach((ring, ri) => {
    const dur = [38, 64, 96][ri];
    orbits += `<path d="${ellipsePath(ring)}" fill="none" stroke="${ring.color}" stroke-opacity=".32" stroke-width="1.2"/>
      <path d="${ellipsePath(ring)}" fill="none" stroke="${ring.color}" stroke-opacity=".7" stroke-width="1.6" stroke-dasharray="1 14" stroke-linecap="round" style="animation:flow ${dur}s linear infinite"/>
      <circle r="2.6" fill="${ring.color}" filter="url(#glow)"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${ellipsePath(ring)}"/></circle>`;
    ring.planets.forEach((p) => {
      const [x, y] = pos(ring, p.a);
      const r = p.r || (p.kind === 'uncharted' ? 6.5 : 8);
      if (p.kind === 'uncharted') {
        planets += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="#0a1a46" stroke="${ring.color}" stroke-width="1.4" stroke-dasharray="2.2 2.6" opacity=".85"/>
          <circle cx="${f(x)}" cy="${f(y)}" r="1.4" fill="${ring.color}" class="tw" style="animation-duration:2.8s"/>`;
      } else {
        const sph = p.kind === 'merged' ? 'M' : p.kind === 'review' ? 'R' : ring.sphere;
        planets += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 2.2)}" fill="url(#halo${sph})"/>
          <circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#sph${sph})"/>`;
        if (p.kind === 'merged' || p.kind === 'own')
          planets += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 1.9)}" ry="${f(r * 0.55)}" fill="none" stroke="${p.kind === 'merged' ? '#e2d8ff' : '#d8f0ff'}" stroke-opacity=".85" stroke-width="1.3" transform="rotate(-18 ${f(x)} ${f(y)})"/>`;
        if (p.kind === 'merged') planets += `<path d="${sparkle(x + r * 0.9, y - r * 0.9, 5, 0.16)}" fill="#fff" class="tw" style="animation-duration:3s"/>`;
      }
      const L = place(p.a, r, ri === 2);
      const lx = x + L.dx, ly = y + L.dy;
      const faint = p.kind === 'uncharted';
      labels += `<text x="${f(lx)}" y="${f(ly)}" text-anchor="${L.anchor}" class="sans" font-size="${faint ? 14 : 15.5}" font-style="${faint ? 'italic' : 'normal'}" fill="${faint ? C.textFaint : C.text}" style="${knockout}">${esc(T(p.label))}</text>`;
      if (p.sub)
        labels += `<text x="${f(lx)}" y="${f(ly + L.subDy)}" text-anchor="${L.anchor}" class="mono" font-size="11" fill="${faint ? C.textFaint : p.kind === 'merged' ? C.lilac : mix(ring.color, '#ffffff', 0.3)}" style="${knockout}">${esc(T(p.sub))}</text>`;
    });
  });

  const legend = rings.map((ring, i) => {
    const y = 46 + i * 24;
    return `<circle cx="44" cy="${y - 5}" r="4.5" fill="${ring.color}"/>
      <text x="58" y="${y}" class="sans" font-size="14.5" fill="${C.text}">${esc(T(ring.name))}<tspan fill="${C.textFaint}" font-style="italic"> — ${esc(T(ring.note))}</tspan></text>`;
  }).join('');
  const kx = 1164;
  const keyRow = (i, label, icon) => {
    const y = 46 + i * 24, ix = kx - textWidth(T(label), 11.5, true) - 18;
    return `<text x="${kx}" y="${y}">${esc(T(label))}</text>${icon(f(ix), y - 4)}`;
  };
  const key = `<g text-anchor="end" class="mono" font-size="11.5" fill="${C.textDim}">
    ${keyRow(0, U.keyMerged, (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#sphM)"/><ellipse cx="${x}" cy="${y}" rx="10" ry="3" fill="none" stroke="#e2d8ff" transform="rotate(-18 ${x} ${y})"/>`)}
    ${keyRow(1, U.keyReview, (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#sphR)"/>`)}
    ${keyRow(2, U.keyOwn, (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#sphA)"/><ellipse cx="${x}" cy="${y}" rx="10" ry="3" fill="none" stroke="#d8f0ff" transform="rotate(-18 ${x} ${y})"/>`)}
    ${keyRow(3, U.keyUncharted, (x, y) => `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${C.lilac}" stroke-dasharray="2 2.4"/>`)}
  </g>`;

  return `${svgOpen(W, H, T({ en: 'Research universe: mathematics, my projects, and the projects my pull requests went to', zh: '研究宇宙：数学、我的项目、我提交 PR 的上游项目' }))}
  <defs>
    <linearGradient id="uBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#040b22"/><stop offset=".55" stop-color="#0a1f52"/><stop offset="1" stop-color="#143a82"/></linearGradient>
    <radialGradient id="core"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".12" stop-color="${C.sky}" stop-opacity=".7"/><stop offset=".45" stop-color="${C.cerulean}" stop-opacity=".22"/><stop offset="1" stop-color="${C.cerulean}" stop-opacity="0"/></radialGradient>
    <radialGradient id="band"><stop offset="0" stop-color="${C.cerulean}" stop-opacity=".26"/><stop offset="1" stop-color="${C.cerulean}" stop-opacity="0"/></radialGradient>
    ${sphereDefs}
    ${Object.entries(SPHERES).map(([k, v]) => `<radialGradient id="halo${k}"><stop offset="0" stop-color="${v[2]}" stop-opacity=".45"/><stop offset="1" stop-color="${v[2]}" stop-opacity="0"/></radialGradient>`).join('')}
    ${glowFilter('glow', 3)}
    ${inkFilter('ink', { freq: 0.008, scale: 90, blur: 14, seed: 4 })}
    <clipPath id="uClip"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <style>${FONT_CSS}
      @keyframes flow{to{stroke-dashoffset:-300}}
      @keyframes breathe{0%,100%{opacity:.85}50%{opacity:1}}
    </style>
  </defs>
  <g clip-path="url(#uClip)">
    <rect width="${W}" height="${H}" fill="url(#uBg)"/>
    <g filter="url(#ink)">
      <ellipse cx="1120" cy="40" rx="320" ry="120" fill="#2a1760" opacity=".75"/>
      <ellipse cx="80" cy="620" rx="340" ry="110" fill="#3a2478" opacity=".5"/>
      <ellipse cx="60" cy="20" rx="300" ry="90" fill="${C.inkBlue}" opacity=".7"/>
    </g>
    <ellipse cx="${CX}" cy="${CY}" rx="640" ry="170" fill="url(#band)" transform="rotate(-12 ${CX} ${CY})"/>
    ${starfield(rand, { w: W, h: H, n: 170, maxR: 1.3, twinkle: 0.3 })}
    ${orbits}
    <circle cx="${CX}" cy="${CY}" r="74" fill="url(#core)" style="animation:breathe 5s ease-in-out infinite"/>
    <path d="${sparkle(CX, CY, 14, 0.14)}" fill="#fff" filter="url(#glow)"/>
    <text x="${CX}" y="${CY + 34}" text-anchor="middle" class="serif" font-size="17" font-style="italic" fill="#fff" style="${knockout}">${esc(T(U.core))}</text>
    ${planets}
    ${labels}
    ${legend}
    ${key}
  </g>
  <rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="21.5" fill="none" stroke="${C.sky}" stroke-opacity=".2" stroke-width="1.5"/>
</svg>`;
}
