// Observation deck: the past year of contributions as a starfield, swept by a small black hole.
// The hole drifts left to right; every star within reach of its gravity spirals in (bright ones
// flare as they're torn apart), then the sky refills from left to right and the loop starts over.
import { C, FONT_CSS, rng, esc, f, sparkle, glowFilter, panel, svgOpen, starfield, numGrad, stat } from './theme.mjs';

const LOOP = 40; // seconds per sweep + refill
const TRAVEL = 0.86; // fraction of the loop spent crossing the grid
const PULL = 92; // gravitational reach, px

function streaks(days) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, run = 0;
  for (const d of sorted) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let i = sorted.length - 1;
  if (i >= 0 && sorted[i].count === 0) i--; // today isn't over yet
  let current = 0;
  while (i >= 0 && sorted[i].count > 0) current++, i--;
  return { current, longest };
}

const pct = (t) => f(t * 100) + '%';

function blackHole() {
  // Drawn at the origin; the disk is tilted like Gargantua's, its near side Doppler-brightened.
  return `
    <polygon points="0,-9 -78,-1.2 -78,1.2 0,9" fill="url(#bhTail)"/>
    <circle r="42" fill="url(#bhLens)"/>
    <circle r="24" fill="url(#bhDark)"/>
    <g transform="rotate(-14)">
      <g style="animation:jet 1.6s ease-in-out infinite">
        <rect x="-.8" y="-50" width="1.6" height="38" fill="url(#bhJetUp)"/>
        <rect x="-.8" y="12" width="1.6" height="38" fill="url(#bhJetDown)"/>
      </g>
      <ellipse rx="31" ry="7.5" fill="none" stroke="url(#bhDisk)" stroke-width="4.6" filter="url(#bhGlow)"/>
      <ellipse rx="31" ry="7.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" stroke-dasharray="3 9" style="animation:diskSpin 1.2s linear infinite"/>
      <path d="M-15.5 0 A15.5 13.5 0 0 1 15.5 0" fill="none" stroke="url(#bhDisk)" stroke-width="2.4" opacity=".85" filter="url(#bhGlow)"/>
    </g>
    <circle r="11.6" fill="none" stroke="url(#bhRing)" stroke-width="1.6" filter="url(#bhGlow)"/>
    <circle r="9.6" fill="#000"/>
    <g transform="rotate(-14)">
      <path d="M-31 0 A31 7.5 0 0 0 31 0" fill="none" stroke="url(#bhDisk)" stroke-width="4.6" filter="url(#bhGlow)"/>
      <path d="M-31 0 A31 7.5 0 0 0 31 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1" stroke-dasharray="3 9" style="animation:diskSpin 1.2s linear infinite"/>
      <g transform="scale(1 .26)"><g style="animation:spin 1.9s linear infinite" fill="#fff">
        <circle cx="23" r="1.8"/><circle cx="-18" cy="9" r="1.3" fill="${C.sky}"/><circle cx="6" cy="-27" r="1.5" fill="${C.lilac}"/>
      </g></g>
    </g>`;
}

function blackHoleDefs() {
  return `
    <radialGradient id="bhLens"><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="${C.sky}" stop-opacity=".22"/><stop offset=".7" stop-color="${C.lilac}" stop-opacity=".12"/><stop offset="1" stop-color="${C.sky}" stop-opacity="0"/></radialGradient>
    <radialGradient id="bhDark"><stop offset="0" stop-color="#000" stop-opacity=".95"/><stop offset=".55" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="bhDisk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#bfe8ff"/><stop offset=".65" stop-color="#8a6cff"/><stop offset="1" stop-color="#3a2478"/></linearGradient>
    <linearGradient id="bhRing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${C.lilac}"/></linearGradient>
    <linearGradient id="bhTail" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${C.lilac}" stop-opacity=".5"/><stop offset=".4" stop-color="${C.azure}" stop-opacity=".2"/><stop offset="1" stop-color="${C.azure}" stop-opacity="0"/></linearGradient>
    <linearGradient id="bhJetUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.sky}" stop-opacity=".75"/><stop offset="1" stop-color="${C.sky}" stop-opacity="0"/></linearGradient>
    <linearGradient id="bhJetDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.sky}" stop-opacity=".75"/><stop offset="1" stop-color="${C.sky}" stop-opacity="0"/></linearGradient>
    <radialGradient id="bhGhost"><stop offset="0" stop-color="${C.violet}" stop-opacity=".9"/><stop offset=".45" stop-color="${C.azure}" stop-opacity=".35"/><stop offset="1" stop-color="${C.azure}" stop-opacity="0"/></radialGradient>
    <radialGradient id="flash"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${C.sky}" stop-opacity=".8"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
    <filter id="bhGlow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

export function deckSvg(days, L, today, lang) {
  const W = 1200, H = 404, rand = rng(47);
  const p = panel('d', W, H, { seed: 41 });
  const total = days.reduce((s, d) => s + d.count, 0);
  const active = days.filter((d) => d.count > 0);
  const { current, longest } = streaks(days);
  const max = Math.max(1, ...days.map((d) => d.count));

  const weeks = Math.max(...days.map((d) => d.week)) + 1;
  const pitch = Math.min(21, (W - 96) / weeks);
  const x0 = (W - weeks * pitch) / 2 + pitch / 2;
  const y0 = 204;
  const at = (d) => [x0 + d.week * pitch, y0 + d.weekday * pitch];
  const COLORS = [C.review, C.sky, C.lilac, '#ffffff'];
  const RADII = [2.8, 3.5, 4.2, 4.8];

  // The hole's path: a slow sine drift across the grid, sampled at constant horizontal speed.
  const xL = x0 - 110, xR = x0 + (weeks - 1) * pitch + 110, yMid = y0 + 3 * pitch;
  const N = 220;
  const path = Array.from({ length: N }, (_, k) => {
    const u = k / (N - 1), x = xL + u * (xR - xL);
    return { t: u * TRAVEL, x, y: yMid + 16 * Math.sin((2 * Math.PI * (x - xL)) / 300) };
  });
  const holeAt = (t) => {
    if (t >= TRAVEL) return path[N - 1];
    const k = Math.min(N - 2, Math.floor((t / TRAVEL) * (N - 1)));
    const a = path[k], b = path[k + 1], w = (t - a.t) / (b.t - a.t);
    return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
  };
  const holeKeys = path.filter((_, k) => k % 2 === 0 || k === N - 1)
    .map((s) => `${pct(s.t)}{transform:translate(${f(s.x)}px,${f(s.y)}px)}`).join('');

  // When does gravity reach each star, and where is the hole when the star falls in?
  const xs = days.map((d) => at(d)[0]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const kf = new Map();
  const keyframe = (body) => {
    if (!kf.has(body)) kf.set(body, 'k' + kf.size);
    return kf.get(body);
  };
  const fate = (x, y, bright) => {
    const hit = path.find((s) => Math.hypot(s.x - x, s.y - y) <= PULL);
    if (!hit) return null;
    const dist = Math.hypot(hit.x - x, hit.y - y);
    const ts = hit.t, te = ts + (0.9 + (0.7 * dist) / PULL) / LOOP;
    const refill = Math.max(te + 0.02, 0.885 + (0.09 * (x - xMin)) / (xMax - xMin || 1));
    const end = holeAt(te);
    const mid = bright ? 'rotate(120deg) scale(.75,.4)' : 'rotate(140deg) scale(.55)';
    const name = keyframe(
      `0%,${pct(ts)}{transform:none;opacity:1}${pct((ts + te) / 2)}{transform:${mid};opacity:1}` +
      `${pct(te)}{transform:rotate(330deg) scale(0);opacity:0}${pct(refill)}{transform:none;opacity:0}` +
      `${pct(Math.min(refill + 0.022, 1))}{opacity:1}100%{transform:none;opacity:1}`,
    );
    return { ts, te, refill, end, style: `transform-origin:${f(end.x)}px ${f(end.y)}px;animation:${name} ${LOOP}s linear infinite` };
  };

  let months = '', lastMonth = '';
  for (const d of days.filter((d) => d.weekday === 0 || d.week === 0)) {
    const m = d.date.slice(5, 7);
    if (m !== lastMonth) {
      if (lastMonth || d.date.slice(8) <= '07') {
        const label = lang === 'zh' ? `${+m}月` : new Date(d.date + 'T00:00:00Z').toLocaleString('en', { month: 'short', timeZone: 'UTC' });
        months += `<text x="${f(x0 + d.week * pitch - pitch / 2)}" y="${y0 - 22}" class="mono" font-size="11" fill="${C.textFaint}">${label}</text>`;
      }
      lastMonth = m;
    }
  }

  let dust = '', starsSvg = '', flashes = '';
  const fates = new Map();
  for (const d of days) {
    const [x, y] = at(d);
    const fa = fate(x, y, d.count > 0);
    fates.set(d.date, fa);
    const anim = fa ? ` style="${fa.style}"` : '';
    if (!d.count) {
      dust += `<circle cx="${f(x)}" cy="${f(y)}" r="1"${anim}/>`;
      continue;
    }
    const q = d.count / max;
    const lvl = q > 0.75 ? 4 : q > 0.5 ? 3 : q > 0.25 ? 2 : 1;
    const tw = lvl >= 3 ? ` class="tw" style="animation-duration:${f(2.6 + rand() * 3)}s;animation-delay:${f(-rand() * 4)}s"` : '';
    starsSvg += `<g${anim}><g${tw}>${lvl === 4 ? `<path d="${sparkle(x, y, 12, 0.14)}" fill="#fff" opacity=".9"/>` : ''}<circle cx="${f(x)}" cy="${f(y)}" r="${RADII[lvl - 1]}" fill="${COLORS[lvl - 1]}"${lvl >= 3 ? ' filter="url(#glow)"' : ''}><title>${d.date}: ${d.count}</title></circle></g></g>`;
    if (fa) {
      // Tidal-disruption flare where the star meets the hole.
      const name = keyframe(
        `0%,${pct(Math.max(0, fa.te - 0.004))}{opacity:0;transform:scale(.2)}${pct(fa.te)}{opacity:.8;transform:scale(1)}` +
        `${pct(fa.te + 0.014 + 0.004 * lvl)}{opacity:0;transform:scale(${1.3 + 0.2 * lvl})}100%{opacity:0;transform:scale(.2)}`,
      );
      flashes += `<g style="transform-origin:${f(fa.end.x)}px ${f(fa.end.y)}px;animation:${name} ${LOOP}s linear infinite;opacity:0">
        <circle cx="${f(fa.end.x)}" cy="${f(fa.end.y)}" r="${5 + 1.5 * lvl}" fill="url(#flash)"/>
        <path d="${sparkle(fa.end.x, fa.end.y, 6 + 2 * lvl, 0.1)}" fill="#fff" opacity=".85"/></g>`;
    }
  }

  // Constellation chain through the active days; each link fades when its first star is eaten.
  const chainDays = [...active].sort((a, b) => a.date.localeCompare(b.date));
  let chain = '';
  for (let i = 1; i < chainDays.length; i++) {
    const a = chainDays[i - 1], b = chainDays[i];
    const fa = fates.get(a.date), fb = fates.get(b.date);
    const [x1, y1] = at(a), [x2, y2] = at(b);
    let anim = '';
    if (fa && fb) {
      const gone = Math.min(fa.ts, fb.ts), back = Math.min(Math.max(fa.refill, fb.refill) + 0.03, 1);
      const name = keyframe(`0%,${pct(gone)}{opacity:1}${pct(gone + 0.012)}{opacity:0}${pct(back - 0.001)}{opacity:0}${pct(back)}{opacity:1}100%{opacity:1}`);
      anim = ` style="animation:${name} ${LOOP}s linear infinite"`;
    }
    chain += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"${anim}/>`;
  }

  // Afterimages: the same path, a little later and a little fainter.
  const ghosts = [0.14, 0.28, 0.42, 0.56]
    .map((dl, i) => `<g style="animation:bh ${LOOP}s linear infinite;animation-delay:${dl}s;animation-fill-mode:backwards" opacity="${[0.42, 0.28, 0.17, 0.09][i]}"><circle r="${16 + i * 2}" fill="url(#bhGhost)"/></g>`)
    .join('');

  const lx = W - 300;
  const legend = COLORS.map((c, i) => `<circle cx="${lx + 62 + i * 22}" cy="${H - 34}" r="${RADII[i]}" fill="${c}"/>`).join('');
  const colW = (W - 80) / 4;

  return `${svgOpen(W, H, `${total} contributions in the past year, drawn as a starfield that a small black hole sweeps through`)}
  <defs>${p.defs}${glowFilter('glow', 2.4)}${numGrad}${blackHoleDefs()}
    <style>${FONT_CSS}
      @keyframes bh{${holeKeys}100%{transform:translate(${f(xR)}px,${f(yMid)}px)}}
      @keyframes diskSpin{to{stroke-dashoffset:-24}}
      @keyframes jet{0%,100%{opacity:.45}50%{opacity:1}}
      ${[...kf].map(([body, name]) => `@keyframes ${name}{${body}}`).join('\n')}
    </style>
  </defs>
  <g clip-path="url(#dClip)">
    ${p.bg}
    ${starfield(rand, { w: W, h: H, n: 60, maxR: 0.9, twinkle: 0.2 })}
    ${[
      [total, L.contributions, L.contributionsSub],
      [active.length, L.bright, L.brightSub],
      [current, L.current, L.currentSub(current)],
      [longest, L.longest, L.longestSub],
    ].map(([v, l, s], i) => `${i ? `<line x1="${f(40 + i * colW - 14)}" y1="34" x2="${f(40 + i * colW - 14)}" y2="114" stroke="${C.sky}" stroke-opacity=".12"/>` : ''}${stat(44 + i * colW, 74, v, l, s)}`).join('')}
    <line x1="24" y1="140" x2="${W - 24}" y2="140" stroke="${C.sky}" stroke-opacity=".14"/>
    ${months}
    <g fill="${C.sky}" fill-opacity=".26">${dust}</g>
    <g stroke="${C.sky}" stroke-opacity=".28" stroke-width=".9">${chain}</g>
    ${starsSvg}
    ${ghosts}
    <g style="animation:bh ${LOOP}s linear infinite">${blackHole()}</g>
    ${flashes}
    <text x="40" y="${H - 30}" class="mono" font-size="11.5" fill="${C.textFaint}">${esc(L.deckNote)} · ${esc(L.synced)} ${today}</text>
    <text x="${lx}" y="${H - 30}" class="mono" font-size="11.5" fill="${C.textFaint}">${esc(L.quiet)}</text>${legend}
    <text x="${lx + 62 + 3 * 22 + 14}" y="${H - 30}" class="mono" font-size="11.5" fill="${C.textFaint}">${esc(L.brighter)}</text>
  </g>
  ${p.border}
</svg>`;
}
