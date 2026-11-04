import { create } from 'zustand'
import { db } from './db'
import { createSeedExperiment, initialConditionsNote, SEED_EXPERIMENT_ID } from './seed'
import { runPremiseProbe } from './probe'
import { setConditionValue } from './resolveScene'
import { createRevision, nextRevisionNumber } from './revision'
import type { Experiment, Probe, ProbeStatus, Revision } from './schema'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
export type ProbeAction = 'respond' | 'revise' | 'retain'

interface Toast {
  id: number
  text: string
}

interface LabStore {
  experiment: Experiment | null
  revisions: Revision[]
  selectedRevisionId: string | null
  hydrated: boolean
  saveState: SaveState
  revisionPending: boolean
  toast: Toast | null
  hydrate: () => Promise<void>
  toggleCondition: (conditionId: string) => void
  updateClaim: (claim: string) => void
  setStance: (stanceId: string) => void
  runProbe: () => void
  resolveProbe: (action: ProbeAction, response?: string, revisedClaim?: string) => Promise<boolean>
  saveVersion: (label: string, reason: string) => Promise<boolean>
  restoreRevision: (revisionId: string) => Promise<boolean>
  selectRevision: (revisionId: string | null) => void
  notify: (text: string) => void
}

const ACTION_LABEL: Record<ProbeAction, string> = {
  respond: '回应异议',
  revise: '修订前提',
  retain: '保留异议',
}

const ACTION_STATUS: Record<ProbeAction, ProbeStatus> = {
  respond: 'answered',
  revise: 'revised',
  retain: 'retained',
}

const ACTION_DEFAULT_REASON: Record<ProbeAction, string> = {
  respond: '（待填写：回应）',
  revise: '（待填写：修订理由）',
  retain: '（待填写：保留理由）',
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined
let hydrating = false
let writeQueue: Promise<void> = Promise.resolve()

// Keep failed writes from poisoning the queue for later saves.
function enqueueWrite<T>(write: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(write)
  writeQueue = result.then(() => undefined, () => undefined)
  return result
}

function padVersion(version: number): string {
  return String(version).padStart(2, '0')
}

function cloneProbe(probe: Probe | null): Probe | null {
  return probe ? { ...probe, conditionStates: { ...probe.conditionStates } } : null
}

export const useLabStore = create<LabStore>()((set, get) => {
  const notify = (text: string) => {
    set({ toast: { id: Date.now(), text } })
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), 3400)
  }

  const cancelSaveTimer = () => {
    if (saveTimer !== undefined) clearTimeout(saveTimer)
    saveTimer = undefined
  }

  const persistNow = async (experiment: Experiment) => {
    const isCurrentDraft = () =>
      get().experiment === experiment && !get().revisionPending
    if (isCurrentDraft()) set({ saveState: 'saving' })
    try {
      await enqueueWrite(async () => {
        await db.experiments.put(experiment)
      })
      if (isCurrentDraft()) set({ saveState: 'saved' })
    } catch {
      if (isCurrentDraft()) set({ saveState: 'error' })
    }
  }

  const scheduleSave = (experiment: Experiment) => {
    cancelSaveTimer()
    saveTimer = setTimeout(() => {
      saveTimer = undefined
      if (get().revisionPending || get().experiment !== experiment) return
      void persistNow(experiment)
    }, 280)
  }

  const commit = (experiment: Experiment, immediate = false) => {
    if (get().revisionPending) return
    set({ experiment, saveState: 'saving' })
    cancelSaveTimer()
    if (immediate) void persistNow(experiment)
    else scheduleSave(experiment)
  }

  type RevisionChange = {
    experiment: Experiment
    revision: Revision
    notification: string
  }

  const commitRevision = async (
    build: (experiment: Experiment, revisions: Revision[]) => RevisionChange | null,
    failureNotification: string,
  ): Promise<boolean> => {
    if (get().revisionPending || !get().experiment) return false
    // Acquire before the first await: all editing and version actions share this lock.
    set({ revisionPending: true })
    cancelSaveTimer()
    let succeeded = false
    try {
      await writeQueue
      // Read only after older writes finish; guards keep this draft stable until release.
      const { experiment, revisions } = get()
      if (!experiment) return false
      const change = build(experiment, revisions)
      if (!change) return false
      set({ saveState: 'saving' })
      await enqueueWrite(async () => {
        await db.transaction('rw', db.experiments, db.revisions, async () => {
          await db.experiments.put(change.experiment)
          await db.revisions.put(change.revision)
        })
      })
      set({
        experiment: change.experiment,
        revisions: [...revisions, change.revision],
        selectedRevisionId: change.revision.id,
        saveState: 'saved',
      })
      succeeded = true
      notify(change.notification)
      return true
    } catch {
      set({ saveState: 'error' })
      notify(failureNotification)
      return false
    } finally {
      set({ revisionPending: false })
      // The canceled debounce must not lose the current draft if the transaction fails.
      const { experiment, saveState, revisionPending } = get()
      if (!succeeded && !revisionPending && experiment && saveState !== 'saved') {
        scheduleSave(experiment)
      }
    }
  }

  return {
    experiment: null,
    revisions: [],
    selectedRevisionId: null,
    hydrated: false,
    saveState: 'idle',
    revisionPending: false,
    toast: null,

    hydrate: async () => {
      if (get().hydrated || hydrating) return
      hydrating = true
      try {
        const stored = await db.experiments.get(SEED_EXPERIMENT_ID)
        const experiment = stored ?? createSeedExperiment()
        if (!stored) {
          await enqueueWrite(async () => {
            await db.experiments.put(experiment)
          })
        }

        let revisions = await db.revisions
          .where('experimentId')
          .equals(experiment.id)
          .sortBy('version')

        if (revisions.length === 0) {
          const initial = createRevision(
            experiment,
            1,
            '初始状态',
            initialConditionsNote(experiment),
          )
          await enqueueWrite(async () => {
            await db.revisions.put(initial)
          })
          revisions = [initial]
        }

        set({
          experiment,
          revisions,
          selectedRevisionId: revisions.at(-1)?.id ?? null,
          hydrated: true,
          saveState: 'saved',
        })
      } catch {
        const experiment = createSeedExperiment()
        const initial = createRevision(
          experiment,
          1,
          '初始状态',
          initialConditionsNote(experiment),
        )
        set({
          experiment,
          revisions: [initial],
          selectedRevisionId: initial.id,
          hydrated: true,
          saveState: 'error',
        })
        notify('IndexedDB 不可用：本次修改只保存在当前页面。')
      } finally {
        hydrating = false
      }
    },

    toggleCondition: (conditionId) => {
      const experiment = get().experiment
      if (!experiment || get().revisionPending) return
      const condition = experiment.sceneSpec.conditions.find(
        (item) => item.id === conditionId,
      )
      if (!condition) return
      const sceneSpec = setConditionValue(
        experiment.sceneSpec,
        conditionId,
        !condition.value,
      )
      commit({ ...experiment, sceneSpec, updatedAt: Date.now() })
    },

    updateClaim: (claim) => {
      const experiment = get().experiment
      if (!experiment || get().revisionPending || experiment.claim === claim) return
      commit({ ...experiment, claim, updatedAt: Date.now() })
    },

    setStance: (stanceId) => {
      const experiment = get().experiment
      if (!experiment || get().revisionPending || experiment.stanceId === stanceId) return
      commit({ ...experiment, stanceId, updatedAt: Date.now() })
    },

    runProbe: () => {
      const experiment = get().experiment
      if (!experiment || get().revisionPending) return
      const probe = runPremiseProbe({
        claim: experiment.claim,
        sceneSpec: experiment.sceneSpec,
        stanceId: experiment.stanceId,
      })
      commit({ ...experiment, probe, updatedAt: Date.now() }, true)
      notify('探针已生成。')
    },

    resolveProbe: async (action, response, revisedClaim) => {
      const { experiment, revisionPending } = get()
      if (revisionPending || !experiment?.probe) return false
      const text = response?.trim()
      if (action === 'respond' && !text) {
        notify('请先填写回应。')
        return false
      }
      const claim = revisedClaim?.trim()
      if (action === 'revise' && (!claim || claim === experiment.claim.trim())) {
        return false
      }

      return commitRevision((current, revisions) => {
        if (!current.probe) return null
        const updatedProbe: Probe = {
          ...current.probe,
          status: ACTION_STATUS[action],
          response: text || ACTION_DEFAULT_REASON[action],
        }
        const next: Experiment = {
          ...current,
          claim: action === 'revise' ? claim! : current.claim,
          probe: updatedProbe,
          updatedAt: Date.now(),
        }
        const version = nextRevisionNumber(revisions)
        return {
          experiment: next,
          revision: createRevision(
            next,
            version,
            ACTION_LABEL[action],
            text || ACTION_DEFAULT_REASON[action],
          ),
          notification: `${ACTION_LABEL[action]}已记入 v${padVersion(version)}。`,
        }
      }, '无法写入本地存储，本次操作未保存。')
    },

    saveVersion: async (label, reason) => {
      if (!get().experiment || get().revisionPending) return false
      const cleanReason = reason.trim()
      if (!cleanReason) {
        notify('请写一句修改理由，版本才会被记录。')
        return false
      }
      return commitRevision((experiment, revisions) => {
        const version = nextRevisionNumber(revisions)
        const cleanLabel = label.trim() || `实验版本 v${padVersion(version)}`
        const next = { ...experiment, updatedAt: Date.now() }
        return {
          experiment: next,
          revision: createRevision(next, version, cleanLabel, cleanReason),
          notification: `已记录 v${padVersion(version)} · ${cleanLabel}`,
        }
      }, '无法写入本地存储，本次版本未保存。')
    },

    restoreRevision: async (revisionId) => {
      if (!get().experiment || get().revisionPending) return false
      if (!get().revisions.some((revision) => revision.id === revisionId)) return false
      return commitRevision((experiment, revisions) => {
        const revision = revisions.find((item) => item.id === revisionId)
        if (!revision) return null
        const conditions = revision.snapshot.conditions
        const sceneSpec = {
          ...experiment.sceneSpec,
          conditions: experiment.sceneSpec.conditions.map((condition) => ({
            ...condition,
            value: conditions[condition.id] ?? condition.value,
          })),
        }
        const restored: Experiment = {
          ...experiment,
          claim: revision.snapshot.claim,
          stanceId: revision.snapshot.stanceId,
          sceneSpec,
          probe: cloneProbe(revision.snapshot.probe),
          updatedAt: Date.now(),
        }
        const version = nextRevisionNumber(revisions)
        return {
          experiment: restored,
          revision: createRevision(
            restored,
            version,
            `回溯至 v${padVersion(revision.version)}`,
            `恢复「${revision.label}」的快照，并保留完整的回溯记录。`,
          ),
          notification: `已回溯至 v${padVersion(revision.version)}，并记录为 v${padVersion(version)}。`,
        }
      }, '无法写入本地存储，本次回溯未保存。')
    },

    selectRevision: (revisionId) => {
      if (get().revisionPending) return
      set({ selectedRevisionId: revisionId })
    },

    notify,
  }
})
