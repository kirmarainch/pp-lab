import type { Experiment, ExperimentLens } from './schema'

export interface StanceSource {
  citation: string
  url: string
}

export interface Stance {
  id: string
  name: string
  en: string
  summary: string
  lens: string
  probeObjection: string
  commitments: string[]
  objections: string[]
  limitation: string
  sources: StanceSource[]
  probeTargetConditionId?: string
}

// 内容草案：立场卡的结构已接通，具体措辞与来源仍可由用户逐条替换。
export const STANCES: Stance[] = [
  {
    id: 'stance-functionalism',
    name: '功能主义',
    en: 'FUNCTIONALISM',
    summary: '心智状态由功能角色决定，跟它用什么材料实现关系不大。',
    lens: '你的实验是不是把「功能一样」当成了「体验一样」？',
    probeObjection:
      '你可能把「可解释」当成了「有心智」。功能主义会追问：如果功能角色都齐了，你到底还缺哪一项？',
    commitments: [
      '同一套功能，可以在不同的物理系统里实现。',
      '解释心智时，先看它做什么，再看它由什么组成。',
      '行为、内部组织和环境角色一起决定心智状态。',
    ],
    objections: [
      '中文屋：功能对上，不代表它理解。',
      '哲学僵尸：功能一样，也不一定有体验。',
    ],
    limitation: '功能主义内部差别很大，这张卡只取经典版本的核心直觉。',
    sources: [
      {
        citation: 'SEP: Functionalism（含 Putnam 1967 以来的讨论）',
        url: 'https://plato.stanford.edu/entries/functionalism/',
      },
    ],
    probeTargetConditionId: 'interpretable',
  },
  {
    id: 'stance-searle',
    name: '生物自然主义',
    en: 'BIOLOGICAL NATURALISM',
    summary: '理解不是符号操作。它需要能产生意义的生物系统。',
    lens: '你的黑箱是在理解，还是只是在输出正确答案？',
    probeObjection:
      '输出正确，也可能只是在操作符号。除非你能说明意义是怎么被系统把握的，否则它仍然不算理解。',
    commitments: [
      '语法本身产生不了语义。',
      '模拟理解，不等于理解。',
      '意识和意向性来自特定的生物因果能力，不是纯符号规则。',
    ],
    objections: [
      '多重可实现性：非生物系统也可能实现同样的功能。',
      '系统回复：中文屋里由规则组成的「系统」，算不算已经理解？',
    ],
    limitation: '这张卡把 Searle 的中文屋论证和生物自然主义放在一起。两者相关，但不等同。',
    sources: [
      {
        citation: 'Searle, Minds, Brains, and Programs (1980); SEP: The Chinese Room Argument',
        url: 'https://plato.stanford.edu/entries/chinese-room/',
      },
    ],
    probeTargetConditionId: 'has-reasons',
  },
  {
    id: 'stance-mechanism',
    name: '机制解释',
    en: 'MECHANISTIC EXPLANATION',
    summary: '解释一件事，要说明它是怎么产生的；复杂计算可能连原理都难以逐步核验。',
    lens: '你说的「可解释」，是机制透明、理由可读，还是结果可核验？',
    probeObjection:
      '你要求的「可解释」可能太强。机制完整给出，认知者也未必能一步步核验；结果可核验，也不等于机制透明。',
    commitments: [
      '解释要给出实体、活动和组织方式，不只是输入输出规律。',
      '结构公开，不等于人类就能逐步核验。',
      '可解释性有程度之分，不是有或没有。',
    ],
    objections: [
      '机制解释未必适用于社会、规范或整体性现象。',
      '更好的表征、工具或训练，可能缓解不透明。',
    ],
    limitation: '机制解释和认识论不透明性来自不同文献传统，这张卡把它们拼成一个工作视角。',
    sources: [
      {
        citation: 'Machamer, Darden & Craver, Thinking about Mechanisms (2000); SEP: Mechanisms in Science',
        url: 'https://plato.stanford.edu/entries/science-mechanisms/',
      },
      {
        citation: 'Humphreys, Extending Ourselves (2004); SEP: Computer Simulations in Science',
        url: 'https://plato.stanford.edu/entries/simulations-science/',
      },
    ],
    probeTargetConditionId: 'interpretable',
  },
]

export const STANCE_BY_ID: Record<string, Stance> = Object.fromEntries(
  STANCES.map((stance) => [stance.id, stance]),
)

export const CUSTOM_LENS_ID = 'stance-custom'

export function stancesFor(experiment: Experiment | null): Stance[] {
  if (experiment?.lens) return [{ ...experiment.lens, sources: [] }, ...STANCES]
  return STANCES
}

export function resolveStanceById(
  lens: ExperimentLens | null | undefined,
  stanceId: string | null,
): Stance | undefined {
  if (!stanceId) return undefined
  if (lens && stanceId === lens.id) return { ...lens, sources: [] }
  return STANCE_BY_ID[stanceId]
}

export function resolveStance(
  experiment: Experiment | null,
  stanceId: string | null,
): Stance | undefined {
  return resolveStanceById(experiment?.lens, stanceId)
}

export const PROBE_STATUS_LABEL = {
  open: '待回应',
  retained: '已保留',
  answered: '已回应',
  revised: '已修订',
} as const

// 探针文案占位：没有选择立场时使用；选择立场后由立场卡生成。
export const PROBE_PLACEHOLDER = {
  targetPremise: '（待填写：目标前提）',
  objection: '（待填写：异议）',
  question: '（待填写：追问）',
} as const
