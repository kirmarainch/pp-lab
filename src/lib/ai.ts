import {
  ExperimentBriefSchema,
  ExperimentLensSchema,
  type ExperimentBrief,
  type ExperimentLens,
  type SceneSpec,
} from './schema'
import { resolveStanceById } from './content'
import {
  ENTITY_KINDS,
  KIND_META,
  SceneDraftSchema,
  type EntityKind,
  type SceneDraft,
} from './sceneDraft'
import { DEMO_MODE, runDemoExperiment, runDemoProbe, runDemoTest } from './demo'

export interface AiConfig {
  preset: string
  baseUrl: string
  model: string
}

export interface AiPreset {
  id: string
  label: string
  baseUrl: string
  model: string
}

export const AI_PRESETS: AiPreset[] = [
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'moonshot', label: 'Moonshot（Kimi）', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'custom', label: '自定义（OpenAI 兼容）', baseUrl: '', model: '' },
]

export const DEFAULT_AI_CONFIG: AiConfig = {
  preset: 'deepseek',
  baseUrl: AI_PRESETS[0].baseUrl,
  model: AI_PRESETS[0].model,
}

const CONFIG_STORAGE_KEY = 'pp-lab.ai.config'
const KEY_STORAGE_KEY = 'pp-lab.ai.key'

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return DEFAULT_AI_CONFIG
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    if (typeof parsed.baseUrl !== 'string' || typeof parsed.model !== 'string') {
      return DEFAULT_AI_CONFIG
    }
    return {
      preset: typeof parsed.preset === 'string' ? parsed.preset : 'custom',
      baseUrl: parsed.baseUrl,
      model: parsed.model,
    }
  } catch {
    return DEFAULT_AI_CONFIG
  }
}

export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // 存储不可用时配置只留在当前页面内存中。
  }
}

// 密钥只进 sessionStorage：关掉标签页就清除，不写 IndexedDB，不进导出。
export function loadApiKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveApiKey(key: string): void {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE_KEY, key)
    else sessionStorage.removeItem(KEY_STORAGE_KEY)
  } catch {
    // 忽略：密钥仍保留在内存中，本次会话可用。
  }
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa')
  ) {
    return true
  }
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 0 || a === 127 || a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }
  return false
}

// 自定义端点只允许公网 HTTPS，防止把密钥或请求发往本地/内网服务。
export function validateBaseUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return '请填写接口地址。'
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return '接口地址格式不对，应形如 https://api.example.com/v1'
  }
  if (url.protocol !== 'https:') return '只允许 https 接口地址。'
  if (url.username || url.password) return '地址里不能带账号密码。'
  if (isPrivateHostname(url.hostname)) return '不允许指向本地或内网地址。'
  return null
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

function friendlyHttpError(status: number): string {
  if (status === 401) return '密钥无效或已过期（401）。'
  if (status === 403) return '这个密钥没有访问权限（403）。'
  if (status === 404) return '接口地址或模型名不对（404）。'
  if (status === 429) return '请求太频繁或额度不足（429）。'
  if (status >= 500) return '服务商暂时不可用，请稍后再试。'
  return `服务商返回了错误（${status}）。`
}

async function readProviderError(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: { message?: string } }
    const message = data.error?.message
    if (typeof message === 'string' && message.trim()) return message.trim().slice(0, 160)
  } catch {
    // 响应体不是 JSON 时只报状态码。
  }
  return null
}

export interface AiTestResult {
  ok: boolean
  message: string
}

export async function testAiConnection(config: AiConfig, key: string): Promise<AiTestResult> {
  if (DEMO_MODE) return runDemoTest(key)
  const urlError = validateBaseUrl(config.baseUrl)
  if (urlError) return { ok: false, message: urlError }
  if (!key.trim()) return { ok: false, message: '请先填写 API 密钥。' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key.trim()}` },
      signal: controller.signal,
      redirect: 'error',
    })
    if (!response.ok) {
      const detail = await readProviderError(response)
      return { ok: false, message: friendlyHttpError(response.status) + (detail ? ` ${detail}` : '') }
    }
    return { ok: true, message: '连接成功，可以生成 AI 探针了。' }
  } catch {
    return { ok: false, message: '无法连接：请检查地址、网络，或该接口是否允许浏览器直接调用。' }
  } finally {
    clearTimeout(timer)
  }
}

export interface ProbeGenerationInput {
  title: string
  claim: string
  sceneSpec: SceneSpec
  stanceId: string | null
  targetPremise: string
  lens?: ExperimentLens | null
}

function buildProbeMessages(input: ProbeGenerationInput) {
  const stance = resolveStanceById(input.lens, input.stanceId)
  const conditions = input.sceneSpec.conditions
    .map((condition) => `- ${condition.label}（${condition.hint}）：${condition.value ? '开' : '关'}`)
    .join('\n')
  const stanceBlock = stance
    ? `立场：${stance.name}\n立场一句话：${stance.summary}\n核心承诺：\n${stance.commitments.map((item) => `- ${item}`).join('\n')}`
    : '立场：未选择。请从分析哲学的常识出发提出质疑。'

  const system = [
    '你是一个哲学思想实验里的「探针」：站在给定立场上，对用户的主张提出一条具体异议和一个追问。',
    '要求：异议必须针对用户主张里的具体前提，不要泛泛而谈；追问要能推动用户修改或捍卫主张；用中文，口语化但准确；不要编造文献。',
    '只输出一个 JSON 对象，不要输出其他文字：{"objection": "异议，40到80字", "question": "追问，一句话"}',
  ].join('\n')

  const user = [
    `实验：${input.title}`,
    `用户的主张：${input.claim.trim() || '（用户还没写主张，请针对实验场景本身提问）'}`,
    `场景条件：\n${conditions}`,
    stanceBlock,
    `重点质疑的前提：${input.targetPremise}`,
  ].join('\n\n')

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

export interface GeneratedProbe {
  objection: string
  question: string
}

function parseGeneratedProbe(content: string): GeneratedProbe | null {
  const fenced = content.replace(/```(?:json)?/gi, '').trim()
  const start = fenced.indexOf('{')
  const end = fenced.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const data = JSON.parse(fenced.slice(start, end + 1)) as {
      objection?: unknown
      question?: unknown
    }
    if (typeof data.objection !== 'string' || typeof data.question !== 'string') return null
    const objection = data.objection.trim()
    const question = data.question.trim()
    if (!objection || !question) return null
    return { objection: objection.slice(0, 400), question: question.slice(0, 200) }
  } catch {
    return null
  }
}

export async function generateAiProbe(
  config: AiConfig,
  key: string,
  input: ProbeGenerationInput,
): Promise<GeneratedProbe> {
  if (DEMO_MODE) return runDemoProbe(input)
  const urlError = validateBaseUrl(config.baseUrl)
  if (urlError) throw new Error(urlError)
  if (!config.model.trim()) throw new Error('请填写模型名。')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  try {
    const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        messages: buildProbeMessages(input),
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
      redirect: 'error',
    })
    if (!response.ok) {
      const detail = await readProviderError(response)
      throw new Error(friendlyHttpError(response.status) + (detail ? ` ${detail}` : ''))
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    const parsed = typeof content === 'string' ? parseGeneratedProbe(content) : null
    if (!parsed) throw new Error('模型返回的内容无法解析。')
    return parsed
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，服务商没有响应。')
    }
    if (error instanceof TypeError) {
      throw new Error('无法连接：请检查网络，或该接口是否允许浏览器直接调用。')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

const SCENE_SYSTEM_PROMPT = [
  '你是 PP Lab 的场景架构师：把用户描述的哲学思想实验拆解成组件，配置成一个可交互的 3D 舞台。',
  '',
  '舞台有 7 个固定组件位（kind），外观与位置固定，你只决定哪些出场、叫什么名字：',
  '- monolith 核心对象：被研究的系统或对象，内部默认不可见，条件开启时外壳变透明。几乎每个实验都需要。',
  '- core 内部机制：对象内部的运作机制，随条件显形。',
  '- channel 输入输出通道：对象与外界之间的信号、纸条、刺激通路。',
  '- observer 外部观察者：在对象之外提问、观察或体验的人。',
  '- verifier 独立检验者：独立于对象的测试、裁判或现实对照，随条件出现。',
  '- reason-ring 理由与价值：环绕对象的理由、理解或价值之环，随条件点亮。',
  '- environment 环境：实验发生的房间或实验室。',
  '',
  '条件（conditions）是实验的前提开关，用户逐个开启/关闭，舞台随之变化。每个条件用 targets 指定它作用于哪些组件位。',
  '',
  '拆解方法：',
  '1. 被考察的对象 → monolith；它的内部机制 → core；它与外界的交流 → channel。',
  '2. 谁在看/问/体验 → observer；独立的检验或对照 → verifier。',
  '3. 争论焦点涉及的理由、理解、价值 → reason-ring；场景背景 → environment。',
  '4. 把哲学前提写成 2–4 个条件。axis：epistemic（能否知道、解释）、social（能否被他人检验）、internal（内在理由、理解、价值）。',
  '5. 每个条件的 targets 选 1–3 个有外观变化的组件位（monolith/core/channel/verifier/reason-ring）；observer 与 environment 没有外观绑定，不要选。',
  '',
  '输出要求：',
  '- 只输出一个 JSON 对象，不要输出其他文字或代码块标记。',
  '- family 三选一：black-box-room（心智、科技哲学）、chinese-room（语言、理解）、experience-machine（价值、伦理），选最接近的。',
  '- title：中文实验名，不超过 16 字；subtitle：英文名，不超过 60 字符。',
  '- entities：4–7 个，kind 不重复；label 中文不超过 10 字；caption 大写英文不超过 30 字符。',
  '- conditions：2–4 个；id 用短英文 slug，语义相符时优先用 interpretable / verifiable / has-reasons（立场卡会针对它们提问）；label 中文不超过 10 字；hint 一句话解释前提，不超过 50 字。',
  '- 文字贴合用户描述的实验，不要编造文献。',
  '',
  '除了场景，还要整理这个实验：',
  '- situation：≤200 字复述情境（谁、面对什么、要判断什么），忠于用户描述，不编造细节。',
  '- notes：0–4 条字符串，每条 ≤60 字，标出描述里的含混词、需澄清的概念、以及控制条件（例：「准确率相同只是控制条件，不意味着两者在所有相关方面相同」）。',
  '- claimDraft：若用户给了初步判断，把它整理成一句可检验的主张（≤80 字，保留原意，不替用户改变立场）；若没给，输出空字符串 ""。',
  '- lens：为这个实验生成一个批判性质询视角，对象 {name, en, summary, lens, probeObjection, commitments, objections, limitation, probeTargetConditionId}。name 中文 ≤8 字；summary 一句话；lens 一句追问；probeObjection 40–80 字具体异议；commitments 2–3 条；objections 1–2 条；limitation 必须包含「由 AI 生成的工作视角，不代表任何哲学家本人立场」；probeTargetConditionId 从 conditions 的 id 里选最相关的一个。它是工作视角，不要编造文献。',
  '',
  'JSON 结构：',
  '{"family":"black-box-room","title":"…","subtitle":"…","entities":[{"kind":"monolith","label":"…","caption":"…"}],"conditions":[{"id":"interpretable","label":"…","hint":"…","axis":"epistemic","targets":["monolith","core"]}],"situation":"…","notes":["…"],"claimDraft":"…","lens":{"name":"…","en":"…","summary":"…","lens":"…","probeObjection":"…","commitments":["…"],"objections":["…"],"limitation":"由 AI 生成的工作视角，不代表任何哲学家本人立场。","probeTargetConditionId":"interpretable"}}',
].join('\n')

function normalizeRawScene(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const data = raw as Record<string, unknown>
  const validKinds = new Set<string>(ENTITY_KINDS)

  const seenKinds = new Set<string>()
  const entities: Array<Record<string, unknown>> = []
  for (const item of Array.isArray(data.entities) ? data.entities : []) {
    if (typeof item !== 'object' || item === null) continue
    const entity = item as Record<string, unknown>
    const kind = typeof entity.kind === 'string' ? entity.kind : ''
    if (!validKinds.has(kind) || seenKinds.has(kind)) continue
    seenKinds.add(kind)
    const meta = KIND_META[kind as EntityKind]
    entities.push({
      kind,
      label:
        typeof entity.label === 'string' && entity.label.trim()
          ? entity.label
          : meta.defaultLabel,
      caption: typeof entity.caption === 'string' ? entity.caption : meta.defaultCaption,
    })
    if (entities.length >= 7) break
  }

  const seenIds = new Set<string>()
  const conditions: Array<Record<string, unknown>> = []
  const rawConditions = Array.isArray(data.conditions) ? data.conditions : []
  rawConditions.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return
    const condition = item as Record<string, unknown>
    let id =
      typeof condition.id === 'string' && condition.id.trim()
        ? condition.id.trim().slice(0, 32)
        : `cond-${index + 1}`
    if (seenIds.has(id)) id = `${id}-${index + 1}`.slice(0, 32)
    seenIds.add(id)
    const targets = Array.isArray(condition.targets)
      ? [
          ...new Set(
            condition.targets.filter(
              (target): target is string => typeof target === 'string' && validKinds.has(target),
            ),
          ),
        ]
      : []
    conditions.push({
      id,
      label:
        typeof condition.label === 'string' && condition.label.trim()
          ? condition.label
          : `条件 ${index + 1}`,
      hint: typeof condition.hint === 'string' ? condition.hint : '',
      axis:
        condition.axis === 'social' || condition.axis === 'internal'
          ? condition.axis
          : 'epistemic',
      targets,
    })
  })

  return {
    family:
      data.family === 'chinese-room' || data.family === 'experience-machine'
        ? data.family
        : 'black-box-room',
    title: typeof data.title === 'string' && data.title.trim() ? data.title : '未命名实验',
    subtitle:
      typeof data.subtitle === 'string' && data.subtitle.trim()
        ? data.subtitle
        : 'Untitled Experiment',
    entities,
    conditions: conditions.slice(0, 8),
  }
}

function normalizeRawBrief(raw: Record<string, unknown>): ExperimentBrief {
  const situation = typeof raw.situation === 'string' ? raw.situation.trim().slice(0, 200) : ''
  const notes = Array.isArray(raw.notes)
    ? raw.notes
        .filter((note): note is string => typeof note === 'string' && Boolean(note.trim()))
        .map((note) => note.trim().slice(0, 60))
        .slice(0, 4)
    : []
  return { situation, notes }
}

const LENS_DISCLAIMER = '由 AI 生成的工作视角，不代表任何哲学家本人立场'

function normalizeRawLens(raw: unknown): ExperimentLens | null {
  if (typeof raw !== 'object' || raw === null) return null
  const data = raw as Record<string, unknown>
  const str = (value: unknown, fallback = '') =>
    typeof value === 'string' && value.trim() ? value.trim() : fallback
  const arr = (value: unknown, max: number) =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
          .map((item) => item.trim())
          .slice(0, max)
      : []
  const name = str(data.name)
  if (!name) return null
  const limitation = str(data.limitation)
  return {
    id: 'stance-custom',
    name: name.slice(0, 20),
    en: str(data.en, 'CUSTOM LENS'),
    summary: str(data.summary),
    lens: str(data.lens),
    probeObjection: str(data.probeObjection),
    commitments: arr(data.commitments, 4),
    objections: arr(data.objections, 3),
    limitation: limitation.includes(LENS_DISCLAIMER)
      ? limitation
      : `${limitation ? `${limitation} ` : ''}${LENS_DISCLAIMER}。`,
    ...(typeof data.probeTargetConditionId === 'string' && data.probeTargetConditionId.trim()
      ? { probeTargetConditionId: data.probeTargetConditionId.trim() }
      : {}),
  }
}

export interface GeneratedExperiment {
  scene: SceneDraft
  brief: ExperimentBrief
  claimDraft: string
  lens: ExperimentLens | null
}

function parseGeneratedExperiment(content: string, hasInitialClaim: boolean): GeneratedExperiment {
  const fenced = content.replace(/```(?:json)?/gi, '').trim()
  const start = fenced.indexOf('{')
  const end = fenced.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型没有返回可用的场景结构，请重试。')
  let raw: unknown
  try {
    raw = JSON.parse(fenced.slice(start, end + 1))
  } catch {
    throw new Error('模型返回的内容不是合法 JSON，请重试。')
  }
  const parsed = SceneDraftSchema.safeParse(normalizeRawScene(raw))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new Error(
      `模型返回的场景结构不完整（${issue?.path.join('.') || '未知字段'}），请重试或改用模板创建。`,
    )
  }
  const rawObj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const brief = ExperimentBriefSchema.parse(normalizeRawBrief(rawObj))
  const normalizedLens = normalizeRawLens(rawObj.lens)
  const lens = normalizedLens ? ExperimentLensSchema.parse(normalizedLens) : null
  const claimDraft = hasInitialClaim && typeof rawObj.claimDraft === 'string'
    ? rawObj.claimDraft.trim().slice(0, 80)
    : ''
  return { scene: parsed.data, brief, claimDraft, lens }
}

export async function generateAiExperiment(
  config: AiConfig,
  key: string,
  description: string,
  initialClaim = '',
  onStage?: (stage: string) => void,
): Promise<GeneratedExperiment> {
  if (DEMO_MODE) return runDemoExperiment(initialClaim, onStage)
  const urlError = validateBaseUrl(config.baseUrl)
  if (urlError) throw new Error(urlError)
  if (!config.model.trim()) throw new Error('请填写模型名。')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)
  try {
    const userContent = initialClaim.trim()
      ? `用户的实验描述：\n${description}\n\n用户的初步判断：\n${initialClaim.trim()}`
      : `用户的实验描述：\n${description}`
    const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        messages: [
          { role: 'system' as const, content: SCENE_SYSTEM_PROMPT },
          { role: 'user' as const, content: userContent },
        ],
        temperature: 0.6,
        max_tokens: 2200,
      }),
      signal: controller.signal,
      redirect: 'error',
    })
    if (!response.ok) {
      const detail = await readProviderError(response)
      throw new Error(friendlyHttpError(response.status) + (detail ? ` ${detail}` : ''))
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('模型返回的内容无法解析。')
    const generated = parseGeneratedExperiment(content, Boolean(initialClaim.trim()))
    if (!generated.brief.situation) {
      generated.brief.situation = description.trim().slice(0, 200)
    }
    return generated
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，服务商没有响应。')
    }
    if (error instanceof TypeError) {
      throw new Error('无法连接：请检查网络，或该接口是否允许浏览器直接调用。')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}