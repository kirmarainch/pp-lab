import type {
  ScenePropertyValue,
  SceneSpec,
  SceneEntity,
  SceneAnnotation,
} from './schema'

export interface ResolvedEntity extends SceneEntity {
  props: Record<string, ScenePropertyValue>
}

export interface ResolvedScene {
  spec: SceneSpec
  entities: Map<string, ResolvedEntity>
  annotations: SceneAnnotation[]
}

export function resolveScene(spec: SceneSpec): ResolvedScene {
  const conditionValues = new Map(spec.conditions.map((condition) => [condition.id, condition.value]))
  const entities = new Map<string, ResolvedEntity>(
    spec.entities.map((entity) => [entity.id, { ...entity, props: {} }]),
  )

  for (const binding of spec.bindings) {
    const entity = entities.get(binding.entityId)
    if (!entity) continue
    entity.props[binding.property] = conditionValues.get(binding.conditionId)
      ? binding.on
      : binding.off
  }

  const annotations = spec.annotations.filter(
    (annotation) =>
      !annotation.conditionId || conditionValues.get(annotation.conditionId) === true,
  )

  return { spec, entities, annotations }
}

export function readProp<T extends ScenePropertyValue>(
  scene: ResolvedScene,
  entityId: string,
  property: string,
  fallback: T,
): T {
  const value = scene.entities.get(entityId)?.props[property]
  return (value === undefined ? fallback : value) as T
}

export function readNumberProp(
  scene: ResolvedScene,
  entityId: string,
  property: string,
  fallback: number,
): number {
  const value = readProp(scene, entityId, property, fallback)
  return typeof value === 'number' ? value : fallback
}

export function readBooleanProp(
  scene: ResolvedScene,
  entityId: string,
  property: string,
  fallback: boolean,
): boolean {
  const value = readProp(scene, entityId, property, fallback)
  return typeof value === 'boolean' ? value : fallback
}

export function conditionValue(spec: SceneSpec, conditionId: string): boolean {
  return spec.conditions.find((condition) => condition.id === conditionId)?.value ?? false
}

export function setConditionValue(
  spec: SceneSpec,
  conditionId: string,
  value: boolean,
): SceneSpec {
  return {
    ...spec,
    conditions: spec.conditions.map((condition) =>
      condition.id === conditionId ? { ...condition, value } : condition,
    ),
  }
}

export function snapshotConditions(spec: SceneSpec): Record<string, boolean> {
  return Object.fromEntries(spec.conditions.map((condition) => [condition.id, condition.value]))
}
