import { PROBE_PLACEHOLDER } from './content'
import { newId } from './id'
import type { Probe, SceneSpec } from './schema'

interface ProbeInput {
  sceneSpec: SceneSpec
  stanceId: string | null
}

/**
 * 探针的生成结构已经接通；具体文案为占位，等待用户决定。
 */
export function runPremiseProbe(input: ProbeInput): Probe {
  const conditions = Object.fromEntries(
    input.sceneSpec.conditions.map((condition) => [condition.id, condition.value]),
  )

  return {
    id: newId('probe'),
    createdAt: Date.now(),
    stanceId: input.stanceId,
    conditionStates: conditions,
    targetPremise: PROBE_PLACEHOLDER.targetPremise,
    objection: PROBE_PLACEHOLDER.objection,
    question: PROBE_PLACEHOLDER.question,
    status: 'open',
  }
}
