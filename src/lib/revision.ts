import type { Experiment, Probe, Revision } from './schema'
import { snapshotConditions } from './resolveScene'
import { newId } from './id'

function cloneProbe(probe: Probe | null): Probe | null {
  return probe
    ? { ...probe, conditionStates: { ...probe.conditionStates } }
    : null
}

export function createRevision(
  experiment: Experiment,
  version: number,
  label: string,
  reason: string,
  createdAt = Date.now(),
): Revision {
  return {
    id: newId('rev'),
    experimentId: experiment.id,
    version,
    label,
    reason,
    createdAt,
    snapshot: {
      claim: experiment.claim,
      stanceId: experiment.stanceId,
      conditions: snapshotConditions(experiment.sceneSpec),
      probe: cloneProbe(experiment.probe),
    },
  }
}

export function nextRevisionNumber(revisions: Revision[]): number {
  return revisions.reduce((max, revision) => Math.max(max, revision.version), 0) + 1
}
