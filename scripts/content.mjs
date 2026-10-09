// Everything you'd want to edit lives here. Each text has an English and a Chinese version.
// After editing:  node scripts/art.mjs && node scripts/observatory.mjs

export const LOGIN = 'LingYi-Liang';
export const SITE = 'https://lingyi-liang.github.io';
export const EMAIL = 'lingyi01525@gmail.com';

export const HEADER = {
  name: 'LingYi',
  label: { en: 'RESEARCH OBSERVATORY · LOG Nº 001', zh: '研究观测站 · 观测日志 Nº 001' },
  roles: [
    { en: 'LLM Reasoning & Efficient Learning', zh: 'LLM 推理与高效学习' },
    { en: 'Mathematics Researcher', zh: '数学研究者' },
  ],
  nowLabel: { en: 'CURRENTLY', zh: '当前专注' },
  now: { en: 'post-training · efficient learning', zh: '后训练 · 高效学习' },
  note: { en: 'SPECTRAL ⟺ TILE', zh: '谱集 ⟺ 铺砌' },
};

// ── Research universe: ring I (mathematics) and ring II (your projects).
// Ring III is drawn automatically from the projects your pull requests went to.
// Planet angles are degrees on the ellipse (0 = right, 90 = bottom).
// kind: 'topic' | 'own' | 'uncharted' (coming soon)
const UNCHARTED = { en: 'uncharted', zh: '未观测' };
const SOON = { en: 'coming soon', zh: '敬请期待' };
export const RING_MATH = {
  name: { en: 'I · Mathematics', zh: 'I · 数学' }, note: { en: 'inner orbit', zh: '内圈' },
  planets: [
    { label: { en: 'Spectral sets ⇄ tilings', zh: '谱集 ⇄ 铺砌' }, sub: { en: 'Lean 4 · machine-checked', zh: 'Lean 4 · 机器核验' }, a: -90, kind: 'own' },
    { label: { en: 'Fourier analysis on ℤₙ', zh: 'ℤₙ 上的傅里叶分析' }, a: 180, kind: 'topic' },
    { label: UNCHARTED, sub: SOON, a: 0, kind: 'uncharted' },
    { label: UNCHARTED, sub: SOON, a: 90, kind: 'uncharted' },
  ],
};
export const RING_PROJECTS = {
  name: { en: 'II · My projects', zh: 'II · 我的项目' }, note: { en: 'tools I built', zh: '自己做的工具' },
  planets: [
    { label: 'RefuteLoop', sub: { en: 'refutable AI claims', zh: '可反驳的 AI 论断' }, a: -150, kind: 'own' },
    { label: 'SkillSense', sub: { en: 'agent observability', zh: 'Agent 可观测性' }, a: -30, kind: 'own' },
    { label: { en: 'Anime wallpapers', zh: '二次元壁纸' }, sub: 'dsh-wallpaper-engine', a: 150, kind: 'own' },
    { label: { en: 'next project', zh: '下一个项目' }, sub: SOON, a: 30, kind: 'uncharted' },
  ],
};
export const UNIVERSE_TEXT = {
  ring3: { en: 'III · Pull requests', zh: 'III · 我的 PR' },
  ring3Note: { en: 'upstream projects', zh: '上游项目' },
  core: { en: 'efficient, verifiable reasoning', zh: '高效、可验证的推理' },
  keyMerged: { en: 'merged PR', zh: '已合并 PR' },
  keyReview: { en: 'PR in review', zh: '审核中 PR' },
  keyOwn: { en: 'my project', zh: '我的项目' },
  keyUncharted: { en: 'uncharted · coming soon', zh: '未观测 · 敬请期待' },
  prs: { en: (n, m) => `${n} PR${n > 1 ? 's' : ''}${m ? ` · ${m} merged` : ''}`, zh: (n, m) => `${n} 个 PR${m ? ` · ${m} 已合并` : ''}` },
};

// ── Open-source panel. Organisations are shown with their GitHub avatar (their logo);
// big companies first, everyone else after, ordered by stars. Unlisted owners use their login.
export const ORGS = {
  bytedance: { en: 'ByteDance', zh: '字节跳动', big: true },
  Tencent: { en: 'Tencent', zh: '腾讯', big: true },
  apache: { en: 'Apache', zh: 'Apache', big: true },
  'vllm-project': { en: 'vLLM', zh: 'vLLM' },
  langgenius: { en: 'Dify', zh: 'Dify' },
  'zai-org': { en: 'Zhipu AI', zh: '智谱' },
  'kvcache-ai': { en: 'Mooncake', zh: 'Mooncake' },
  modelscope: { en: 'ModelScope', zh: '魔搭' },
  'MiniMax-AI': { en: 'MiniMax', zh: 'MiniMax' },
  'llm-d': { en: 'llm-d', zh: 'llm-d' },
};
export const HEADLINE = {
  title: { en: 'AI Infra · Full-Stack', zh: 'AI 基础设施 · 全栈' },
  kicker: { en: 'CONTRIBUTOR TO', zh: '参与贡献' },
  directions: [
    { en: 'LLM inference & serving', zh: 'LLM 推理服务' },
    { en: 'Agent frameworks', zh: 'Agent 框架' },
    { en: 'RAG & knowledge', zh: 'RAG 与知识库' },
    { en: 'Post-training', zh: '后训练' },
    { en: 'Formal math · Lean 4', zh: '形式化数学 · Lean 4' },
  ],
};

export const DIVIDERS = {
  prs: { en: 'OPEN-SOURCE TRANSMISSIONS', zh: '开源贡献 · TRANSMISSIONS' },
  universe: { en: 'RESEARCH UNIVERSE', zh: '研究宇宙 · RESEARCH UNIVERSE' },
  deck: { en: 'OBSERVATION DECK', zh: '观测记录 · OBSERVATION DECK' },
};

export const FOOTER = {
  line: { en: 'Until the next observation.', zh: '下次观测再见。' },
  sub: { en: 'また次の観測で  ✦  下次观测再见', zh: 'また次の観測で  ✦  Until the next observation' },
};

// Shown as plain text under the footer, so it stays searchable and copyable.
export const AI_DISCLOSURE = {
  title: { en: 'AI use disclosure', zh: 'AI 使用说明' },
  body: {
    en: 'I may use AI tools to assist my work, including code and pull requests. Everything is carefully reviewed and read by me before it goes out — I make sure I understand it, and I take responsibility for the result.',
    zh: '我在工作中（包括代码与 PR）可能会使用 AI 辅助，但所有内容都经过本人严格审查和阅读，确认理解后才提交，并由本人对结果负责。',
  },
};

// Pick the language variant of a {en, zh} value; plain values pass through.
export const tr = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v) && 'en' in v ? v[lang] : v);
