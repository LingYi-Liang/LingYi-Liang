// Everything you'd want to edit lives here. Each text has an English and a Chinese version.
// After editing:  node scripts/observatory.mjs
//
// Organisations, repositories, counts and the review line come from live GitHub data and are checked by the
// truth guards in observatory.mjs before anything is written: an organisation is only named once one of its
// repositories has merged your code, counts never exceed what the linked search shows, and banned phrases
// fail the build. The prose below (line, focus, languages, Lean link, pillar descriptions) is hand-written.

export const LOGIN = 'LingYi-Liang';
export const SITE = 'https://lingyi-liang.github.io';
export const EMAIL = 'lingyi01525@gmail.com';

export const IDENTITY = {
  name: 'LingYi',
  role: { en: 'AI infrastructure engineer', zh: 'AI 基础设施工程师' },
  // Availability, shown first on the contact line.
  status: { en: 'Open to AI infra roles', zh: '寻求 AI 基础设施岗位机会' },
  // The one-line umbrella on the hero.
  line: { en: 'LLM systems & agents — serving, runtimes, frameworks', zh: '大模型系统与智能体：推理服务 · 运行时 · 框架' },
  focus: {
    en: ['Inference serving & KV caching', 'agent runtimes', 'RAG & RL frameworks'],
    zh: ['推理服务与 KV 缓存', '智能体运行时', 'RAG 与强化学习框架'],
  },
  // Languages of the merged code (hand-checked against the files changed by merged pull requests).
  languages: ['Go', 'Python', 'C++', 'TypeScript'],
  lean: {
    url: 'https://github.com/LingYi-Liang/squarefree-fuglede-lean',
    en: 'machine-checked mathematics in Lean 4',
    zh: '用 Lean 4 完成的机器验证数学',
  },
};

// 'rounded' shows 20+, 30+ … (never more than the merged-PR search shows); 'exact' shows the exact count.
export const COUNT_STYLE = 'rounded';

// Organisations named on the hero and in the intro, in this order. `owners` are the GitHub owners that
// count for the brand; `proof` is what the brand's link opens. A brand is shown only when at least one of
// its repositories has merged your code (synced merges count for Google, checked against its commit log).
export const BRANDS = [
  { key: 'google', owners: ['google'], en: 'Google', zh: 'Google', proof: { commits: 'google/adk-python' } },
  { key: 'bytedance', owners: ['bytedance'], en: 'ByteDance', zh: '字节跳动' },
  { key: 'tencent', owners: ['Tencent', 'Tencent-Hunyuan'], en: 'Tencent', zh: '腾讯' },
  // Only AIBrix is merged in this org (vLLM itself is still in review), so the label says so.
  { key: 'vllm', owners: ['vllm-project'], en: 'the vLLM project (AIBrix)', zh: 'vLLM 社区（AIBrix）', hero: { en: 'AIBrix (vLLM project)', zh: 'AIBrix（vLLM 社区）' } },
];

// "Merged upstream" grid: one column per layer of the LLM stack. A repository appears only once it has
// merged code; a column appears only once it has a row. Candidates listed here show up by themselves later.
export const PILLARS = [
  {
    title: { en: 'LLM serving & KV cache', zh: '推理服务与 KV 缓存' },
    desc: { en: 'KV events · prefix cache · routing', zh: 'KV 事件 · 前缀缓存 · 路由' },
    repos: ['vllm-project/aibrix', 'kvcache-ai/Mooncake', 'vllm-project/vllm', 'sgl-project/sglang', 'llm-d/llm-d-router'],
  },
  {
    title: { en: 'Agents & LLM apps', zh: '智能体与大模型应用' },
    desc: { en: 'Compaction · memory · concurrency', zh: '上下文压缩 · 记忆 · 并发' },
    repos: ['bytedance/deer-flow', 'google/adk-python', 'langgenius/dify', 'cloudwego/eino', 'trpc-group/trpc-agent-go', 'modelscope/ms-agent'],
  },
  {
    title: { en: 'RAG & RL frameworks', zh: 'RAG 与强化学习框架' },
    desc: { en: 'Document parsing · RL training', zh: '文档解析 · 强化学习训练' },
    repos: ['Tencent/WeKnora', 'Tencent-Hunyuan/UniRL'],
  },
];

// Display names: [project, organisation].
export const LABELS = {
  'vllm-project/aibrix': ['AIBrix', { en: 'vLLM project', zh: 'vLLM 社区' }],
  'vllm-project/vllm': ['vLLM', { en: 'vLLM project', zh: 'vLLM 社区' }],
  'kvcache-ai/Mooncake': ['Mooncake', 'KVCache.AI'],
  'sgl-project/sglang': ['SGLang', 'LMSYS'],
  'llm-d/llm-d-router': ['llm-d', 'llm-d'],
  'bytedance/deer-flow': ['DeerFlow', { en: 'ByteDance', zh: '字节跳动' }],
  'google/adk-python': ['ADK', 'Google'],
  'langgenius/dify': ['Dify', 'LangGenius'],
  'cloudwego/eino': ['Eino', 'CloudWeGo'],
  'trpc-group/trpc-agent-go': ['tRPC Agent', 'tRPC'],
  'modelscope/ms-agent': ['MS-Agent', { en: 'ModelScope', zh: '魔搭' }],
  'Tencent/WeKnora': ['WeKnora', { en: 'Tencent', zh: '腾讯' }],
  'Tencent-Hunyuan/UniRL': ['UniRL', { en: 'Tencent Hunyuan', zh: '腾讯混元' }],
  'deepseek-ai/DeepJIT': ['DeepJIT', 'DeepSeek'],
};

// The collapsed "In review" line names only these brands, and only while they have an open pull request.
export const REVIEW = {
  show: true,
  lead: [
    { repo: 'vllm-project/vllm', name: 'vLLM' },
    { repo: 'sgl-project/sglang', name: 'SGLang' },
    { repo: 'deepseek-ai/DeepJIT', name: 'DeepSeek' },
  ],
};

// Pull requests merged upstream through an internal sync (Google's Copybara). GitHub marks them as
// closed; they count as merged only while the project's commit log still credits you.
export const SYNCED_MERGES = [
  'https://github.com/google/adk-python/pull/7568',
  'https://github.com/google/adk-python/pull/7583',
];

// The stargazer on the hero: 'cameo' (animated), 'still' (one frame) or 'off'.
export const OC = { mode: 'cameo' };

// The painted sky behind the hero: 'azure' (青空, violet ink in the clouds) or 'galaxy' (Milky Way, violet-pink dawn).
export const SKY = 'azure';

export const AI_DISCLOSURE = {
  en: 'I use AI tools in my work; every change I submit is reviewed, understood and owned by me.',
  zh: '工作中会使用 AI 工具；我提交的每一处改动都经本人审阅、理解，并由本人负责。',
};

// Phrases that must never appear anywhere on the page (including alt text). The build fails if one does.
export const BANNED = [
  'merged into vLLM', 'vLLM contributor', 'Full-Stack', 'full-stack', '全栈', 'Mathematics Researcher', '数学研究者',
  'core contributor', 'maintainer', 'expert', '★', 'streak',
];

// Pick the language variant of a {en, zh} value; plain values pass through.
export const tr = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v) && 'en' in v ? v[lang] : v);
