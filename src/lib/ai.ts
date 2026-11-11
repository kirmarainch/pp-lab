import type { SceneSpec } from './schema'
import { STANCE_BY_ID } from './content'

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
}

function buildProbeMessages(input: ProbeGenerationInput) {
  const stance = input.stanceId ? STANCE_BY_ID[input.stanceId] : undefined
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