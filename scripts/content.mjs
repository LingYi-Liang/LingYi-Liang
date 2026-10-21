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
    { label: { en: 'Fourier analysis on ℤₙ', zh: 'ℤₙ 上的傅里叶分析' }, a: 90, kind: 'topic' },
  ],
};
export const RING_PROJECTS = {
  name: { en: 'II · My projects', zh: 'II · 我的项目' }, note: { en: 'tools I built', zh: '自己做的工具' },
  planets: [
    { label: 'RefuteLoop', sub: { en: 'refutable AI claims', zh: '可反驳的 AI 论断' }, a: -150, kind: 'own' },
    { label: 'SkillSense', sub: { en: 'agent observability', zh: 'Agent 可观测性' }, a: -30, kind: 'own' },
    { label: { en: 'Anime wallpapers', zh: '二次元壁纸' }, sub: 'dsh-wallpaper-engine', a: 90, kind: 'own' },
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

// ── Plain-text introduction at the top of both READMEs. It is real text, not an image, so search
// engines, screen readers and text-only screening tools can read the page. Each track lists the merged
// pull requests that best show the work; the same list, in this order, picks the merged cards below.
// A pull request listed here only appears once it is actually merged.
export const INTRO = {
  name: 'LingYi',
  lead: {
    en: 'Independent researcher. I fix correctness and performance bugs in open-source AI infrastructure, mostly in two areas:',
    zh: '独立研究者。我在开源 AI 基础设施里修正确性和性能问题，主要集中在两个方向：',
  },
  tracks: [
    {
      title: { en: 'Agent context & runtime', zh: 'Agent 上下文与运行时' },
      note: { en: 'context compaction, memory and concurrency in agent frameworks', zh: '智能体框架里的上下文压缩、记忆与并发' },
      prs: [
        { url: 'https://github.com/google/adk-python/pull/7568', en: 'avoid quadratic scans of compacted session history', zh: '消除压缩后会话历史的平方级扫描' },
        { url: 'https://github.com/google/adk-python/pull/7583', en: 'recover the correct occurrence of reused compacted tool calls', zh: '压缩后重复出现的工具调用能找回正确的那一次' },
        { url: 'https://github.com/bytedance/deer-flow/pull/7152', en: 'preserve consecutive pre-compaction memory snapshots', zh: '连续压缩时保留每一份压缩前的记忆快照' },
        { url: 'https://github.com/bytedance/deer-flow/pull/6511', en: 'avoid executor starvation while tools wait on file locks', zh: '工具等待文件锁时不再把执行器线程占满' },
      ],
    },
    {
      title: { en: 'LLM serving & KV cache', zh: '大模型推理服务与 KV 缓存' },
      note: { en: 'keeping prefix-cache state correct as pods, models and event streams change', zh: '在节点、模型和事件流变化时保证前缀缓存的状态正确' },
      prs: [
        { url: 'https://github.com/vllm-project/aibrix/pull/3140', en: 'drop duplicate or out-of-order KV event batches and recover from publisher restarts', zh: 'KV 事件批次去重、补齐缺口，发布端重启后能恢复' },
        { url: 'https://github.com/vllm-project/aibrix/pull/3141', en: 'drop reverse index entries when a pod leaves the prefix cache', zh: '节点离开前缀缓存时清理反向索引，不再随节点更替无限增长' },
        { url: 'https://github.com/vllm-project/aibrix/pull/3142', en: 're-subscribe KV events when a pod switches model or LoRA', zh: '节点切换模型或 LoRA 时重新订阅 KV 事件并清掉旧条目' },
        { url: 'https://github.com/kvcache-ai/Mooncake/pull/4486', en: 'stop releasing pending task quota twice after history pruning', zh: '清理任务历史后不再重复释放待处理配额' },
      ],
    },
  ],
  math: {
    title: { en: 'Formal mathematics', zh: '形式化数学' },
    text: { en: 'a Lean 4 formalization that spectral sets tile in cyclic groups of square-free order', zh: '用 Lean 4 形式化证明：平方自由阶循环群中的谱集都能铺砌' },
    url: 'https://github.com/LingYi-Liang/squarefree-fuglede-lean',
  },
};

// Pull requests merged upstream through an internal sync (Google's Copybara). GitHub marks them as
// closed, but the change is on the project's default branch, so they count as merged here.
export const SYNCED_MERGES = [
  'https://github.com/google/adk-python/pull/7568',
  'https://github.com/google/adk-python/pull/7583',
];

// ── Open-source panel: one logo (the owner's GitHub avatar) per project with merged work,
// most merged first. Display names below; unlisted projects use their repository name.
export const PROJECTS = {
  'vllm-project/aibrix': 'AIBrix',
  'vllm-project/vllm': 'vLLM',
  'bytedance/deer-flow': 'DeerFlow',
  'bytedance/UI-TARS-desktop': 'UI-TARS',
  'google/adk-python': 'Google ADK',
  'Tencent/WeKnora': 'WeKnora',
  'Tencent-Hunyuan/UniRL': 'UniRL',
  'langgenius/dify': 'Dify',
  'kvcache-ai/Mooncake': 'Mooncake',
  'apache/fory-site': 'Apache Fory',
  'sgl-project/sglang': 'SGLang',
  'zai-org/Open-AutoGLM': 'AutoGLM',
  'cloudwego/eino': 'Eino',
  'modelscope/ms-agent': 'MS-Agent',
  'MiniMax-AI/MiniMax-MCP': 'MiniMax MCP',
  'llm-d/llm-d-router': 'llm-d',
  'deepseek-ai/DeepJIT': 'DeepJIT',
  'trpc-group/trpc-agent-go': 'tRPC Agent',
};
export const HEADLINE = {
  title: { en: 'AI Infra · Full-Stack', zh: 'AI 基础设施 · 全栈' },
  kicker: { en: 'MERGED INTO', zh: '代码已合并进' },
  directions: [
    { en: 'Agent context & runtime', zh: 'Agent 上下文与运行时' },
    { en: 'LLM serving & KV cache', zh: '推理服务与 KV 缓存' },
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
