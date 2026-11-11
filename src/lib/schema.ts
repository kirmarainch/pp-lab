import { z } from 'zod'

export const SCENE_SCHEMA_VERSION = '1.0' as const

export const ScenePropertyValueSchema = z.union([z.boolean(), z.number(), z.string()])
export type ScenePropertyValue = z.infer<typeof ScenePropertyValueSchema>

export const SceneEntitySchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'monolith',
    'core',
    'channel',
    'observer',
    'verifier',
    'reason-ring',
    'environment',
  ]),
  label: z.string().min(1),
  caption: z.string().optional(),
})
export type SceneEntity = z.infer<typeof SceneEntitySchema>

export const SceneConditionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  hint: z.string(),
  axis: z.enum(['epistemic', 'social', 'internal']),
  value: z.boolean(),
})
export type SceneCondition = z.infer<typeof SceneConditionSchema>

export const SceneBindingSchema = z.object({
  conditionId: z.string().min(1),
  entityId: z.string().min(1),
  property: z.string().min(1),
  off: ScenePropertyValueSchema,
  on: ScenePropertyValueSchema,
})
export type SceneBinding = z.infer<typeof SceneBindingSchema>

export const CameraPresetSchema = z.object({
  id: z.enum(['overview', 'observer', 'closeup']),
  label: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()]),
})
export type CameraPreset = z.infer<typeof CameraPresetSchema>

export const SceneAnnotationSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  text: z.string().min(1),
  sublabel: z.string().optional(),
  conditionId: z.string().optional(),
  position: z.tuple([z.number(), z.number(), z.number()]),
})
export type SceneAnnotation = z.infer<typeof SceneAnnotationSchema>

export const SceneSpecSchema = z
  .object({
    schemaVersion: z.literal(SCENE_SCHEMA_VERSION),
    family: z.literal('black-box-room'),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    entities: z.array(SceneEntitySchema).min(1).max(24),
    conditions: z.array(SceneConditionSchema).max(8),
    bindings: z.array(SceneBindingSchema).max(64),
    cameraPresets: z.array(CameraPresetSchema).min(1).max(6),
    annotations: z.array(SceneAnnotationSchema).max(16),
  })
  .superRefine((spec, ctx) => {
    const entityIds = new Set<string>()
    for (const entity of spec.entities) {
      if (entityIds.has(entity.id)) {
        ctx.addIssue({ code: 'custom', message: `重复的实体 id：${entity.id}`, path: ['entities'] })
      }
      entityIds.add(entity.id)
    }

    const conditionIds = new Set<string>()
    for (const condition of spec.conditions) {
      if (conditionIds.has(condition.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `重复的条件 id：${condition.id}`,
          path: ['conditions'],
        })
      }
      conditionIds.add(condition.id)
    }

    const bindingKeys = new Set<string>()
    for (const binding of spec.bindings) {
      if (!conditionIds.has(binding.conditionId)) {
        ctx.addIssue({
          code: 'custom',
          message: `绑定引用了不存在的条件：${binding.conditionId}`,
          path: ['bindings'],
        })
      }
      if (!entityIds.has(binding.entityId)) {
        ctx.addIssue({
          code: 'custom',
          message: `绑定引用了不存在的实体：${binding.entityId}`,
          path: ['bindings'],
        })
      }
      const key = JSON.stringify([binding.entityId, binding.property])
      if (bindingKeys.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `同一属性存在冲突绑定：${key}`,
          path: ['bindings'],
        })
      }
      bindingKeys.add(key)
    }

    const presetIds = new Set<string>()
    for (const preset of spec.cameraPresets) {
      if (presetIds.has(preset.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `重复的相机预设 id：${preset.id}`,
          path: ['cameraPresets'],
        })
      }
      presetIds.add(preset.id)
    }

    for (const annotation of spec.annotations) {
      if (!entityIds.has(annotation.entityId)) {
        ctx.addIssue({
          code: 'custom',
          message: `注释引用了不存在的实体：${annotation.entityId}`,
          path: ['annotations'],
        })
      }
      if (annotation.conditionId && !conditionIds.has(annotation.conditionId)) {
        ctx.addIssue({
          code: 'custom',
          message: `注释引用了不存在的条件：${annotation.conditionId}`,
          path: ['annotations'],
        })
      }
    }
  })
export type SceneSpec = z.infer<typeof SceneSpecSchema>

export const ProbeStatusSchema = z.enum(['open', 'retained', 'answered', 'revised'])
export type ProbeStatus = z.infer<typeof ProbeStatusSchema>

export const ProbeSchema = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  stanceId: z.string().nullable(),
  conditionStates: z.record(z.string(), z.boolean()),
  claimSnapshot: z.string().optional(),
  targetConditionId: z.string().optional(),
  targetPremise: z.string(),
  objection: z.string(),
  question: z.string(),
  status: ProbeStatusSchema,
  response: z.string().optional(),
  origin: z.enum(['local', 'ai']).optional(),
  model: z.string().optional(),
})
export type Probe = z.infer<typeof ProbeSchema>

export const ExperimentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  family: z.literal('black-box-room'),
  sceneSpec: SceneSpecSchema,
  claim: z.string(),
  stanceId: z.string().nullable(),
  probe: ProbeSchema.nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Experiment = z.infer<typeof ExperimentSchema>

export const SnapshotSchema = z.object({
  claim: z.string(),
  stanceId: z.string().nullable(),
  conditions: z.record(z.string(), z.boolean()),
  probe: ProbeSchema.nullable(),
})
export type Snapshot = z.infer<typeof SnapshotSchema>

export const RevisionSchema = z.object({
  id: z.string().min(1),
  experimentId: z.string().min(1),
  version: z.number().int().positive(),
  label: z.string().min(1),
  reason: z.string(),
  createdAt: z.number(),
  snapshot: SnapshotSchema,
})
export type Revision = z.infer<typeof RevisionSchema>
