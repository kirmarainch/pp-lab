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
    summary: '心智状态由功能角色构成，而不由材料构成。',
    lens: '你的实验是否把「功能相同」误当成了「体验相同」？',
    probeObjection:
      '如果你因为黑箱不透明就否认它有理解，你可能把「可解释」误当成了「有心智」；功能主义会要求你说明，缺失的到底是哪一种功能角色。',
    commitments: [
      '同一功能可以在不同物理基质上实现。',
      '解释心智时，先问它做什么，而不是它由什么组成。',
      '行为、内部组织与环境角色共同决定心智状态。',
    ],
    objections: [
      '中文屋：功能等价未必带来语义理解。',
      '哲学僵尸：功能相同未必伴随现象意识。',
    ],
    limitation: '功能主义内部差异很大；这张卡只覆盖经典功能主义的核心直觉。',
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
    summary: '理解需要生物系统产生语义；符号操作本身不构成理解。',
    lens: '你的黑箱是在模拟理解，还是仅仅在产生正确输出？',
    probeObjection:
      '你的系统即使输出正确，也可能只是在操作符号；正确输出本身不构成语义理解，除非你能说明意义是如何被系统把握的。',
    commitments: [
      '语法不足以产生语义。',
      '模拟理解不等于理解。',
      '意识与意向性依赖特定的生物因果能力。',
    ],
    objections: [
      '多重可实现性：非生物系统也可能实现同一功能。',
      '系统回复：中文屋里由规则组成的「系统」是否已经理解？',
    ],
    limitation: '这张卡把 Searle 的中文屋论证与生物自然主义放在一起；两者相关，但不等同。',
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
    summary: '解释要揭示产生现象的机制；复杂计算可能对认知者不透明。',
    lens: '你要求的「可解释」，是机制透明、理由可读，还是结果可核验？',
    probeObjection:
      '你要求的「可解释」可能过强：即使机制被完整给出，认知者仍可能无法逐步核验；反过来，结果可核验也不等于机制已经透明。',
    commitments: [
      '解释是给出实体、活动与组织方式，而不只是输入输出规律。',
      '即使结构公开，复杂计算也可能难以被人类逐步核验。',
      '可解释性是一个程度问题，不是二元属性。',
    ],
    objections: [
      '机制解释未必适用于社会、规范或整体性现象。',
      '不透明性可能通过更好的表征、工具或训练被缓解。',
    ],
    limitation: '机制解释与认识论不透明性来自不同文献传统；这张卡把它们组合成一个工作视角。',
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
