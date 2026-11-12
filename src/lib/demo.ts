import { resolveStanceById } from './content'
import {
  ExperimentBriefSchema,
  ExperimentLensSchema,
  type ExperimentBrief,
  type ExperimentLens,
} from './schema'
import { SceneDraftSchema, type SceneDraft } from './sceneDraft'
import type { AiTestResult, GeneratedExperiment, GeneratedProbe, ProbeGenerationInput } from './ai'

// 演示模式（地址栏加 ?demo=1）：为录屏与无密钥体验准备。
// 整个 AI 流程走预置脚本，不发起任何网络请求；正常模式不受影响。
const demoFlag =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('demo') : null
export const DEMO_MODE = demoFlag !== null && demoFlag !== '0' && demoFlag !== 'false'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const DEMO_SCENE: SceneDraft = SceneDraftSchema.parse({
  family: 'black-box-room',
  title: '同一个答案',
  subtitle: 'The Same Answer',
  entities: [
    { kind: 'monolith', label: '诊断系统', caption: 'DIAGNOSIS SYSTEM' },
    { kind: 'core', label: '推理过程', caption: 'REASONING' },
    { kind: 'channel', label: '诊断建议', caption: 'RECOMMENDATION' },
    { kind: 'observer', label: '医生', caption: 'DOCTOR' },
    { kind: 'verifier', label: '独立核验', caption: 'INDEPENDENT CHECK' },
    { kind: 'reason-ring', label: '追责理由', caption: 'ACCOUNTABILITY' },
    { kind: 'environment', label: '诊室', caption: 'CLINIC' },
  ],
  conditions: [
    {
      id: 'source-visible',
      label: '来源可见',
      hint: '诊断来自人类专家还是 AI，对医生是否可见。',
      axis: 'epistemic',
      targets: ['monolith', 'channel'],
    },
    {
      id: 'verifiable',
      label: '可独立核验',
      hint: '诊断建议能否被独立于来源的检验复核。',
      axis: 'social',
      targets: ['verifier'],
    },
    {
      id: 'accountable',
      label: '可说明理由',
      hint: '给出诊断的一方能否说明理由、承担责任。',
      axis: 'internal',
      targets: ['reason-ring', 'core'],
    },
  ],
})

const DEMO_BRIEF: ExperimentBrief = ExperimentBriefSchema.parse({
  situation:
    '医生面对两套诊断：人类专家与 AI。建议相同，准确率相同（控制条件），推理都不可说明。你要判断：是否应该同等信任。',
  notes: [
    '「准确率相同」只是控制条件，不意味着两者在所有相关方面相同。',
    '「信任」含混：可指预测可靠性，也可指可追责、可审查的制度性信任。',
    '设定中两者推理都不可说明；若一方变得可说明，结论可能不同。',
  ],
})

const DEMO_LENS: ExperimentLens = ExperimentLensSchema.parse({
  id: 'stance-custom',
  name: '来源相关性视角',
  en: 'SOURCE RELEVANCE',
  summary: '信任不只关乎准确率：可追责性与可审查性也是信任的一部分。',
  lens: '如果准确率与核验结果都相同，「来自人类还是 AI」还剩下什么道德或认识上的分量？',
  probeObjection:
    '你主张「准确率相同就应同等信任」，但信任不只关乎准确率：出了问题能否追责、理由能否被审查，也是信任的一部分；你把信任简化成了单一指标。',
  commitments: [
    '信任包含可追责性与可审查性，不只是准确率。',
    '相关差异需要论证，不能默认来源无关。',
  ],
  objections: ['若独立核验充分，来源差异可能确实不再相关。'],
  limitation: '由 AI 生成的工作视角，不代表任何哲学家本人立场。',
  probeTargetConditionId: 'source-visible',
})

const DEMO_STAGES: Array<[string, number]> = [
  ['正在解析实验描述…', 900],
  ['正在识别对象、观察者与检验…', 950],
  ['正在映射三维场景组件…', 1000],
  ['正在生成前提开关…', 950],
  ['正在整理情境说明与含混处…', 1000],
  ['正在组装场景与质询视角…', 900],
]

export async function runDemoTest(key: string): Promise<AiTestResult> {
  if (!key.trim()) return { ok: false, message: '请先填写 API 密钥。' }
  await delay(1100)
  return { ok: true, message: '连接成功，可以生成 AI 探针了。' }
}

export async function runDemoExperiment(
  initialClaim: string,
  onStage?: (stage: string) => void,
): Promise<GeneratedExperiment> {
  for (const [text, ms] of DEMO_STAGES) {
    onStage?.(text)
    await delay(ms)
  }
  const claim = initialClaim.trim()
  return {
    scene: structuredClone(DEMO_SCENE),
    brief: structuredClone(DEMO_BRIEF),
    claimDraft: claim ? claim.slice(0, 80) : '',
    lens: structuredClone(DEMO_LENS),
  }
}

const DEMO_PROBE_LENS: GeneratedProbe = {
  objection:
    '准确率相同，只说明两者在「预测对」这件事上等价。但信任还包含另一层：出了错，谁能被追责、谁能把理由说清楚。你把制度性的信任简化成了一个统计指标。',
  question: '如果两套系统给出同样错误的诊断，你能向谁追问理由？这个差别为什么不影响你该信任谁？',
}

const DEMO_PROBE_BY_STANCE: Record<string, GeneratedProbe> = {
  'stance-functionalism': {
    objection:
      '你的判断可能预设了「只有生物大脑才配有心智」。可如果功能角色完全一致——输入、输出、内部组织都对上——你还能指出哪一项功能差异，足以把心智排除在外？',
    question: '如果功能完全等价，你凭什么说它没有心智——缺的到底是功能，还是材料？',
  },
  'stance-searle': {
    objection:
      '行为对答如流，不等于理解。屋里的人可以靠规则书给出全对的中文回答，却一个中文字都不懂；你的系统可能也在做同样的符号操纵。',
    question: '除了输出正确，你还能指出什么，表明它真的把握了意义？',
  },
  'stance-mechanism': {
    objection:
      '你要求的「可解释」可能太强了。机制即使完整公开，人也未必能逐步核验；反过来，结果可核验也不等于机制透明。你把不同程度的可解释性当成了非有即无。',
    question: '你说的可解释，到底是机制透明、理由可读，还是结果可核验？',
  },
}

const DEMO_PROBE_GENERIC: GeneratedProbe = {
  objection:
    '你的主张把实验里的某个前提当成了理所当然。试着关掉一个条件开关：如果那个前提变了，你的结论还成立吗？',
  question: '哪一个前提一旦改变，你的判断就不再成立？',
}

export async function runDemoProbe(input: ProbeGenerationInput): Promise<GeneratedProbe> {
  await delay(2400)
  const stance = resolveStanceById(input.lens, input.stanceId)
  if (stance && DEMO_PROBE_BY_STANCE[stance.id]) {
    return structuredClone(DEMO_PROBE_BY_STANCE[stance.id])
  }
  if (input.lens && stance?.id === input.lens.id) return structuredClone(DEMO_PROBE_LENS)
  return structuredClone(DEMO_PROBE_GENERIC)
}