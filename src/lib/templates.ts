import { newId } from './id'
import { SceneSpecSchema, type Experiment, type ExperimentFamily, type SceneSpec } from './schema'
import { seedScene } from './seed'

export const FAMILY_LABEL: Record<ExperimentFamily, { zh: string; en: string }> = {
  'black-box-room': { zh: '黑箱室', en: 'Black Box Room' },
  'chinese-room': { zh: '中文屋', en: 'Chinese Room' },
  'experience-machine': { zh: '体验机', en: 'Experience Machine' },
}

export interface ExperimentTemplate {
  family: ExperimentFamily
  name: string
  tagline: string
  description: string
  buildScene: (title: string, subtitle: string) => SceneSpec
}

interface VariantLabels {
  entities: Record<string, { label: string; caption: string }>
  conditions: Record<string, { label: string; hint: string }>
}

// 三个模板共用同一套实体 kind、条件 id 与绑定，立场卡的目标前提因此始终有效。
function buildVariantScene(
  family: ExperimentFamily,
  title: string,
  subtitle: string,
  labels: VariantLabels,
): SceneSpec {
  const scene = structuredClone(seedScene)
  scene.family = family
  scene.title = title
  scene.subtitle = subtitle
  scene.entities = scene.entities.map((entity) => ({
    ...entity,
    ...(labels.entities[entity.id] ?? {}),
  }))
  scene.conditions = scene.conditions.map((condition) => ({
    ...condition,
    ...(labels.conditions[condition.id] ?? {}),
  }))
  scene.annotations = scene.annotations.map((annotation) => {
    const label = labels.entities[annotation.entityId]
    return label ? { ...annotation, text: label.label, sublabel: label.caption } : annotation
  })
  scene.cameraPresets = scene.cameraPresets.map((preset) =>
    preset.id === 'closeup' ? { ...preset, label: '特写' } : preset,
  )
  return SceneSpecSchema.parse(scene)
}

const CHINESE_ROOM_LABELS: VariantLabels = {
  entities: {
    monolith: { label: '中文屋', caption: 'CHINESE ROOM' },
    core: { label: '规则书', caption: 'RULEBOOK' },
    reasonRing: { label: '语义理解', caption: 'UNDERSTANDING' },
    channel: { label: '纸条通道', caption: 'SLIP CHANNEL' },
    observer: { label: '屋外提问者', caption: 'QUESTIONER' },
    verifier: { label: '测试裁判', caption: 'TEST JUDGE' },
    hall: { label: '房间', caption: 'THE ROOM' },
  },
  conditions: {
    interpretable: { label: '规则可解释', hint: '屋内每一步符号操作，能否被说清楚。' },
    verifiable: { label: '输出可检验', hint: '屋外的回答能否通过提问者的测试。' },
    'has-reasons': { label: '有语义理解', hint: '系统是在理解中文，还是只在操纵符号。' },
  },
}

const EXPERIENCE_MACHINE_LABELS: VariantLabels = {
  entities: {
    monolith: { label: '体验机', caption: 'EXPERIENCE MACHINE' },
    core: { label: '体验流', caption: 'EXPERIENCE STREAM' },
    reasonRing: { label: '真实成就', caption: 'REAL ACHIEVEMENT' },
    channel: { label: '刺激信号', caption: 'STIMULUS FEED' },
    observer: { label: '体验者', caption: 'SUBJECT' },
    verifier: { label: '现实对照', caption: 'REALITY CHECK' },
    hall: { label: '实验室', caption: 'LABORATORY' },
  },
  conditions: {
    interpretable: { label: '机制可解释', hint: '机器如何产生体验，能否被说明。' },
    verifiable: { label: '差异可检验', hint: '机器内体验与真实生活的差异，能否被检验。' },
    'has-reasons': { label: '有现实理由', hint: '机器里的成就与关系，是否有现实的理由支撑。' },
  },
}

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    family: 'black-box-room',
    name: '黑箱室',
    tagline: '心智哲学 · 科学技术哲学',
    description: '一个看不到内部的系统：它有没有心智？它的行为能不能被解释和检验？',
    buildScene: (title, subtitle) =>
      SceneSpecSchema.parse({ ...structuredClone(seedScene), title, subtitle }),
  },
  {
    family: 'chinese-room',
    name: '中文屋',
    tagline: '心智哲学 · 语言哲学',
    description: '屋里的人靠规则书回答中文问题。回答全对，就等于理解中文吗？',
    buildScene: (title, subtitle) =>
      buildVariantScene('chinese-room', title, subtitle, CHINESE_ROOM_LABELS),
  },
  {
    family: 'experience-machine',
    name: '体验机',
    tagline: '伦理学 · 价值理论',
    description: '机器能给你任何想要的体验。如果体验完美，你还愿意回到真实生活吗？',
    buildScene: (title, subtitle) =>
      buildVariantScene('experience-machine', title, subtitle, EXPERIENCE_MACHINE_LABELS),
  },
]

export function createExperimentFromTemplate(
  family: ExperimentFamily,
  title: string,
  now = Date.now(),
): Experiment {
  const template = EXPERIMENT_TEMPLATES.find((item) => item.family === family)
  if (!template) throw new Error(`未知实验模板：${family}`)
  const sceneSpec = template.buildScene(title, FAMILY_LABEL[family].en)
  return {
    id: newId('exp'),
    title,
    subtitle: sceneSpec.subtitle,
    family,
    sceneSpec,
    claim: '',
    stanceId: null,
    probe: null,
    createdAt: now,
    updatedAt: now,
  }
}