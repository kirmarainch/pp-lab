import { PROBE_PLACEHOLDER, resolveStanceById, type Stance } from './content'
import { newId } from './id'
import type { ExperimentLens, Probe, SceneSpec } from './schema'

interface ProbeInput {
  sceneSpec: SceneSpec
  stanceId: string | null
  claim: string
  lens?: ExperimentLens | null
}

function pickTargetConditionId(sceneSpec: SceneSpec, stance: Stance | undefined): string | undefined {
  const preferred = stance?.probeTargetConditionId
  if (preferred && sceneSpec.conditions.some((condition) => condition.id === preferred)) {
    return preferred
  }
  return (
    sceneSpec.conditions.find((condition) => condition.value)?.id ??
    sceneSpec.conditions[0]?.id
  )
}

/**
 * 探针的结构与目标前提已接通；正文优先来自立场卡（含本实验视角），未选立场时保留占位。
 */
export function runPremiseProbe(input: ProbeInput): Probe {
  const conditions = Object.fromEntries(
    input.sceneSpec.conditions.map((condition) => [condition.id, condition.value]),
  )
  const stance = resolveStanceById(input.lens, input.stanceId)
  const targetConditionId = pickTargetConditionId(input.sceneSpec, stance)
  const targetCondition = input.sceneSpec.conditions.find(
    (condition) => condition.id === targetConditionId,
  )
  const hint = targetCondition?.hint.trim()
  const targetPremise =
    hint && !hint.startsWith('（待填写') ? hint : PROBE_PLACEHOLDER.targetPremise

  return {
    id: newId('probe'),
    createdAt: Date.now(),
    stanceId: input.stanceId,
    conditionStates: conditions,
    claimSnapshot: input.claim,
    targetConditionId,
    targetPremise,
    objection: stance?.probeObjection ?? PROBE_PLACEHOLDER.objection,
    question: stance?.lens ?? PROBE_PLACEHOLDER.question,
    status: 'open',
    origin: 'local',
  }
}