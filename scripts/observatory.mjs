// Builds the profile from live GitHub data, refreshed daily by .github/workflows/observatory.yml:
//   assets/live/{en,zh}/hero.svg       role, name, umbrella line, organisations; sky, emblem, stargazer
//   assets/live/{en,zh}/upstream.svg   merged work, one column per layer of the LLM stack
//   assets/live/{en,zh}/review.svg     the few big projects with work still in review
//   assets/live/{en,zh}/deck.svg       the past year of contributions as a starfield, swept by a black hole
//   README.md, README.zh-CN.md         generated — edit scripts/content.mjs instead
// Nothing is written unless every truth guard passes, so a failed run leaves yesterday's page in place.
// Local run (no token needed, uses public data):  node scripts/observatory.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, C, FONT_CSS, rng, esc, f, textWidth, fit, starfield, panel, svgOpen, clean } from './theme.mjs';
import {
  LOGIN as DEFAULT_LOGIN, SITE, EMAIL, IDENTITY, COUNT_STYLE, BRANDS, PILLARS, LABELS, REVIEW, SYNCED_MERGES,
  AI_DISCLOSURE, BANNED, tr,
} from './content.mjs';
import { heroSvg } from './hero.mjs';
import { deckSvg } from './deck.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGIN = process.env.GH_LOGIN || DEFAULT_LOGIN;
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const HEADERS = {
  'User-Agent': `${LOGIN}-profile`,
  Accept: 'application/vnd.github+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
};
const MAX_ROWS = 4; // per column of the merged grid, including a "+N" row when a column overflows

async function rest(path) {
  const r = await fetch('https://api.github.com' + path, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}

// Needs a token (the Action has one).
async function graphql(query, variables) {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors || r.status));
  return j.data;
}

// ───────────── data ─────────────

async function calendar() {
  if (TOKEN) {
    const data = await graphql(`query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
      weeks{contributionDays{date contributionCount weekday}}}}}}`, { login: LOGIN });
    return data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w, week) =>
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

// GitHub search sometimes times out and returns a partial page flagged incomplete_results: retry, and fail
// rather than publish counts from partial data. The partial page stays cached for its URL, so each retry
// asks with a different URL. Search serves at most 10 pages of 100, and since each page is a separate query
// an item can repeat across pages, so items are keyed by URL.
async function searchAll(q) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const byUrl = new Map();
    let incomplete = false, capped = true;
    for (let page = 1; page <= 10; page++) {
      const j = await rest(`/search/issues?q=${encodeURIComponent(q)}&per_page=100&page=${page}&sort=created&order=desc${attempt > 1 ? `&attempt=${attempt}` : ''}`);
      incomplete ||= j.incomplete_results;
      for (const i of j.items) byUrl.set(i.html_url, i);
      if (j.items.length < 100) { capped = false; break; }
    }
    if (capped) throw new Error(`search "${q}" has more than 1000 results`);
    if (!incomplete) return [...byUrl.values()];
    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }
  throw new Error(`search "${q}" kept returning incomplete results`);
}

// The repositories of this account's merged and open pull requests. With a token, GraphQL lists them
// directly (never partial); without one, two narrow searches (GitHub times out on broad ones far more often).
async function pullRequestRepos() {
  if (TOKEN) {
    const prs = [];
    let after = null;
    do {
      const { user } = await graphql(`query($login:String!,$after:String){user(login:$login){
        pullRequests(first:100,after:$after,states:[MERGED,OPEN]){pageInfo{hasNextPage endCursor}nodes{state repository{nameWithOwner}}}}}`,
      { login: LOGIN, after });
      prs.push(...user.pullRequests.nodes);
      after = user.pullRequests.pageInfo.hasNextPage ? user.pullRequests.pageInfo.endCursor : null;
    } while (after);
    const of = (state) => prs.filter((p) => p.state === state).map((p) => p.repository.nameWithOwner);
    return { merged: of('MERGED'), open: of('OPEN') };
  }
  const repoOf = (i) => i.repository_url.split('/repos/')[1];
  return {
    merged: (await searchAll(`author:${LOGIN} type:pr is:merged`)).map(repoOf),
    open: (await searchAll(`author:${LOGIN} type:pr is:open`)).map(repoOf),
  };
}

async function pullRequests() {
  const upstream = (repo) => repo.split('/')[0].toLowerCase() !== LOGIN.toLowerCase();
  const prs = await pullRequestRepos();
  const merged = prs.merged.filter(upstream), open = prs.open.filter(upstream);

  // Synced merges are closed on GitHub, so neither source lists them as merged; their repository counts as
  // merged only while its commit log still credits this account.
  const credited = new Set();
  for (const repo of new Set(SYNCED_MERGES.map((u) => u.split('/').slice(3, 5).join('/'))))
    if ((await rest(`/repos/${repo}/commits?author=${LOGIN}&per_page=1`)).length) credited.add(repo);

  return { nativeMerged: merged.length, mergedRepos: new Set([...merged, ...credited]), openRepos: new Set(open), credited };
}

// Organisation logos = their GitHub avatars, kept in assets/orgs so each is downloaded only once.
async function avatars(owners) {
  const dir = join(ROOT, 'assets', 'orgs');
  mkdirSync(dir, { recursive: true });
  const out = {};
  for (const owner of owners) {
    const file = join(dir, `${owner}.png`);
    if (!existsSync(file)) {
      const r = await fetch(`https://github.com/${owner}.png?size=96`, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
      if (!r.ok) continue;
      writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    const buf = readFileSync(file);
    const mime = buf[0] === 0xff && buf[1] === 0xd8 ? 'image/jpeg' : 'image/png';
    out[owner] = `data:${mime};base64,` + buf.toString('base64');
  }
  return out;
}

// ───────────── derived facts ─────────────

const search = (q) => `https://github.com/search?q=${encodeURIComponent(`author:${LOGIN} type:pr ${q}`.trim())}&type=pullrequests`;
const MERGED_SEARCH = search('is:merged');
const OPEN_SEARCH = search('is:open');

// "20+" / "20 余个" only when the true count is above the round number; otherwise the exact count.
function countText(n, lang) {
  if (COUNT_STYLE === 'exact' || n < 10 || n % 10 === 0) return lang === 'zh' ? `${n} 个` : String(n);
  const r = Math.floor(n / 10) * 10;
  return lang === 'zh' ? `${r} 余个` : `${r}+`;
}

function facts(d) {
  const brands = BRANDS.map((b) => {
    const repos = [...d.mergedRepos].filter((r) => b.owners.includes(r.split('/')[0]));
    if (!repos.length) return null;
    const link = b.proof?.commits && d.credited.has(b.proof.commits)
      ? `https://github.com/${b.proof.commits}/commits/main?author=${LOGIN}`
      : search(`is:merged ${repos.map((r) => `repo:${r}`).join(' ')}`);
    return { ...b, repos, link };
  }).filter(Boolean);
  const branded = new Set(brands.flatMap((b) => b.repos));
  const others = [...d.mergedRepos].some((r) => !branded.has(r));
  const pillars = PILLARS.map((p) => ({ ...p, rows: p.repos.filter((r) => d.mergedRepos.has(r)) })).filter((p) => p.rows.length);
  const inGrid = new Set(pillars.flatMap((p) => p.rows));
  const review = REVIEW.show ? REVIEW.lead.filter((l) => d.openRepos.has(l.repo) && !inGrid.has(l.repo)) : [];
  return { ...d, brands, others, pillars, review };
}

// ───────────── panels (dark plates in the hero's visual language) ─────────────

const logoDefs = `<clipPath id="round" clipPathUnits="objectBoundingBox"><rect width="1" height="1" rx=".24"/></clipPath>
  <linearGradient id="num" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${C.sky}"/></linearGradient>`;

// An organisation's logo (its GitHub avatar) as a rounded tile; a quiet monogram when there is none.
function logo(src, x, y, size, fallback) {
  const r = f(size * 0.24);
  if (!src) return `<rect x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" rx="${r}" fill="${C.sky}" fill-opacity=".12" stroke="${C.sky}" stroke-opacity=".3"/>
    <text x="${f(x + size / 2)}" y="${f(y + size * 0.64)}" text-anchor="middle" class="sans" font-size="${f(size * 0.4)}" font-weight="700" fill="${C.text}">${esc(fallback)}</text>`;
  return `<rect x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" rx="${r}" fill="#fff"/>
    <image href="${src}" x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" clip-path="url(#round)" preserveAspectRatio="xMidYMid slice"/>
    <rect x="${f(x + 0.5)}" y="${f(y + 0.5)}" width="${size - 1}" height="${size - 1}" rx="${r}" fill="none" stroke="#fff" stroke-opacity=".3"/>`;
}

function upstreamSvg(F, lang, logos, { alt, count }) {
  const zh = lang === 'zh';
  const W = 1200, n = F.pillars.length;
  const rows = Math.min(MAX_ROWS, Math.max(...F.pillars.map((p) => p.rows.length)));
  const top = 148, rowH = 44;
  const H = top + rowH * rows + 12;
  const p = panel('u', W, H);
  const colW = (W - 80) / n;
  const cols = F.pillars.map((pl, i) => {
    const x0 = 40 + i * colW, x = x0 + (i ? 28 : 4), inner = colW - (i ? 56 : 32);
    const overflow = pl.rows.length > MAX_ROWS;
    const shown = pl.rows.slice(0, overflow ? MAX_ROWS - 1 : MAX_ROWS);
    const list = shown.map((repo, j) => {
      const y = top + j * rowH;
      const [name, org] = LABELS[repo] || [repo.split('/')[1], repo.split('/')[0]];
      const nameW = textWidth(name, 18) * 1.04;
      return `${logo(logos[repo.split('/')[0]], x, y, 32, name.slice(0, 2))}
        <text x="${f(x + 44)}" y="${y + 22}" class="sans"><tspan font-size="18" font-weight="600" fill="#fff">${esc(name)}</tspan><tspan font-size="16" fill="${C.textDim}"> · ${esc(fit(tr(org, lang), inner - 44 - nameW - 14, 16))}</tspan></text>`;
    }).join('');
    const more = overflow ? `<text x="${f(x + 44)}" y="${top + shown.length * rowH + 22}" class="sans" font-size="16" fill="${C.textDim}">+${pl.rows.length - shown.length}</text>` : '';
    return `${i ? `<rect x="${f(x0)}" y="100" width="1" height="${H - 124}" fill="${C.sky}" fill-opacity=".14"/>` : ''}
      <text x="${f(x)}" y="114" class="sans" font-size="21" font-weight="600" fill="${C.text}">${esc(fit(tr(pl.title, lang), inner, 21))}</text>
      <text x="${f(x)}" y="134" class="sans" font-size="15" fill="#8FB0DA">${esc(fit(tr(pl.desc, lang), inner, 15))}</text>
      ${list}${more}`;
  }).join('');
  const rand = rng(17);
  // Chinese labels use the sans face: next to CJK, a monospace space reads as a gap.
  const label = zh ? '个已合并的 PR' : 'MERGED PULL REQUESTS', labelSize = zh ? 13 : 11.5;
  const labelW = textWidth(label, labelSize, !zh) + (zh ? 1 : 2) * [...label].length;
  return `${svgOpen(W, H, alt)}
  <defs>${p.defs}${logoDefs}<style>${FONT_CSS}</style></defs>
  <g clip-path="url(#uClip)">
    ${p.bg}
    ${starfield(rand, { w: W, h: H, n: 46, maxR: 0.9, twinkle: 0.25 })}
    <text x="44" y="48" class="mono" font-size="12.5" letter-spacing="3" fill="${C.label}">${zh ? '横跨技术栈' : 'ACROSS THE STACK'}</text>
    <text x="${f(1156 - labelW - 12)}" y="52" text-anchor="end" class="serif" font-size="38" fill="url(#num)">${esc(count)}</text>
    <text x="1156" y="50" text-anchor="end" class="${zh ? 'sans' : 'mono'}" font-size="${labelSize}" letter-spacing="${zh ? 1 : 2}" fill="${C.label}">${label}</text>
    <rect x="44" y="72" width="1112" height="1" fill="${C.sky}" fill-opacity=".14"/>
    ${cols}
  </g>
  ${p.border}
</svg>`;
}

function reviewSvg(F, lang, logos, alt) {
  const W = 1200, H = 92;
  const p = panel('r', W, H);
  const label = lang === 'zh' ? '审核中' : 'IN REVIEW';
  const x0 = 44 + textWidth(label, 12.5, true) + 3 * [...label].length + 36;
  const cells = F.review.map((l, i) => {
    const x = x0 + i * 190;
    return `${logo(logos[l.repo.split('/')[0]], x, 28, 36, l.name.slice(0, 2))}
      <text x="${x + 48}" y="52" class="sans" font-size="19" font-weight="600" fill="#fff">${esc(l.name)}</text>`;
  }).join('');
  return `${svgOpen(W, H, alt)}
  <defs>${p.defs}${logoDefs}<style>${FONT_CSS}</style></defs>
  <g clip-path="url(#rClip)">
    ${p.bg}
    <text x="44" y="51" class="mono" font-size="12.5" letter-spacing="3" fill="${C.label}">${label}</text>
    ${cells}
  </g>
  ${p.border}
</svg>`;
}

// ───────────── README ─────────────

function list(items, lang) {
  if (lang === 'zh') return items.join('、');
  if (items.length < 2) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

const DECK_TEXT = {
  en: { title: 'CONTRIBUTIONS · PAST YEAR', note: 'each point is a day · stars are days with contributions', quiet: 'quiet', bright: 'bright', alt: 'The past year of contributions as a starfield, swept by a small black hole.' },
  zh: { title: '过去一年的贡献', note: '每个点是一天 · 亮星是有贡献的日子', quiet: '安静', bright: '明亮', alt: '过去一年的贡献画成星空，一个小黑洞正在扫过。' },
};

function readme(F, lang) {
  const zh = lang === 'zh';
  const T = (v) => tr(v, lang);
  const LIVE = `assets/live/${lang}`;
  const count = countText(F.nativeMerged, lang);
  const brandNames = F.brands.map((b) => T(b));
  const heroAlt = zh
    ? `${IDENTITY.name} —— ${T(IDENTITY.role)}。${T(IDENTITY.line)}。代码已合并进 ${list(brandNames, lang)}的开源项目。`
    : `${IDENTITY.name} — ${T(IDENTITY.role)}. ${T(IDENTITY.line)}. Code merged into open-source projects from ${list(brandNames, lang)}.`;
  const brandLinks = F.brands.map((b) => `[${T(b)}](${b.link})`);
  const focus = T(IDENTITY.focus).join(' · ');
  const stack = IDENTITY.languages.join(' · ');
  const leanLink = `[${zh ? '机器验证数学' : 'machine-checked mathematics'}](${IDENTITY.lean.url})`;
  const countLink = `[${zh ? `${count} PR` : `${count} pull requests`}](${MERGED_SEARCH})`;
  const merged = zh
    ? `${countLink}，涉及 ${list(brandLinks, lang)}${F.others ? '等' : ''}的开源项目`
    : `${countLink} in open-source projects from ${F.others ? `${brandLinks.join(', ')} and others` : list(brandLinks, lang)}`;
  const lines = zh
    ? [`**方向** · ${focus}`, `**技术栈** · ${stack} · Lean 4（${leanLink}）`, `**已合并进上游** · ${merged}`]
    : [`**Focus** · ${focus}`, `**Stack** · ${stack} · Lean 4 (${leanLink})`, `**Merged upstream** · ${merged}`];
  const gridAlt = (zh ? '已合并进上游。' : 'Merged upstream. ') + F.pillars.map((p) =>
    `${T(p.title)}${zh ? '：' : ': '}${p.rows.map((r) => { const [n, o] = LABELS[r] || [r]; return o ? `${n}${zh ? `（${T(o)}）` : ` (${T(o)})`}` : n; }).join(zh ? '、' : ', ')}`).join(zh ? '；' : '. ') + (zh ? '。' : '.');
  const reviewNames = F.review.map((l) => l.name);
  const reviewLine = zh ? `审核中：${list(reviewNames, lang)}` : `In review at ${list(reviewNames, lang)}`;
  const switcher = zh
    ? `<p align="left"><sub><a href="https://github.com/${LOGIN}">EN</a> · <b>中文</b></sub></p>`
    : `<p align="left"><sub><b>EN</b> · <a href="https://github.com/${LOGIN}/${LOGIN}/blob/main/README.zh-CN.md">中文</a></sub></p>`;

  return {
    text: `<!-- Generated by scripts/observatory.mjs from live GitHub data. Edit scripts/content.mjs, not this file. -->
${switcher}

<p><img src="${LIVE}/hero.svg" width="100%" alt="${esc(heroAlt)}"></p>

${lines.join('<br>\n')}

<sub><b>${esc(T(IDENTITY.status))}</b> · <a href="${SITE}">${SITE.replace('https://', '')}</a> · <a href="mailto:${EMAIL}">${EMAIL}</a></sub>

<p><img src="${LIVE}/upstream.svg" width="100%" alt="${esc(gridAlt)}"></p>
${F.review.length ? `
<details>
<summary>${reviewLine}</summary>
<br>
<p><a href="${OPEN_SEARCH}"><img src="${LIVE}/review.svg" width="100%" alt="${esc(reviewLine)}"></a></p>
</details>
` : ''}
<p><img src="${LIVE}/deck.svg" width="100%" alt="${esc(DECK_TEXT[lang].alt)}"></p>

<sub>${esc(T(AI_DISCLOSURE))}</sub>
`,
    heroAlt,
    gridAlt,
    reviewLine,
  };
}

// ───────────── truth guards ─────────────

function guard(F, pages, { assets }) {
  const problems = [];
  // Counts never overstate the native merged search the count links to.
  for (const lang of LANGS) {
    const shown = countText(F.nativeMerged, lang), n = parseInt(shown, 10);
    if (n > F.nativeMerged || ((shown.includes('+') || shown.includes('余')) && n >= F.nativeMerged))
      problems.push(`${lang} count "${shown}" overstates native merged ${F.nativeMerged}`);
  }
  // Every named organisation has merged code (synced merges only when the commit log credits them).
  for (const b of F.brands) if (!b.repos.length) problems.push(`brand ${b.key} has no merged repository`);
  // Banned phrases, anywhere in either README or any image text.
  for (const [name, body] of pages) for (const phrase of BANNED) if (body.includes(phrase)) problems.push(`${name} contains "${phrase}"`);
  // Every referenced asset exists (checked once the images are on disk).
  if (assets) for (const [name, body] of pages.filter(([n]) => n.endsWith('.md')))
    for (const m of body.matchAll(/(?:src|srcset)="(assets\/[^"]+)"/g))
      if (!existsSync(join(ROOT, m[1]))) problems.push(`${name} references missing ${m[1]}`);
  if (problems.length) throw new Error('truth guard failed:\n  ' + problems.join('\n  '));
}

// ───────────── main ─────────────

const [F, days] = await Promise.all([pullRequests().then(facts), calendar()]);
const owners = [...new Set([...F.pillars.flatMap((p) => p.rows), ...F.review.map((l) => l.repo)].map((r) => r.split('/')[0]))];
const logos = await avatars(owners);

const out = new Map(); // path -> content
for (const lang of LANGS) {
  const R = readme(F, lang);
  const dir = `assets/live/${lang}`;
  out.set(`${dir}/hero.svg`, heroSvg(ROOT, lang, { brands: F.brands.map((b) => tr(b.hero || b, lang)), alt: R.heroAlt }));
  out.set(`${dir}/upstream.svg`, upstreamSvg(F, lang, logos, { alt: R.gridAlt, count: countText(F.nativeMerged, 'en') }));
  if (F.review.length) out.set(`${dir}/review.svg`, reviewSvg(F, lang, logos, R.reviewLine));
  out.set(`${dir}/deck.svg`, deckSvg(days, DECK_TEXT[lang], lang));
  out.set(lang === 'en' ? 'README.md' : 'README.zh-CN.md', R.text);
}

// Content guards before anything is written; the asset check once the images are on disk; READMEs last.
const pages = [...out].map(([p, body]) => [p, body.replace(/data:[^"]+/g, '')]);
guard(F, pages, { assets: false });
rmSync(join(ROOT, 'assets', 'live'), { recursive: true, force: true });
for (const [p, body] of out) if (p.endsWith('.svg')) {
  mkdirSync(dirname(join(ROOT, p)), { recursive: true });
  writeFileSync(join(ROOT, p), clean(body));
}
guard(F, pages, { assets: true });
for (const [p, body] of out) if (p.endsWith('.md')) writeFileSync(join(ROOT, p), body);
console.log(`merged: ${F.nativeMerged} native in ${F.mergedRepos.size} repos · brands: ${F.brands.map((b) => b.key).join(', ')} · columns: ${F.pillars.map((p) => p.rows.length).join('/')} · review: ${F.review.map((l) => l.name).join(', ') || 'none'} · calendar: ${days.length} days`);
