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
  toast: Toast | null
  hydrate: () => Promise<void>
  toggleCondition: (conditionId: string) => void
  updateClaim: (claim: string) => void
  setStance: (stanceId: string) => void
  runProbe: () => void
  resolveProbe: (action: ProbeAction, response?: string) => Promise<void>
  saveVersion: (label: string, reason: string) => Promise<void>
  restoreRevision: (revisionId: string) => Promise<void>
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

  const persistNow = async (experiment: Experiment) => {
    try {
      await db.experiments.put(experiment)
      set({ saveState: 'saved' })
    } catch {
      set({ saveState: 'error' })
    }
  }

  const commit = (experiment: Experiment, immediate = false) => {
    set({ experiment, saveState: 'saving' })
    if (saveTimer) clearTimeout(saveTimer)
    if (immediate) {
      void persistNow(experiment)
      return
    }
    saveTimer = setTimeout(() => {
      void persistNow(experiment)
    }, 280)
  }

  return {
    experiment: null,
    revisions: [],
    selectedRevisionId: null,
    hydrated: false,
    saveState: 'idle',
    toast: null,

    hydrate: async () => {
      if (get().hydrated || hydrating) return
      hydrating = true
      try {
        const stored = await db.experiments.get(SEED_EXPERIMENT_ID)
        const experiment = stored ?? createSeedExperiment()
        if (!stored) await db.experiments.put(experiment)

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
          await db.revisions.put(initial)
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
      if (!experiment) return
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
      if (!experiment || experiment.claim === claim) return
      commit({ ...experiment, claim, updatedAt: Date.now() })
    },

    setStance: (stanceId) => {
      const experiment = get().experiment
      if (!experiment || experiment.stanceId === stanceId) return
      commit({ ...experiment, stanceId, updatedAt: Date.now() })
    },

    runProbe: () => {
      const experiment = get().experiment
      if (!experiment) return
      const probe = runPremiseProbe({
        sceneSpec: experiment.sceneSpec,
        stanceId: experiment.stanceId,
      })
      commit({ ...experiment, probe, updatedAt: Date.now() }, true)
      notify('探针已生成。')
    },

    resolveProbe: async (action, response) => {
      const { experiment, revisions } = get()
      if (!experiment?.probe) return
      const text = response?.trim()
      if (action === 'respond' && !text) {
        notify('请先填写回应。')
        return
      }

      const updatedProbe: Probe = {
        ...experiment.probe,
        status: ACTION_STATUS[action],
        response: text || ACTION_DEFAULT_REASON[action],
      }
      const next: Experiment = {
        ...experiment,
        probe: updatedProbe,
        updatedAt: Date.now(),
      }
      const version = nextRevisionNumber(revisions)
      const revision = createRevision(
        next,
        version,
        ACTION_LABEL[action],
        text || ACTION_DEFAULT_REASON[action],
      )

      try {
        await db.transaction('rw', db.experiments, db.revisions, async () => {
          await db.experiments.put(next)
          await db.revisions.put(revision)
        })
        set({
          experiment: next,
          revisions: [...revisions, revision],
          selectedRevisionId: revision.id,
          saveState: 'saved',
        })
        notify(`${ACTION_LABEL[action]}已记入 v${padVersion(version)}。`)
      } catch {
        set({ saveState: 'error' })
        notify('无法写入本地存储，本次操作未保存。')
      }
    },

    saveVersion: async (label, reason) => {
      const { experiment, revisions } = get()
      if (!experiment) return
      const cleanReason = reason.trim()
      if (!cleanReason) {
        notify('请写一句修改理由，版本才会被记录。')
        return
      }
      const version = nextRevisionNumber(revisions)
      const cleanLabel = label.trim() || `实验版本 v${padVersion(version)}`
      const revision = createRevision(experiment, version, cleanLabel, cleanReason)
      const next = { ...experiment, updatedAt: Date.now() }

      try {
        await db.transaction('rw', db.experiments, db.revisions, async () => {
          await db.experiments.put(next)
          await db.revisions.put(revision)
        })
        set({
          experiment: next,
          revisions: [...revisions, revision],
          selectedRevisionId: revision.id,
          saveState: 'saved',
        })
        notify(`已记录 v${padVersion(version)} · ${cleanLabel}`)
      } catch {
        set({ saveState: 'error' })
        notify('无法写入本地存储，本次版本未保存。')
      }
    },

    restoreRevision: async (revisionId) => {
      const { experiment, revisions } = get()
      if (!experiment) return
      const revision = revisions.find((item) => item.id === revisionId)
      if (!revision) return

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
      const entry = createRevision(
        restored,
        version,
        `回溯至 v${padVersion(revision.version)}`,
        `恢复「${revision.label}」的快照，并保留完整的回溯记录。`,
      )

      try {
        await db.transaction('rw', db.experiments, db.revisions, async () => {
          await db.experiments.put(restored)
          await db.revisions.put(entry)
        })
        set({
          experiment: restored,
          revisions: [...revisions, entry],
          selectedRevisionId: entry.id,
          saveState: 'saved',
        })
        notify(
          `已回溯至 v${padVersion(revision.version)}，并记录为 v${padVersion(version)}。`,
        )
      } catch {
        set({ saveState: 'error' })
        notify('无法写入本地存储，本次回溯未保存。')
      }
    },

    selectRevision: (revisionId) => {
      set({ selectedRevisionId: revisionId })
    },

    notify,
  }
})
