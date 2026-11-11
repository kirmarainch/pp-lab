import { create } from 'zustand'
import { db } from './db'
import { createSeedExperiment, initialConditionsNote } from './seed'
import { createExperimentFromTemplate, FAMILY_LABEL } from './templates'
import { newId } from './id'
import { runPremiseProbe } from './probe'
import {
  generateAiProbe,
  loadAiConfig,
  loadApiKey,
  saveAiConfig,
  saveApiKey,
  validateBaseUrl,
  type AiConfig,
} from './ai'
import { setConditionValue } from './resolveScene'
import { createRevision, nextRevisionNumber } from './revision'
import type { Experiment, ExperimentFamily, Probe, ProbeStatus, Revision } from './schema'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
export type ProbeAction = 'respond' | 'revise' | 'retain'
export type AiStatus = 'off' | 'untested' | 'connected' | 'error'

export interface ExperimentSummary {
  id: string
  title: string
  subtitle: string
  family: ExperimentFamily
  updatedAt: number
  revisionCount: number
}

const ACTIVE_EXPERIMENT_KEY = 'pp-lab.activeExperiment'

function loadActiveExperimentId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_EXPERIMENT_KEY)
  } catch {
    return null
  }
}

function saveActiveExperimentId(id: string) {
  try {
    localStorage.setItem(ACTIVE_EXPERIMENT_KEY, id)
  } catch {
    // 隐私模式下 localStorage 不可用时，仅本次会话记住选择。
  }
}

interface Toast {
  id: number
  text: string
}

interface LabStore {
  experiment: Experiment | null
  revisions: Revision[]
  experiments: ExperimentSummary[]
  selectedRevisionId: string | null
  hydrated: boolean
  saveState: SaveState
  revisionPending: boolean
  toast: Toast | null
  aiConfig: AiConfig
  aiKey: string
  aiStatus: AiStatus
  aiPanelOpen: boolean
  experimentsPanelOpen: boolean
  probeRunning: boolean
  hydrate: () => Promise<void>
  toggleCondition: (conditionId: string) => void
  updateClaim: (claim: string) => void
  setStance: (stanceId: string) => void
  runProbe: () => void
  resolveProbe: (action: ProbeAction, response?: string, revisedClaim?: string) => Promise<boolean>
  saveVersion: (label: string, reason: string) => Promise<boolean>
  restoreRevision: (revisionId: string) => Promise<boolean>
  selectRevision: (revisionId: string | null) => void
  setAiPanelOpen: (open: boolean) => void
  setExperimentsPanelOpen: (open: boolean) => void
  switchExperiment: (id: string) => Promise<boolean>
  createExperiment: (family: ExperimentFamily, title: string) => Promise<boolean>
  renameExperiment: (id: string, title: string, subtitle: string) => Promise<boolean>
  duplicateExperiment: (id: string) => Promise<boolean>
  deleteExperiment: (id: string) => Promise<boolean>
  saveAiSettings: (config: AiConfig, key: string, testedOk?: boolean) => boolean
  disconnectAi: () => void
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

  const loadExperiment = async (id: string) => {
    const experiment = await db.experiments.get(id)
    if (!experiment) return null
    let revisions = await db.revisions.where('experimentId').equals(id).sortBy('version')
    if (revisions.length === 0) {
      const initial = createRevision(experiment, 1, '初始状态', initialConditionsNote(experiment))
      await enqueueWrite(async () => {
        await db.revisions.put(initial)
      })
      revisions = [initial]
    }
    return { experiment, revisions }
  }

  const buildSummaries = async (experiments: Experiment[]): Promise<ExperimentSummary[]> => {
    const summaries = await Promise.all(
      experiments.map(async (experiment) => ({
        id: experiment.id,
        title: experiment.title,
        subtitle: experiment.subtitle,
        family: experiment.family,
        updatedAt: experiment.updatedAt,
        revisionCount: await db.revisions.where('experimentId').equals(experiment.id).count(),
      })),
    )
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  const refreshSummaries = async () => {
    try {
      const all = await db.experiments.toArray()
      set({ experiments: await buildSummaries(all) })
    } catch {
      // 列表刷新失败不影响当前实验；下次打开面板时再试。
    }
  }

  const flushCurrentDraft = async () => {
    cancelSaveTimer()
    await writeQueue
    const current = get().experiment
    if (current && get().saveState !== 'saved') await persistNow(current)
  }

  const activate = (loaded: { experiment: Experiment; revisions: Revision[] }) => {
    saveActiveExperimentId(loaded.experiment.id)
    set({
      experiment: loaded.experiment,
      revisions: loaded.revisions,
      selectedRevisionId: loaded.revisions.at(-1)?.id ?? null,
      saveState: 'saved',
    })
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
        experiments: get().experiments.map((summary) =>
          summary.id === change.experiment.id
            ? {
                ...summary,
                updatedAt: change.experiment.updatedAt,
                revisionCount: revisions.length + 1,
              }
            : summary,
        ),
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
    experiments: [],
    selectedRevisionId: null,
    hydrated: false,
    saveState: 'idle',
    revisionPending: false,
    toast: null,
    aiConfig: loadAiConfig(),
    aiKey: loadApiKey(),
    aiStatus: loadApiKey() ? 'untested' : 'off',
    aiPanelOpen: false,
    experimentsPanelOpen: false,
    probeRunning: false,

    hydrate: async () => {
      if (get().hydrated || hydrating) return
      hydrating = true
      try {
        let all = await db.experiments.orderBy('updatedAt').reverse().toArray()
        if (all.length === 0) {
          const seed = createSeedExperiment()
          await enqueueWrite(async () => {
            await db.experiments.put(seed)
          })
          all = [seed]
        }
        const activeId = loadActiveExperimentId()
        const active = all.find((item) => item.id === activeId) ?? all[0]
        const loaded = await loadExperiment(active.id)
        if (!loaded) throw new Error('实验读取失败。')
        saveActiveExperimentId(active.id)
        set({
          experiment: loaded.experiment,
          revisions: loaded.revisions,
          experiments: await buildSummaries(all),
          selectedRevisionId: loaded.revisions.at(-1)?.id ?? null,
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
          experiments: [
            {
              id: experiment.id,
              title: experiment.title,
              subtitle: experiment.subtitle,
              family: experiment.family,
              updatedAt: experiment.updatedAt,
              revisionCount: 1,
            },
          ],
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
      if (!experiment || get().revisionPending || get().probeRunning) return
      const localProbe = runPremiseProbe({
        claim: experiment.claim,
        sceneSpec: experiment.sceneSpec,
        stanceId: experiment.stanceId,
      })
      const { aiKey, aiConfig } = get()
      if (!aiKey) {
        commit({ ...experiment, probe: localProbe, updatedAt: Date.now() }, true)
        notify('探针已生成。')
        return
      }
      set({ probeRunning: true })
      const experimentId = experiment.id
      void (async () => {
        try {
          const generated = await generateAiProbe(aiConfig, aiKey, {
            title: experiment.title,
            claim: experiment.claim,
            sceneSpec: experiment.sceneSpec,
            stanceId: experiment.stanceId,
            targetPremise: localProbe.targetPremise,
          })
          const current = get().experiment
          // 生成期间用户可能切换了实验；结果只写回发起时的那个实验。
          if (!current || current.id !== experimentId) return
          const probe: Probe = {
            ...localProbe,
            objection: generated.objection,
            question: generated.question,
            origin: 'ai',
            model: aiConfig.model.trim(),
          }
          commit({ ...current, probe, updatedAt: Date.now() }, true)
          notify('AI 探针已生成。')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI 探针生成失败。'
          const current = get().experiment
          if (!current || current.id !== experimentId) return
          commit({ ...current, probe: localProbe, updatedAt: Date.now() }, true)
          notify(`${message} 已改用本地探针。`)
        } finally {
          set({ probeRunning: false })
        }
      })()
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

    setAiPanelOpen: (open) => {
      set({ aiPanelOpen: open })
    },

    setExperimentsPanelOpen: (open) => {
      set({ experimentsPanelOpen: open })
      if (open) void refreshSummaries()
    },

    switchExperiment: async (id) => {
      if (get().revisionPending) return false
      if (get().experiment?.id === id) return true
      try {
        await flushCurrentDraft()
        const loaded = await loadExperiment(id)
        if (!loaded) {
          notify('没有找到这个实验。')
          return false
        }
        activate(loaded)
        return true
      } catch {
        notify('无法读取本地存储，切换失败。')
        return false
      }
    },

    createExperiment: async (family, title) => {
      const cleanTitle = title.trim().slice(0, 40)
      if (!cleanTitle) {
        notify('请先填写实验名称。')
        return false
      }
      if (get().revisionPending) return false
      try {
        await flushCurrentDraft()
        const experiment = createExperimentFromTemplate(family, cleanTitle)
        const initial = createRevision(
          experiment,
          1,
          '初始状态',
          `从模板「${FAMILY_LABEL[family].zh}」创建。`,
        )
        await enqueueWrite(async () => {
          await db.transaction('rw', db.experiments, db.revisions, async () => {
            await db.experiments.put(experiment)
            await db.revisions.put(initial)
          })
        })
        activate({ experiment, revisions: [initial] })
        await refreshSummaries()
        notify(`已创建「${experiment.title}」。`)
        return true
      } catch {
        notify('无法写入本地存储，创建失败。')
        return false
      }
    },

    renameExperiment: async (id, title, subtitle) => {
      const cleanTitle = title.trim().slice(0, 40)
      if (!cleanTitle) {
        notify('请先填写实验名称。')
        return false
      }
      if (get().revisionPending) return false
      try {
        await flushCurrentDraft()
        const current = get().experiment
        const source = current?.id === id ? current : await db.experiments.get(id)
        if (!source) {
          notify('没有找到这个实验。')
          return false
        }
        const cleanSubtitle = subtitle.trim().slice(0, 60) || source.subtitle
        const next: Experiment = {
          ...source,
          title: cleanTitle,
          subtitle: cleanSubtitle,
          sceneSpec: { ...source.sceneSpec, title: cleanTitle, subtitle: cleanSubtitle },
          updatedAt: Date.now(),
        }
        await enqueueWrite(async () => {
          await db.experiments.put(next)
        })
        if (current?.id === id) set({ experiment: next, saveState: 'saved' })
        await refreshSummaries()
        notify(`已重命名为「${cleanTitle}」。`)
        return true
      } catch {
        notify('无法写入本地存储，重命名失败。')
        return false
      }
    },

    duplicateExperiment: async (id) => {
      if (get().revisionPending) return false
      try {
        await flushCurrentDraft()
        const current = get().experiment
        const source = current?.id === id ? current : await db.experiments.get(id)
        if (!source) {
          notify('没有找到这个实验。')
          return false
        }
        const now = Date.now()
        const copyTitle = `${source.title} 副本`.slice(0, 40)
        const copy: Experiment = {
          ...structuredClone(source),
          id: newId('exp'),
          title: copyTitle,
          createdAt: now,
          updatedAt: now,
        }
        copy.sceneSpec = { ...copy.sceneSpec, title: copyTitle }
        const initial = createRevision(copy, 1, '初始状态', `从「${source.title}」复制当前状态。`)
        await enqueueWrite(async () => {
          await db.transaction('rw', db.experiments, db.revisions, async () => {
            await db.experiments.put(copy)
            await db.revisions.put(initial)
          })
        })
        activate({ experiment: copy, revisions: [initial] })
        await refreshSummaries()
        notify(`已复制为「${copy.title}」。`)
        return true
      } catch {
        notify('无法写入本地存储，复制失败。')
        return false
      }
    },

    deleteExperiment: async (id) => {
      if (get().revisionPending) return false
      try {
        await flushCurrentDraft()
        const all = await db.experiments.orderBy('updatedAt').reverse().toArray()
        const target = all.find((item) => item.id === id)
        if (!target) {
          notify('没有找到这个实验。')
          return false
        }
        if (all.length <= 1) {
          notify('至少保留一个实验。')
          return false
        }
        await enqueueWrite(async () => {
          await db.transaction('rw', db.experiments, db.revisions, async () => {
            await db.experiments.delete(id)
            await db.revisions.where('experimentId').equals(id).delete()
          })
        })
        if (get().experiment?.id === id) {
          const next = all.find((item) => item.id !== id)
          const loaded = next ? await loadExperiment(next.id) : null
          if (loaded) activate(loaded)
        }
        await refreshSummaries()
        notify(`已删除「${target.title}」及其版本记录。`)
        return true
      } catch {
        notify('无法写入本地存储，删除失败。')
        return false
      }
    },

    saveAiSettings: (config, key, testedOk = false) => {
      const urlError = validateBaseUrl(config.baseUrl)
      if (urlError) {
        notify(urlError)
        return false
      }
      if (!config.model.trim()) {
        notify('请填写模型名。')
        return false
      }
      if (!key.trim()) {
        notify('请填写 API 密钥。')
        return false
      }
      saveAiConfig(config)
      saveApiKey(key.trim())
      set({
        aiConfig: config,
        aiKey: key.trim(),
        aiStatus: testedOk ? 'connected' : 'untested',
      })
      notify(testedOk ? 'AI 已连接。' : 'AI 设置已保存，建议先测试连接。')
      return true
    },

    disconnectAi: () => {
      saveApiKey('')
      set({ aiKey: '', aiStatus: 'off' })
      notify('已断开 AI，探针恢复为本地规则。')
    },

    notify,
  }
})
