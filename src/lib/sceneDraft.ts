import { z } from 'zod'
import { newId } from './id'
import {
  ExperimentFamilySchema,
  SceneSpecSchema,
  type Experiment,
  type SceneAnnotation,
  type SceneBinding,
  type SceneEntity,
  type SceneSpec,
} from './schema'
import { seedScene } from './seed'

export const ENTITY_KINDS = [
  'monolith',
  'core',
  'channel',
  'observer',
  'verifier',
  'reason-ring',
  'environment',
] as const
export type EntityKind = (typeof ENTITY_KINDS)[number]

export interface KindMeta {
  id: string
  name: string
  en: string
  role: string
  defaultLabel: string
  defaultCaption: string
}

// 舞台是固定的：7 个组件位各有固定外观与位置，自定义只决定哪些出场、叫什么。
export const KIND_META: Record<EntityKind, KindMeta> = {
  monolith: {
    id: 'monolith',
    name: '核心对象',
    en: 'SUBJECT',
    role: '被研究的系统或对象，内部默认看不见；相关条件开启时外壳变透明。',
    defaultLabel: '对象 A',
    defaultCaption: 'OBJECT A',
  },
  core: {
    id: 'core',
    name: '内部机制',
    en: 'MECHANISM',
    role: '对象内部的运作机制，随相关条件显形、旋转。',
    defaultLabel: '对象 B',
    defaultCaption: 'OBJECT B',
  },
  channel: {
    id: 'channel',
    name: '输入输出通道',
    en: 'CHANNEL',
    role: '对象与外界之间的信号、纸条或刺激通路，随相关条件变亮。',
    defaultLabel: '对象 D',
    defaultCaption: 'OBJECT D',
  },
  observer: {
    id: 'observer',
    name: '外部观察者',
    en: 'OBSERVER',
    role: '在对象之外提问、观察或体验的人。',
    defaultLabel: '对象 E',
    defaultCaption: 'OBJECT E',
  },
  verifier: {
    id: 'verifier',
    name: '独立检验者',
    en: 'VERIFIER',
    role: '独立于对象的测试、裁判或现实对照，随相关条件出现。',
    defaultLabel: '对象 F',
    defaultCaption: 'OBJECT F',
  },
  'reason-ring': {
    id: 'reasonRing',
    name: '理由与价值',
    en: 'REASONS',
    role: '环绕对象的理由、理解或价值之环，随相关条件点亮。',
    defaultLabel: '对象 C',
    defaultCaption: 'OBJECT C',
  },
  environment: {
    id: 'hall',
    name: '环境',
    en: 'ENVIRONMENT',
    role: '实验发生的房间或实验室，作为场景背景。',
    defaultLabel: '黑箱室',
    defaultCaption: 'BLACK BOX ROOM',
  },
}

interface BindingRecipe {
  property: string
  off: number
  on: number
}

// 条件作用于某组件位时，按固定配方展开成绑定；与种子场景的视觉效果一致。
const BINDING_RECIPES: Record<EntityKind, BindingRecipe[]> = {
  monolith: [
    { property: 'opacity', off: 1, on: 0.18 },
    { property: 'seamIntensity', off: 0.28, on: 1 },
    { property: 'capLight', off: 0, on: 1 },
  ],
  core: [
    { property: 'scale', off: 0, on: 1 },
    { property: 'spin', off: 0.2, on: 0.85 },
  ],
  channel: [{ property: 'opacity', off: 0.38, on: 1 }],
  observer: [],
  verifier: [
    { property: 'scale', off: 0, on: 1 },
    { property: 'beam', off: 0, on: 1 },
  ],
  'reason-ring': [
    { property: 'scale', off: 0, on: 1 },
    { property: 'spin', off: 0.08, on: 0.5 },
  ],
  environment: [],
}

export const BINDABLE_KINDS: EntityKind[] = ENTITY_KINDS.filter(
  (kind) => BINDING_RECIPES[kind].length > 0,
)

const ANNOTATION_POSITIONS: Partial<Record<EntityKind, [number, number, number]>> = {
  monolith: [0, 3.28, 0],
  core: [-1.75, 1.6, 0.3],
  channel: [1.85, 2.3, 0.95],
  observer: [3.45, 2.4, 1.35],
  verifier: [-3.55, 2.1, 0.4],
  'reason-ring': [1.55, 2.95, 0.2],
}

const GATED_ANNOTATION_KINDS = new Set<EntityKind>(['core', 'verifier', 'reason-ring'])

export const CONDITION_AXES = [
  { value: 'epistemic', label: '认识论', hint: '能否知道、解释' },
  { value: 'social', label: '社会检验', hint: '能否被他人检验' },
  { value: 'internal', label: '内在理由', hint: '理由、理解与价值' },
] as const

export const SceneDraftSchema = z
  .object({
    family: ExperimentFamilySchema,
    title: z.string().trim().min(1).max(40),
    subtitle: z.string().trim().min(1).max(60),
    entities: z
      .array(
        z.object({
          kind: z.enum(ENTITY_KINDS),
          label: z.string().trim().min(1).max(20),
          caption: z.string().trim().max(40).default(''),
        }),
      )
      .min(1)
      .max(7),
    conditions: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(32),
          label: z.string().trim().min(1).max(20),
          hint: z.string().trim().max(120).default(''),
          axis: z.enum(['epistemic', 'social', 'internal']),
          value: z.boolean().default(false),
          targets: z.array(z.enum(ENTITY_KINDS)).max(7).default([]),
        }),
      )
      .max(8),
  })
  .superRefine((draft, ctx) => {
    const kinds = new Set<string>()
    for (const entity of draft.entities) {
      if (kinds.has(entity.kind)) {
        ctx.addIssue({ code: 'custom', message: `重复的组件位：${entity.kind}`, path: ['entities'] })
      }
      kinds.add(entity.kind)
    }
    const ids = new Set<string>()
    for (const condition of draft.conditions) {
      if (ids.has(condition.id)) {
        ctx.addIssue({ code: 'custom', message: `重复的条件 id：${condition.id}`, path: ['conditions'] })
      }
      ids.add(condition.id)
    }
  })
export type SceneDraft = z.infer<typeof SceneDraftSchema>

export function newConditionId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// 草稿 → 完整 SceneSpec：绑定、注释、相机全部由本地规则生成，保证可渲染、可校验。
export function assembleScene(draft: SceneDraft): SceneSpec {
  const entities: SceneEntity[] = draft.entities.map((entity) => ({
    id: KIND_META[entity.kind].id,
    kind: entity.kind,
    label: entity.label,
    ...(entity.caption ? { caption: entity.caption } : {}),
  }))
  const presentKinds = new Set(draft.entities.map((entity) => entity.kind))

  const bindings: SceneBinding[] = []
  const usedKeys = new Set<string>()
  for (const condition of draft.conditions) {
    for (const kind of condition.targets) {
      if (!presentKinds.has(kind)) continue
      const entityId = KIND_META[kind].id
      for (const recipe of BINDING_RECIPES[kind]) {
        const key = `${entityId}:${recipe.property}`
        if (usedKeys.has(key)) continue
        usedKeys.add(key)
        bindings.push({
          conditionId: condition.id,
          entityId,
          property: recipe.property,
          off: recipe.off,
          on: recipe.on,
        })
      }
    }
  }

  const firstTargeting = (kind: EntityKind) =>
    draft.conditions.find((condition) => condition.targets.includes(kind))?.id

  const annotations: SceneAnnotation[] = []
  for (const entity of draft.entities) {
    const position = ANNOTATION_POSITIONS[entity.kind]
    if (!position) continue
    const conditionId = GATED_ANNOTATION_KINDS.has(entity.kind)
      ? firstTargeting(entity.kind)
      : undefined
    annotations.push({
      id: `a-${entity.kind}`,
      entityId: KIND_META[entity.kind].id,
      text: entity.label,
      sublabel: entity.caption || KIND_META[entity.kind].en,
      ...(conditionId ? { conditionId } : {}),
      position,
    })
  }

  const monolithLabel = draft.entities.find((entity) => entity.kind === 'monolith')?.label
  const cameraPresets = seedScene.cameraPresets.map((preset) =>
    preset.id === 'closeup' ? { ...preset, label: monolithLabel ?? '特写' } : { ...preset },
  )

  return SceneSpecSchema.parse({
    schemaVersion: '1.0',
    family: draft.family,
    title: draft.title,
    subtitle: draft.subtitle,
    entities,
    conditions: draft.conditions.map(({ targets: _targets, ...condition }) => condition),
    bindings,
    cameraPresets,
    annotations,
  })
}

export function draftFromScene(spec: SceneSpec): SceneDraft {
  const kindByEntityId = new Map(spec.entities.map((entity) => [entity.id, entity.kind]))
  return {
    family: spec.family,
    title: spec.title,
    subtitle: spec.subtitle,
    entities: spec.entities.map((entity) => ({
      kind: entity.kind,
      label: entity.label,
      caption: entity.caption ?? '',
    })),
    conditions: spec.conditions.map((condition) => ({
      id: condition.id,
      label: condition.label,
      hint: condition.hint,
      axis: condition.axis,
      value: condition.value,
      targets: [
        ...new Set(
          spec.bindings
            .filter((binding) => binding.conditionId === condition.id)
            .map((binding) => kindByEntityId.get(binding.entityId))
            .filter((kind): kind is EntityKind => Boolean(kind)),
        ),
      ],
    })),
  }
}

export function createExperimentFromDraft(draft: SceneDraft, now = Date.now()): Experiment {
  const sceneSpec = assembleScene(draft)
  return {
    id: newId('exp'),
    title: draft.title,
    subtitle: draft.subtitle,
    family: draft.family,
    sceneSpec,
    claim: '',
    stanceId: null,
    probe: null,
    createdAt: now,
    updatedAt: now,
  }
}