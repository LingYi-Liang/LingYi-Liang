// Live panels + both READMEs, refreshed daily by .github/workflows/observatory.yml.
// Every pull request is its own image wrapped in a link, so each one is clickable on GitHub.
//   assets/live/{en,zh}/  prs-summary, merged-head, merged-N, review-head, review-N, universe, deck
//   README.md, README.zh-CN.md  (generated — edit scripts/content.mjs instead)
// Local run (no token needed, uses public data):  node scripts/observatory.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LANGS, C, FONT_CSS, rng, esc, f, textWidth, wrap, fit, starfield, panel, svgOpen, clean, numGrad, stat,
} from './theme.mjs';
import { LOGIN as DEFAULT_LOGIN, SITE, EMAIL, ORGS, HEADLINE, AI_DISCLOSURE, tr } from './content.mjs';
import { universeSvg } from './universe.mjs';
import { deckSvg } from './deck.mjs';
import { ocJourney } from './oc.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGIN = process.env.GH_LOGIN || DEFAULT_LOGIN;
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const MAX_MERGED = 8; // merged cards shown, four per row
const MAX_REVIEW = 14; // in-review rows shown
// Last known star counts, so one failed lookup never turns a project into ★ 0.
const STARS_CACHE = join(ROOT, 'assets', 'live', 'stars.json');

const HEADERS = {
  'User-Agent': `${LOGIN}-observatory`,
  Accept: 'application/vnd.github+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
};

const I18N = {
  en: {
    merged: 'MERGED', mergedSub: 'accepted upstream', stars: 'COMBINED STARS', starsSub: 'of the projects I contribute to',
    mergedHead: 'MERGED UPSTREAM', badge: 'MERGED', clickHint: 'click any card or row to open the PR', hi: 'hi!', bye: 'bye~',
    review: 'IN REVIEW', reviewNote: 'click to expand · sorted by project size', inReview: 'in review',
    contributions: 'CONTRIBUTIONS', contributionsSub: 'in the past year', bright: 'BRIGHT NIGHTS', brightSub: 'days with activity',
    current: 'CURRENT STREAK', currentSub: (n) => (n === 1 ? 'day' : 'days in a row'), longest: 'LONGEST STREAK', longestSub: 'days, past year',
    deckNote: 'each point is a day · stars are days with contributions', quiet: 'quiet', brighter: 'bright',
    synced: 'synced',
  },
  zh: {
    merged: '已合并', mergedSub: '被上游接收', stars: '合计星标', starsSub: '我参与的项目合计',
    mergedHead: '已合并到上游', badge: '已合并', clickHint: '点击任意卡片或行可打开对应 PR', hi: '你好~', bye: '拜拜~',
    review: '审核中', reviewNote: '点击展开 · 按项目规模排序', inReview: '审核中',
    contributions: '贡献', contributionsSub: '过去一年', bright: '亮星之夜', brightSub: '有贡献的天数',
    current: '当前连续', currentSub: () => '天', longest: '最长连续', longestSub: '天（过去一年）',
    deckNote: '每个点是一天 · 亮星是有贡献的日子', quiet: '安静', brighter: '明亮',
    synced: '同步于',
  },
};

async function rest(path) {
  const r = await fetch('https://api.github.com' + path, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}

// ───────────── data ─────────────

async function calendar() {
  if (TOKEN) {
    const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
      weeks{contributionDays{date contributionCount weekday}}}}}}`;
    const r = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { login: LOGIN } }),
    });
    const j = await r.json();
    if (!r.ok || j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors || r.status));
    return j.data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w, week) =>
      w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, weekday: d.weekday, week })),
    );
  }
  // Without a token, read the public calendar fragment that github.com itself renders.
  const r = await fetch(`https://github.com/users/${LOGIN}/contributions`, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
  if (!r.ok) throw new Error(`contributions page -> ${r.status}`);
  const html = await r.text();
  const counts = {};
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)<\/tool-tip>/g))
    counts[m[1]] = /^[\d,]+/.test(m[2]) ? parseInt(m[2].replace(/,/g, ''), 10) : 0;
  const days = [];
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="(contribution-day-component-(\d+)-(\d+))"/g))
    days.push({ date: m[1], count: counts[m[2]] ?? 0, weekday: +m[3], week: +m[4] });
  if (!days.length) throw new Error('could not parse the contributions calendar');
  return days;
}

async function pullRequests() {
  const items = [];
  for (let page = 1; page <= 3; page++) {
    const q = encodeURIComponent(`author:${LOGIN} type:pr`);
    const j = await rest(`/search/issues?q=${q}&per_page=100&page=${page}&sort=created&order=desc`);
    items.push(...j.items);
    if (j.items.length < 100 || items.length >= j.total_count) break;
  }
  const prs = items
    .map((i) => ({
      repo: i.repository_url.split('/repos/')[1],
      title: i.title.trim(),
      url: i.html_url,
      state: i.pull_request?.merged_at ? 'merged' : i.state === 'open' ? 'open' : 'closed',
      date: i.pull_request?.merged_at || i.created_at,
    }))
    .filter((p) => p.state !== 'closed' && p.repo.split('/')[0].toLowerCase() !== LOGIN.toLowerCase());
  let cached = {};
  try {
    cached = JSON.parse(readFileSync(STARS_CACHE, 'utf8'));
  } catch {}
  const stars = {};
  await Promise.all(
    [...new Set(prs.map((p) => p.repo))].map(async (repo) => {
      stars[repo] = await rest(`/repos/${repo}`).then(
        (r) => r.stargazers_count,
        (e) => {
          if (repo in cached) return cached[repo];
          throw e;
        },
      );
    }),
  );
  const bySize = (a, b) => (stars[b.repo] || 0) - (stars[a.repo] || 0) || b.date.localeCompare(a.date);
  return {
    prs,
    stars,
    merged: prs.filter((p) => p.state === 'merged').sort(bySize),
    open: prs.filter((p) => p.state === 'open').sort(bySize),
    repos: [...new Set(prs.map((p) => p.repo))].sort((a, b) => (stars[b] || 0) - (stars[a] || 0)),
  };
}

// Organisation logos = their GitHub avatars, kept in assets/orgs so each is downloaded only once.
async function orgAvatars(owners) {
  const dir = join(ROOT, 'assets', 'orgs');
  mkdirSync(dir, { recursive: true });
  const out = {};
  await Promise.all(owners.map(async (owner) => {
    const file = join(dir, `${owner}.png`);
    if (!existsSync(file)) {
      const r = await fetch(`https://github.com/${owner}.png?size=96`, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
      if (!r.ok) return; // no logo: the card falls back to a monogram
      writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    const buf = readFileSync(file);
    const mime = buf[0] === 0xff && buf[1] === 0xd8 ? 'image/jpeg' : buf[0] === 0x47 ? 'image/gif' : 'image/png';
    out[owner] = `data:${mime};base64,` + buf.toString('base64');
  }));
  return out;
}

// Rounded logo tile; falls back to a monogram when there is no avatar.
function logo(avatar, x, y, size, fallback) {
  const r = size * 0.28;
  return avatar
    ? `<rect x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" rx="${f(r)}" fill="#fff"/>
      <image href="${avatar}" x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${f(x + 0.5)}" y="${f(y + 0.5)}" width="${size - 1}" height="${size - 1}" rx="${f(r)}" fill="none" stroke="#fff" stroke-opacity=".35"/>`
    : `<rect x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" rx="${f(r)}" fill="url(#mono)"/>
      <text x="${f(x + size / 2)}" y="${f(y + size * 0.64)}" text-anchor="middle" class="sans" font-size="${f(size * 0.38)}" font-weight="700" fill="#fff">${esc(fallback)}</text>`;
}
const logoClipDef = `<clipPath id="logoClip" clipPathUnits="objectBoundingBox"><rect width="1" height="1" rx=".28"/></clipPath>
  <linearGradient id="mono" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.azure}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient>`;

// ───────────── drawing helpers ─────────────

const kfmt = (n) => (n >= 1000 ? (n >= 9950 ? Math.round(n / 1000) : (n / 1000).toFixed(1)) + 'k' : String(n));

// "fix(tui): isolate callbacks" -> { tag: "fix · tui", text: "Isolate callbacks" }
function parseTitle(t) {
  let m = t.match(/^\[([^\]]+)\]\s*(.+)$/);
  let tag = '', text = t;
  if (m) (tag = m[1]), (text = m[2]);
  else if ((m = t.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/))) (tag = m[2] ? `${m[1]} · ${m[2]}` : m[1]), (text = m[3]);
  return { tag: tag.toLowerCase(), text: text.charAt(0).toUpperCase() + text.slice(1) };
}

function monogram(name) {
  const parts = name.split(/[-_.]|(?<=[a-z])(?=[A-Z])/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

// ───────────── panels ─────────────

// Left: merged and combined stars. Right: the headline, who I contribute to, and what I work on.
function summarySvg(data, L, lang, avatars) {
  const { merged, repos, stars } = data;
  const W = 1200, H = 270, rand = rng(31);
  const T = (v) => tr(v, lang);
  const p = panel('m', W, H, { seed: 21 });
  const reach = repos.reduce((s, r) => s + (stars[r] || 0), 0);

  // Owners: big companies first (in ORGS order), then the rest by combined stars.
  const ownerStars = {};
  for (const r of repos) ownerStars[r.split('/')[0]] = (ownerStars[r.split('/')[0]] || 0) + (stars[r] || 0);
  const order = Object.keys(ORGS);
  const owners = Object.keys(ownerStars).sort((a, b) => {
    const ba = ORGS[a]?.big ? 0 : 1, bb = ORGS[b]?.big ? 0 : 1;
    return ba - bb || (ba === 0 ? order.indexOf(a) - order.indexOf(b) : ownerStars[b] - ownerStars[a]);
  });
  const x0 = 384, span = 1160 - x0, slot = Math.min(84, span / Math.max(1, owners.length));
  const logos = owners.map((o, i) => {
    const big = ORGS[o]?.big, size = big ? 48 : 40, cx = x0 + slot * (i + 0.5), top = big ? 124 : 128;
    const name = T(ORGS[o] || { en: o, zh: o });
    return `${big ? `<circle cx="${f(cx)}" cy="${top + size / 2}" r="${size * 0.8}" fill="url(#halo)"/>` : ''}
      ${logo(avatars[o], cx - size / 2, top, size, o.slice(0, 2).toUpperCase())}
      <text x="${f(cx)}" y="196" text-anchor="middle" class="sans" font-size="12.5" font-weight="${big ? 600 : 400}" fill="${big ? '#fff' : C.textDim}">${esc(fit(name, slot - 6, 12.5))}</text>`;
  }).join('');
  let cx = x0;
  const chips = HEADLINE.directions.map((d) => {
    const t = T(d), w = 22 + textWidth(t, 13);
    const out = `<rect x="${f(cx)}" y="216" width="${f(w)}" height="28" rx="14" fill="${C.sky}" fill-opacity=".08" stroke="${C.sky}" stroke-opacity=".3"/>
      <text x="${f(cx + w / 2)}" y="234.5" text-anchor="middle" class="sans" font-size="13" fill="${C.textDim}">${esc(t)}</text>`;
    cx += w + 10;
    return out;
  }).join('');

  return `${svgOpen(W, H, `${T(HEADLINE.title)} — ${merged.length} merged pull requests, contributor to ${owners.join(', ')}`)}
  <defs>${p.defs}${numGrad}${logoClipDef}
    <radialGradient id="halo"><stop offset="0" stop-color="${C.violet}" stop-opacity=".45"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="${C.haze}"/><stop offset="1" stop-color="${C.lilac}"/></linearGradient>
    <style>${FONT_CSS}</style>
  </defs>
  <g clip-path="url(#mClip)">
    ${p.bg}
    ${starfield(rand, { w: W, h: H, n: 70, maxR: 1, twinkle: 0.25 })}
    ${stat(44, 98, merged.length, L.merged, L.mergedSub, 'numM')}
    <line x1="44" y1="150" x2="300" y2="150" stroke="${C.sky}" stroke-opacity=".12"/>
    ${stat(44, 204, '★ ' + kfmt(reach), L.stars, L.starsSub)}
    <line x1="340" y1="40" x2="340" y2="236" stroke="${C.sky}" stroke-opacity=".14"/>
    <text x="${x0}" y="80" class="${lang === 'zh' ? 'sans' : 'serif'}" font-size="38" font-weight="${lang === 'zh' ? 600 : 400}" fill="url(#title)">${esc(T(HEADLINE.title))}</text>
    <text x="${x0}" y="108" class="mono" font-size="11.5" letter-spacing="3" fill="${C.label}">${esc(T(HEADLINE.kicker))}</text>
    ${logos}
    ${chips}
  </g>
  ${p.border}
</svg>`;
}

// Transparent sub-header strip, readable on both GitHub themes.
function headSvg(kind, count, L, today) {
  const W = 1200, H = 46;
  const merged = kind === 'merged';
  const label = `${merged ? '◆' : '○'}  ${merged ? L.mergedHead : L.review} · ${count}`;
  const note = merged ? L.clickHint : `${L.reviewNote} · ${L.synced} ${today}`;
  const lw = textWidth(label, 13, true) + 3 * [...label].length;
  const nw = textWidth(note, 11.5, true);
  const tone = merged ? C.violet : C.cerulean;
  return `${svgOpen(W, H, label)}
  <defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${tone}" stop-opacity=".6"/><stop offset="1" stop-color="${tone}" stop-opacity=".05"/></linearGradient><style>${FONT_CSS}</style></defs>
  <text x="8" y="28" class="mono" font-size="13" letter-spacing="3" fill="${merged ? '#8a6ee8' : C.mid}">${esc(label)}</text>
  <rect x="${f(24 + lw)}" y="23" width="${f(Math.max(0, 1192 - nw - 24 - lw - 16))}" height="1" fill="url(#h)"/>
  <text x="1192" y="28" text-anchor="end" class="mono" font-size="11.5" fill="${C.mid}" opacity=".85">${esc(note)}</text>
</svg>`;
}

// One merged PR as a raised slab. The OC walks across it beneath the text layer, so the text sits on top of her.
// Transparent around the card so it floats on the page.
const CARD_W = 262, CARD_H = 216, CARD_X = 8, CARD_Y = 6, GROUND = CARD_Y + 212;
function mergedCardSvg(pr, stars, L, i, oc, avatar) {
  const W = CARD_W + 30, H = CARD_H + 34, cw = CARD_W, ch = CARD_H, x = CARD_X, y = CARD_Y;
  const [owner, name] = pr.repo.split('/');
  const { tag, text } = parseTitle(pr.title);
  const lines = wrap(text, cw - 40, 18, 3);
  const tagW = tag ? 18 + textWidth(tag, 12.5, true) : 0;
  const rand = rng(100 + i);
  return `${svgOpen(W, H, `Merged: ${pr.repo} — ${pr.title}`)}
  <defs>
    <filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="lift" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#0a1440" flood-opacity=".95"/></filter>
    <linearGradient id="face" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#2a3f9e"/><stop offset=".55" stop-color="#22307f"/><stop offset="1" stop-color="#2c1f72"/></linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="${C.lilac}" stop-opacity=".35"/></linearGradient>
    ${logoClipDef}
    <clipPath id="faceClip"><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16"/></clipPath>
    ${oc.defs}
    <style>${FONT_CSS}@keyframes sheen{0%,70%{transform:translateX(-340px)}100%{transform:translateX(340px)}}${oc.css}</style>
  </defs>
  <rect x="${x + 9}" y="${y + 13}" width="${cw}" height="${ch}" rx="16" fill="#020718" opacity=".5" filter="url(#blur)"/>
  <rect x="${x + 7}" y="${y + 8}" width="${cw}" height="${ch}" rx="16" fill="#140f3c"/>
  <rect x="${x + 3.5}" y="${y + 4}" width="${cw}" height="${ch}" rx="16" fill="#261b66"/>
  <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="url(#face)"/>
  <g clip-path="url(#faceClip)">
    ${starfield(rand, { x, y, w: cw, h: ch, n: 18, maxR: 0.9, twinkle: 0.3 })}
    <rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="url(#gloss)"/>
    <rect x="${x}" y="${y - 40}" width="60" height="${ch + 80}" fill="#fff" opacity=".07" transform="skewX(-20)" style="animation:sheen ${f(7 + i * 0.9)}s ease-in-out infinite"/>
    <g transform="translate(${x} 0)">${oc.body}</g>
  </g>
  <rect x="${x + 0.75}" y="${y + 0.75}" width="${cw - 1.5}" height="${ch - 1.5}" rx="15.5" fill="none" stroke="url(#edge)" stroke-width="1.5"/>
  <g filter="url(#lift)">
    ${logo(avatar, x + 18, y + 18, 42, monogram(name))}
    <text x="${x + 72}" y="${y + 34}" class="mono" font-size="12.5" fill="${C.textDim}">${esc(fit(owner, cw - 90, 12.5, true))}</text>
    <text x="${x + 72}" y="${y + 55}" class="sans" font-size="18" font-weight="600" fill="#fff">${esc(fit(name, cw - 90, 18))}</text>
    ${tag ? `<rect x="${x + 18}" y="${y + 74}" width="${f(tagW)}" height="24" rx="12" fill="#1c2466" fill-opacity=".55" stroke="${C.lilac}" stroke-opacity=".45"/>
      <text x="${f(x + 18 + tagW / 2)}" y="${y + 90.5}" text-anchor="middle" class="mono" font-size="12.5" fill="${C.lilac}">${esc(tag)}</text>` : ''}
    ${lines.map((l, j) => `<text x="${x + 18}" y="${y + 124 + j * 22}" class="sans" font-size="18" fill="${C.text}">${esc(l)}</text>`).join('')}
    <line x1="${x + 18}" y1="${y + 182}" x2="${x + cw - 18}" y2="${y + 182}" stroke="#fff" stroke-opacity=".12"/>
    <path d="M${x + 19} ${y + 199}l4 4l8 -8.5" fill="none" stroke="${C.lilac}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${x + 38}" y="${y + 204}" class="mono" font-size="12.5" letter-spacing="1.8" fill="${C.lilac}">${esc(L.badge)}</text>
    <text x="${x + cw - 18}" y="${y + 204}" text-anchor="end" class="mono" font-size="13" fill="${C.textDim}">★ ${kfmt(stars[pr.repo] || 0)}</text>
  </g>
</svg>`;
}

// One in-review PR as a raised strip.
function reviewRowSvg(pr, stars, L, i, avatar) {
  const W = 1200, H = 58, y = 4, h = 46;
  const [owner, name] = pr.repo.split('/');
  const { tag, text } = parseTitle(pr.title);
  const tagW = tag ? 18 + textWidth(tag, 12, true) : 0;
  const tx = 370 + (tag ? tagW + 12 : 0);
  const statusW = 24 + textWidth(L.inReview, 12.5, true);
  const rand = rng(200 + i);
  return `${svgOpen(W, H, `In review: ${pr.repo} — ${pr.title}`)}
  <defs>
    <linearGradient id="strip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#11296a"/><stop offset=".6" stop-color="#0d2058"/><stop offset="1" stop-color="#1a1d62"/></linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>
    <clipPath id="sc"><rect x="2" y="${y}" width="${W - 4}" height="${h}" rx="13"/></clipPath>
    ${logoClipDef}
    <style>${FONT_CSS}</style>
  </defs>
  <rect x="2" y="${y + 4}" width="${W - 4}" height="${h}" rx="13" fill="#020718" opacity=".5"/>
  <rect x="2" y="${y}" width="${W - 4}" height="${h}" rx="13" fill="url(#strip)"/>
  <g clip-path="url(#sc)">${starfield(rand, { x: 2, y, w: W - 4, h, n: 14, maxR: 0.8, twinkle: 0.4 })}</g>
  <rect x="2.75" y="${y + 0.75}" width="${W - 5.5}" height="${h - 1.5}" rx="12.5" fill="none" stroke="url(#edge)" stroke-width="1.5"/>
  ${logo(avatar, 16, y + 8, 30, monogram(name))}
  <text x="58" y="${y + 29}" class="mono" font-size="15"><tspan fill="${C.textFaint}">${esc(fit(owner, 130, 15, true))}/</tspan><tspan fill="#fff">${esc(fit(name, 170, 15, true))}</tspan></text>
  ${tag ? `<rect x="370" y="${y + 11}" width="${f(tagW)}" height="24" rx="12" fill="#fff" fill-opacity=".06" stroke="${C.review}" stroke-opacity=".4"/>
    <text x="${f(370 + tagW / 2)}" y="${y + 27.5}" text-anchor="middle" class="mono" font-size="12" fill="${C.sky}">${esc(tag)}</text>` : ''}
  <text x="${f(tx)}" y="${y + 29}" class="sans" font-size="17" fill="${C.text}">${esc(fit(text, 1176 - statusW - 16 - 78 - tx, 17))}</text>
  <text x="${f(1176 - statusW - 16)}" y="${y + 29}" text-anchor="end" class="mono" font-size="13.5" fill="${C.textDim}">★ ${kfmt(stars[pr.repo] || 0)}</text>
  <rect x="${f(1176 - statusW)}" y="${y + 10}" width="${f(statusW)}" height="26" rx="13" fill="${C.review}" fill-opacity=".14" stroke="${C.review}" stroke-opacity=".5"/>
  <text x="${f(1176 - statusW / 2)}" y="${y + 27.5}" text-anchor="middle" class="mono" font-size="12.5" fill="${C.sky}">${esc(L.inReview)}</text>
</svg>`;
}

// ───────────── README ─────────────

const README_TEXT = {
  en: {
    file: 'README.md', alt: 'English', otherAlt: '切换到中文',
    header: 'LingYi — LLM reasoning & efficient learning · mathematics researcher',
    site: 'site', mail: 'mail', summaryAlt: 'AI infra · full-stack: merged pull requests and the organisations I contribute to',
    reviewAlt: 'Pull requests in review (click to expand)',
    universeAlt: 'Orbit I mathematics, orbit II my projects, orbit III the projects my pull requests went to',
    deckAlt: 'The past year of contributions as a starfield, swept by a small black hole',
    footer: 'Until the next observation.',
  },
  zh: {
    file: 'README.zh-CN.md', alt: '中文', otherAlt: 'Switch to English',
    header: 'LingYi — LLM 推理与高效学习 · 数学研究者',
    site: '个人主页', mail: '邮箱', summaryAlt: 'AI 基础设施 · 全栈：已合并的 PR 和参与贡献的组织',
    reviewAlt: '审核中的 PR（点击展开）',
    universeAlt: '轨道 I 数学，轨道 II 我的项目，轨道 III 我提交 PR 的上游项目',
    deckAlt: '过去一年的贡献画成星空，一个小黑洞正在扫过',
    footer: '下次观测再见。',
  },
};

function readme(lang, data) {
  const R = README_TEXT[lang];
  const A = `assets/${lang}`, LIVE = `assets/live/${lang}`;
  const profile = `https://github.com/${LOGIN}`;
  const zhUrl = `https://github.com/${LOGIN}/${LOGIN}/blob/main/README.zh-CN.md`;
  const search = (extra) => `https://github.com/search?q=${encodeURIComponent(`author:${LOGIN} type:pr ${extra}`.trim())}&type=pullrequests`;
  const badge = (label, value, color, href) =>
    `<a href="${href}"><img src="https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value.replace(/-/g, '--'))}-${color}?style=flat-square&labelColor=0a1f52" alt="${label}"></a>`;
  const sw = lang === 'en'
    ? `<a href="${profile}"><img src="assets/lang/en-on.svg" height="28" alt="${R.alt}"></a><a href="${zhUrl}"><img src="assets/lang/zh-off.svg" height="28" alt="${R.otherAlt}"></a>`
    : `<a href="${profile}"><img src="assets/lang/en-off.svg" height="28" alt="${R.otherAlt}"></a><a href="${zhUrl}"><img src="assets/lang/zh-on.svg" height="28" alt="${R.alt}"></a>`;

  const merged = data.merged.slice(0, MAX_MERGED);
  const mergedRows = [];
  for (let i = 0; i < merged.length; i += 4)
    mergedRows.push(`<p align="center">\n${merged.slice(i, i + 4).map((pr, j) =>
      `  <a href="${pr.url}"><img src="${LIVE}/merged-${i + j + 1}.svg" width="24%" alt="${esc(pr.repo)}: ${esc(pr.title)}"></a>`).join('\n')}\n</p>`);
  const review = data.open.slice(0, MAX_REVIEW).map((pr, i) =>
    `  <a href="${pr.url}"><img src="${LIVE}/review-${i + 1}.svg" width="100%" alt="${esc(pr.repo)}: ${esc(pr.title)}"></a>`);

  return `<!-- Generated by scripts/observatory.mjs — edit scripts/content.mjs, not this file. -->
<p align="left">${sw}</p>

<p align="center">
  <img src="${A}/header.svg" width="100%" alt="${R.header}">
</p>

<p align="center">
  ${badge(R.site, SITE.replace('https://', ''), '2a7fd4', SITE)}
  ${badge(R.mail, EMAIL, '7c5cff', `mailto:${EMAIL}`)}
</p>

<p align="center"><img src="${A}/dividers/prs.svg" width="100%" alt=""></p>
<p align="center">
  <a href="${search('')}"><img src="${LIVE}/prs-summary.svg" width="100%" alt="${R.summaryAlt}"></a>
</p>
<p align="center"><a href="${search('is:merged')}"><img src="${LIVE}/merged-head.svg" width="100%" alt=""></a></p>
${mergedRows.join('\n')}
<details>
<summary><img src="${LIVE}/review-head.svg" width="96%" alt="${R.reviewAlt}"></summary>
<p align="center">
${review.join('\n')}
</p>
</details>

<p align="center"><img src="${A}/dividers/universe.svg" width="100%" alt=""></p>
<p align="center">
  <img src="${LIVE}/universe.svg" width="100%" alt="${R.universeAlt}">
</p>

<p align="center"><img src="${A}/dividers/deck.svg" width="100%" alt=""></p>
<p align="center">
  <img src="${LIVE}/deck.svg" width="100%" alt="${R.deckAlt}">
</p>

<p align="center">
  <img src="${A}/footer.svg" width="100%" alt="${R.footer}">
</p>

<p align="center"><sub>✦ <b>${tr(AI_DISCLOSURE.title, lang)}</b> · ${esc(tr(AI_DISCLOSURE.body, lang))}</sub></p>
`;
}

// ───────────── main ─────────────

const [days, data] = await Promise.all([calendar(), pullRequests()]);
const today = new Date().toISOString().slice(0, 10);
const upstream = data.repos.map((repo) => ({
  repo,
  stars: data.stars[repo] || 0,
  prs: data.prs.filter((p) => p.repo === repo).length,
  merged: data.merged.filter((p) => p.repo === repo).length,
}));

const avatars = await orgAvatars([...new Set(data.repos.map((r) => r.split('/')[0]))]);
rmSync(join(ROOT, 'assets', 'live'), { recursive: true, force: true });
mkdirSync(join(ROOT, 'assets', 'live'), { recursive: true });
writeFileSync(STARS_CACHE, JSON.stringify(data.stars, null, 2) + '\n');
for (const lang of LANGS) {
  const L = I18N[lang];
  const dir = join(ROOT, 'assets', 'live', lang);
  mkdirSync(dir, { recursive: true });
  const put = (name, svg) => writeFileSync(join(dir, name), clean(svg));
  put('prs-summary.svg', summarySvg(data, L, lang, avatars));
  put('merged-head.svg', headSvg('merged', data.merged.length, L, today));
  put('review-head.svg', headSvg('review', data.open.length, L, today));
  const oc = ocJourney(ROOT, Math.min(MAX_MERGED, data.merged.length), { cardWidth: CARD_W, ground: GROUND, says: { hi: L.hi, bye: L.bye } });
  data.merged.slice(0, MAX_MERGED).forEach((pr, i) => put(`merged-${i + 1}.svg`, mergedCardSvg(pr, data.stars, L, i, oc(i), avatars[pr.repo.split('/')[0]])));
  data.open.slice(0, MAX_REVIEW).forEach((pr, i) => put(`review-${i + 1}.svg`, reviewRowSvg(pr, data.stars, L, i, avatars[pr.repo.split('/')[0]])));
  put('universe.svg', universeSvg(lang, upstream));
  put('deck.svg', deckSvg(days, L, today, lang));
  writeFileSync(join(ROOT, README_TEXT[lang].file), readme(lang, data));
}
console.log(`PRs: ${data.prs.length} (${data.merged.length} merged) · calendar: ${days.length} days, ${days.reduce((s, d) => s + d.count, 0)} contributions`);
