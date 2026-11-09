import { z } from 'zod'

export const MAP_VIEWBOX = { width: 1200, height: 760 } as const
export const CURRENT_EXPERIMENT_NODE_ID = 'current-experiment'

export const MapConditionTagSchema = z.enum([
  'interpretable',
  'verifiable',
  'has-reasons',
])
export type MapConditionTag = z.infer<typeof MapConditionTagSchema>

export const MapNodeKindSchema = z.enum([
  'experiment',
  'theory',
  'concept',
  'case',
  'thought-experiment',
  'technical-case',
])
export type MapNodeKind = z.infer<typeof MapNodeKindSchema>

export const MapRelationTypeSchema = z.enum([
  'influence',
  'similarity',
  'counterexample',
  'support',
  'shared-topic',
  'proposed',
])
export type MapRelationType = z.infer<typeof MapRelationTypeSchema>

export const MAP_RELATION_META: Record<
  MapRelationType,
  {
    label: string
    en: string
    fullLabel: string
    arrow: boolean
    dash?: string
    tone: 'ink' | 'muted' | 'cyan' | 'vermilion' | 'amber' | 'faint'
    description: string
  }
> = {
  influence: {
    label: '历史影响',
    en: 'Historical influence',
    fullLabel: '历史影响 / Historical influence',
    arrow: true,
    tone: 'ink',
    description: '有文献可查的影响或回应关系；不等同于思想传承。',
  },
  similarity: {
    label: '论证相似',
    en: 'Argumentative similarity',
    fullLabel: '论证相似 / Argumentative similarity',
    arrow: false,
    tone: 'muted',
    description: '结构相似，不主张历史影响。',
  },
  counterexample: {
    label: '反例',
    en: 'Counterexample',
    fullLabel: '反例 / Counterexample',
    arrow: true,
    tone: 'vermilion',
    description: '一端被用来反驳另一端。',
  },
  support: {
    label: '支持',
    en: 'Support',
    fullLabel: '支持 / Support',
    arrow: true,
    tone: 'cyan',
    description: '一端为另一端提供论证支持。',
  },
  'shared-topic': {
    label: '共同议题',
    en: 'Shared topic',
    fullLabel: '共同议题 / Shared topic',
    arrow: false,
    dash: '2 6',
    tone: 'faint',
    description: '共享问题意识，不主张影响或支持。',
  },
  proposed: {
    label: '潜在关联',
    en: 'Proposed link',
    fullLabel: '潜在关联 / Proposed link',
    arrow: false,
    dash: '6 6',
    tone: 'amber',
    description: '系统提出、尚待文献核查的关联。',
  },
}

export const MAP_NODE_KIND_META: Record<
  MapNodeKind,
  { label: string; en: string; radius: number }
> = {
  experiment: { label: '当前实验', en: 'Current experiment', radius: 0 },
  theory: { label: '理论', en: 'Theory', radius: 34 },
  concept: { label: '概念', en: 'Concept', radius: 30 },
  case: { label: '案例', en: 'Case', radius: 30 },
  'thought-experiment': { label: '思想实验', en: 'Thought experiment', radius: 32 },
  'technical-case': { label: '技术案例', en: 'Technical case', radius: 30 },
}

const MapPointSchema = z.object({
  x: z.number().min(0).max(MAP_VIEWBOX.width),
  y: z.number().min(0).max(MAP_VIEWBOX.height),
})

export const MapSourceSchema = z.object({
  id: z.string().min(1),
  citation: z.string().min(1),
  url: z.string().url(),
  note: z.string().optional(),
})
export type MapSource = z.infer<typeof MapSourceSchema>

export const MapNodeSchema = z.object({
  id: z.string().min(1),
  kind: MapNodeKindSchema,
  title: z.string().min(1),
  en: z.string().min(1),
  summary: z.string().min(1),
  relevance: z.string().min(1),
  sourceIds: z.array(z.string()).default([]),
  conditionTags: z.array(MapConditionTagSchema).default([]),
  position: MapPointSchema,
})
export type MapNode = z.infer<typeof MapNodeSchema>

export const MapEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  type: MapRelationTypeSchema,
  explanation: z.string().min(1),
  sourceIds: z.array(z.string()).default([]),
  bend: z.number().min(-220).max(220).optional(),
  labelAt: z.number().min(0.15).max(0.85).optional(),
})
export type MapEdge = z.infer<typeof MapEdgeSchema>

export const StarMapSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    nodes: z.array(MapNodeSchema).min(1).max(30),
    edges: z.array(MapEdgeSchema).max(60),
    sources: z.array(MapSourceSchema).max(60),
  })
  .superRefine((map, ctx) => {
    const nodeIds = new Set<string>()
    for (const node of map.nodes) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({ code: 'custom', message: `重复的节点 id：${node.id}`, path: ['nodes'] })
      }
      nodeIds.add(node.id)
    }

    const edgeIds = new Set<string>()
    for (const edge of map.edges) {
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({ code: 'custom', message: `重复的边 id：${edge.id}`, path: ['edges'] })
      }
      edgeIds.add(edge.id)
      if (!nodeIds.has(edge.from)) {
        ctx.addIssue({ code: 'custom', message: `边引用了不存在的起点：${edge.from}`, path: ['edges'] })
      }
      if (!nodeIds.has(edge.to)) {
        ctx.addIssue({ code: 'custom', message: `边引用了不存在的终点：${edge.to}`, path: ['edges'] })
      }
      if (edge.type === 'influence' && edge.sourceIds.length === 0) {
        ctx.addIssue({ code: 'custom', message: `历史影响必须有来源：${edge.id}`, path: ['edges'] })
      }
    }

    const sourceIds = new Set<string>()
    for (const source of map.sources) {
      if (sourceIds.has(source.id)) {
        ctx.addIssue({ code: 'custom', message: `重复的来源 id：${source.id}`, path: ['sources'] })
      }
      sourceIds.add(source.id)
    }

    for (const node of map.nodes) {
      for (const sourceId of node.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          ctx.addIssue({
            code: 'custom',
            message: `节点 ${node.id} 引用了不存在的来源：${sourceId}`,
            path: ['nodes'],
          })
        }
      }
    }

    for (const edge of map.edges) {
      for (const sourceId of edge.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          ctx.addIssue({
            code: 'custom',
            message: `边 ${edge.id} 引用了不存在的来源：${sourceId}`,
            path: ['edges'],
          })
        }
      }
    }
  })
export type StarMapSpec = z.infer<typeof StarMapSchema>

// 内容草案：所有文案与关系判断均可在实现后由用户逐条替换。
export const seedStarMap: StarMapSpec = StarMapSchema.parse({
  id: 'black-box-starmap-01',
  title: '黑箱与理解',
  subtitle: 'The Black Box and Understanding',
  nodes: [
    {
      id: CURRENT_EXPERIMENT_NODE_ID,
      kind: 'experiment',
      title: '当前实验',
      en: 'Current Experiment',
      summary: '（实时读取当前主张）',
      relevance: '当前实验本身；图谱中的其余节点都相对于它定位。',
      position: { x: 600, y: 360 },
    },
    {
      id: 'turing-test',
      kind: 'theory',
      title: '图灵测试',
      en: 'Turing Test',
      summary: '以回答能否区分人与机器，作为机器是否具有智能的操作性判据。',
      relevance: '它把判断依据压在可观察行为上，对应本实验的「可验证性」条件。',
      sourceIds: ['turing-1950'],
      conditionTags: ['verifiable'],
      position: { x: 340, y: 215 },
    },
    {
      id: 'behaviorism',
      kind: 'theory',
      title: '行为主义',
      en: 'Behaviorism',
      summary: '主张心理学应以外显行为而非内部状态为对象；心智语言被行为倾向替代或重新解释。',
      relevance: '它让「只看输入输出」成为一种方法论承诺，而不只是临时的黑箱比喻。',
      sourceIds: ['ryle-1949'],
      conditionTags: ['verifiable'],
      position: { x: 175, y: 385 },
    },
    {
      id: 'chinese-room',
      kind: 'theory',
      title: '中文屋',
      en: 'Chinese Room',
      summary: '不懂中文的人按规则处理中文符号，可以产出看似正确的回答，却不理解中文。',
      relevance: '它直接针对「系统在无理解的情况下运转」这一黑箱式设想，对应「有理由」条件。',
      sourceIds: ['searle-1980'],
      conditionTags: ['has-reasons'],
      position: { x: 300, y: 530 },
    },
    {
      id: 'space-of-reasons',
      kind: 'concept',
      title: '理由空间',
      en: 'Space of Reasons',
      summary: '信念与判断要在给出和索取理由的规范空间中才成立，而不只是因果状态。',
      relevance: '它把「有理由」与「能计算」区分开，是输入输出观察最难捕捉的一层。',
      sourceIds: ['sellars-1956'],
      conditionTags: ['has-reasons'],
      position: { x: 590, y: 150 },
    },
    {
      id: 'functionalism',
      kind: 'theory',
      title: '功能主义',
      en: 'Functionalism',
      summary: '心智状态由功能角色而非材料构成；同一功能可在不同物理基质上实现。',
      relevance: '它提供了把黑箱内部状态抽象为功能关系的路径，也承受中文屋与僵尸论证的攻击。',
      sourceIds: ['putnam-1967'],
      position: { x: 840, y: 205 },
    },
    {
      id: 'multiple-realizability',
      kind: 'concept',
      title: '多重可实现性',
      en: 'Multiple Realizability',
      summary: '同一心智功能可以由不同物理系统实现，因此不能把心智状态等同于某一种材料状态。',
      relevance: '它支持功能主义，也让「换一种基质是否仍是同一实验」成为可讨论的问题。',
      sourceIds: ['sep-multiple-realizability'],
      position: { x: 1030, y: 330 },
    },
    {
      id: 'explanatory-gap',
      kind: 'concept',
      title: '解释鸿沟',
      en: 'Explanatory Gap',
      summary: '即使物理事实被完整说明，为什么这些事实伴随某种主观体验，仍似乎没有得到解释。',
      relevance: '黑箱室能展示功能与条件变化，却不能自动填上「为什么有体验」的缺口。',
      sourceIds: ['levine-1983'],
      position: { x: 905, y: 455 },
    },
    {
      id: 'phenomenal-consciousness',
      kind: 'concept',
      title: '现象意识',
      en: 'Phenomenal Consciousness',
      summary: '经验的主观特征：成为某个系统「是什么感觉」，不同于可报告、可控制的信息加工。',
      relevance: '它提醒第三人称的场景读数不等于第一人称的体验。',
      sourceIds: ['nagel-1974'],
      position: { x: 820, y: 555 },
    },
    {
      id: 'philosophical-zombie',
      kind: 'thought-experiment',
      title: '哲学僵尸',
      en: 'Philosophical Zombie',
      summary: '一个在行为与功能上与正常人完全相同的存在，却没有内在体验；其可设想性被用来反驳功能主义。',
      relevance: '它把「功能相同是否等于体验相同」推到极端，是当前实验的边界测试。',
      sourceIds: ['chalmers-1996'],
      position: { x: 1025, y: 585 },
    },
    {
      id: 'mechanistic-explanation',
      kind: 'theory',
      title: '机制解释',
      en: 'Mechanistic Explanation',
      summary: '解释一个现象，是给出产生它的实体、活动与组织方式，而不只是输入输出规律。',
      relevance: '它提供了一条「打开黑箱」的解释路径，对应「可解释性」条件。',
      sourceIds: ['machamer-2000'],
      conditionTags: ['interpretable'],
      position: { x: 535, y: 620 },
    },
    {
      id: 'epistemic-opacity',
      kind: 'concept',
      title: '认识论不透明性',
      en: 'Epistemic Opacity',
      summary: '当计算过程的结果无法被人类从原理上追踪或核验时，系统对认知者就是不透明的。',
      relevance: '它把黑箱问题从「愿不愿意公开」推进到「即使公开也读不懂」。',
      sourceIds: ['humphreys-2004'],
      conditionTags: ['interpretable'],
      position: { x: 700, y: 690 },
    },
    {
      id: 'black-box-model',
      kind: 'technical-case',
      title: '黑箱模型',
      en: 'Black-box Model',
      summary: '只通过输入输出访问、内部机制不向使用者开放的模型；可解释性研究常以此类系统为对象。',
      relevance: '它是黑箱室的技术近亲：同样是可验证、未必可解释的系统。',
      sourceIds: ['rudin-2019'],
      conditionTags: ['interpretable'],
      position: { x: 200, y: 680 },
    },
  ],
  edges: [
    {
      id: 'e-center-turing',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'turing-test',
      type: 'similarity',
      explanation: '两者都把可观察行为当作判断依据；但图灵测试不回答内部是否理解。',
      sourceIds: ['turing-1950'],
      bend: -34,
    },
    {
      id: 'e-center-behaviorism',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'behaviorism',
      type: 'similarity',
      explanation: '行为主义把心理语言还原为行为倾向，黑箱式场景只保留输入输出。',
      sourceIds: ['ryle-1949'],
      bend: 26,
    },
    {
      id: 'e-center-chinese-room',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'chinese-room',
      type: 'similarity',
      explanation: '中文屋与黑箱室都呈现「正确输出但缺少理解」的系统。',
      sourceIds: ['searle-1980'],
      bend: -30,
    },
    {
      id: 'e-center-reasons',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'space-of-reasons',
      type: 'shared-topic',
      explanation: '「有理由」条件把问题从因果加工推进到规范理由。',
      sourceIds: ['sellars-1956'],
      bend: 20,
    },
    {
      id: 'e-center-gap',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'explanatory-gap',
      type: 'shared-topic',
      explanation: '两者都关心功能说明能否覆盖主观体验。',
      sourceIds: ['levine-1983'],
      bend: -24,
    },
    {
      id: 'e-center-opacity',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'epistemic-opacity',
      type: 'shared-topic',
      explanation: '认识论不透明性解释了为什么「公开代码」仍可能不解决问题。',
      sourceIds: ['humphreys-2004'],
      bend: 28,
    },
    {
      id: 'e-center-functionalism',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'functionalism',
      type: 'shared-topic',
      explanation: '功能主义试图用功能角色说明心智，与黑箱室的功能条件直接相关。',
      sourceIds: ['putnam-1967'],
      bend: 22,
    },
    {
      id: 'e-center-black-box',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'black-box-model',
      type: 'similarity',
      explanation: '黑箱模型是黑箱室的技术对应物：可查询、可验证、未必可解释。',
      sourceIds: ['rudin-2019'],
      bend: 36,
    },
    {
      id: 'e-center-mechanism',
      from: CURRENT_EXPERIMENT_NODE_ID,
      to: 'mechanistic-explanation',
      type: 'proposed',
      explanation: '机制解释可能把黑箱的条件读数转成可追踪的因果结构；本实验尚未验证。',
      bend: -42,
      labelAt: 0.42,
    },
    {
      id: 'e-chinese-turing',
      from: 'chinese-room',
      to: 'turing-test',
      type: 'counterexample',
      explanation: '中文屋被提出为对图灵测试式行为判据的反例。',
      sourceIds: ['searle-1980', 'turing-1950'],
      bend: -46,
    },
    {
      id: 'e-chinese-functionalism',
      from: 'chinese-room',
      to: 'functionalism',
      type: 'counterexample',
      explanation: 'Searle 认为功能等价不足以产生语义理解。',
      sourceIds: ['searle-1980'],
      bend: 54,
    },
    {
      id: 'e-chinese-reasons',
      from: 'chinese-room',
      to: 'space-of-reasons',
      type: 'support',
      explanation: '中文屋论证依赖「理解需要理由与语义」这一直觉，与理由空间相呼应。',
      sourceIds: ['searle-1980', 'sellars-1956'],
      bend: 38,
    },
    {
      id: 'e-multiple-functionalism',
      from: 'multiple-realizability',
      to: 'functionalism',
      type: 'support',
      explanation: '多重可实现性为功能主义提供核心论证：同一功能不必绑定同一基质。',
      sourceIds: ['sep-multiple-realizability', 'putnam-1967'],
      bend: -20,
    },
    {
      id: 'e-zombie-functionalism',
      from: 'philosophical-zombie',
      to: 'functionalism',
      type: 'counterexample',
      explanation: '若僵尸可设想，功能等价就不足以蕴含现象意识。',
      sourceIds: ['chalmers-1996'],
      bend: -38,
    },
    {
      id: 'e-gap-zombie',
      from: 'explanatory-gap',
      to: 'philosophical-zombie',
      type: 'influence',
      explanation: 'Chalmers 1996 明确以 Levine 1983 的解释鸿沟为出发点之一，并把它推进为僵尸论证。',
      sourceIds: ['levine-1983', 'chalmers-1996'],
      bend: 24,
    },
    {
      id: 'e-phenomenal-gap',
      from: 'phenomenal-consciousness',
      to: 'explanatory-gap',
      type: 'shared-topic',
      explanation: '现象意识是解释鸿沟讨论的对象，也是黑箱读数无法直接呈现的维度。',
      sourceIds: ['nagel-1974', 'levine-1983'],
      bend: 12,
    },
    {
      id: 'e-black-box-opacity',
      from: 'black-box-model',
      to: 'epistemic-opacity',
      type: 'shared-topic',
      explanation: '可解释性研究把模型不透明当作核心问题，而不只是工程细节。',
      sourceIds: ['rudin-2019', 'humphreys-2004'],
      bend: -16,
    },
    {
      id: 'e-black-box-mechanism',
      from: 'black-box-model',
      to: 'mechanistic-explanation',
      type: 'proposed',
      explanation: '用机制解释替代事后解释，是一条待检验的路径。',
      bend: 20,
    },
  ],
  sources: [
    {
      id: 'turing-1950',
      citation: 'Turing, Computing Machinery and Intelligence (1950); SEP: The Turing Test',
      url: 'https://plato.stanford.edu/entries/turing-test/',
      note: 'SEP 条目含原始论文的表述与后续争论。',
    },
    {
      id: 'ryle-1949',
      citation: 'Ryle, The Concept of Mind (1949); SEP: Behaviorism',
      url: 'https://plato.stanford.edu/entries/behaviorism/',
      note: 'SEP 条目梳理行为主义诸形态及其问题。',
    },
    {
      id: 'searle-1980',
      citation: 'Searle, Minds, Brains, and Programs (1980); SEP: The Chinese Room Argument',
      url: 'https://plato.stanford.edu/entries/chinese-room/',
      note: 'SEP 条目含原论证与主要回应。',
    },
    {
      id: 'sellars-1956',
      citation: 'Sellars, Empiricism and the Philosophy of Mind (1956); SEP: Wilfrid Sellars',
      url: 'https://plato.stanford.edu/entries/sellars/',
      note: '「理由空间」出自该书；SEP 条目给出语境。',
    },
    {
      id: 'putnam-1967',
      citation: 'Putnam, Psychological Predicates (1967); SEP: Functionalism',
      url: 'https://plato.stanford.edu/entries/functionalism/',
      note: 'SEP 条目梳理功能主义与 Putnam 的论证。',
    },
    {
      id: 'sep-multiple-realizability',
      citation: 'SEP: Multiple Realizability',
      url: 'https://plato.stanford.edu/entries/multiple-realizability/',
      note: '含多重可实现性与功能主义关系的系统讨论。',
    },
    {
      id: 'levine-1983',
      citation: 'Levine, Materialism and Qualia: The Explanatory Gap (1983); SEP: Consciousness',
      url: 'https://plato.stanford.edu/entries/consciousness/',
      note: 'SEP 条目讨论解释鸿沟及其后续。',
    },
    {
      id: 'nagel-1974',
      citation: 'Nagel, What Is It Like to Be a Bat? (1974); SEP: Consciousness',
      url: 'https://plato.stanford.edu/entries/consciousness/',
      note: 'SEP 条目讨论主观特征与第三人称说明的限度。',
    },
    {
      id: 'chalmers-1996',
      citation: 'Chalmers, The Conscious Mind (1996); SEP: Zombies',
      url: 'https://plato.stanford.edu/entries/zombies/',
      note: 'SEP 条目梳理僵尸论证与主要批评。',
    },
    {
      id: 'machamer-2000',
      citation: 'Machamer, Darden & Craver, Thinking about Mechanisms (2000); SEP: Mechanisms in Science',
      url: 'https://plato.stanford.edu/entries/science-mechanisms/',
      note: 'SEP 条目含机制解释的实体—活动—组织框架。',
    },
    {
      id: 'humphreys-2004',
      citation: 'Humphreys, Extending Ourselves (2004); SEP: Computer Simulations in Science',
      url: 'https://plato.stanford.edu/entries/simulations-science/',
      note: 'SEP 条目讨论计算模拟与认识论不透明性。',
    },
    {
      id: 'rudin-2019',
      citation: 'Rudin, Stop Explaining Black Box Machine Learning Models for High Stakes Decisions and Use Interpretable Models Instead (2019)',
      url: 'https://doi.org/10.1038/s42256-019-0048-x',
      note: 'Nature Machine Intelligence 1: 206–215.',
    },
  ],
})
