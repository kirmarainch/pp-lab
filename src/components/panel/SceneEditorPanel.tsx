import { useEffect, useId, useState } from 'react'
import {
  BINDABLE_KINDS,
  CONDITION_AXES,
  ENTITY_KINDS,
  KIND_META,
  assembleScene,
  draftFromScene,
  newConditionId,
  type EntityKind,
  type SceneDraft,
} from '../../lib/sceneDraft'
import type { ExperimentBrief, ExperimentFamily } from '../../lib/schema'
import { useLabStore } from '../../lib/store'
import { FAMILY_LABEL } from '../../lib/templates'
import { CloseIcon, PlusIcon, TrashIcon } from '../ui/Icons'
import { useDialogFocus } from '../ui/useDialogFocus'

export function SceneEditorPanel() {
  const experiment = useLabStore((state) => state.experiment)
  const revisionPending = useLabStore((state) => state.revisionPending)
  const setSceneEditorOpen = useLabStore((state) => state.setSceneEditorOpen)
  const applySceneDraft = useLabStore((state) => state.applySceneDraft)

  const titleId = useId()
  const basicId = useId()
  const kindsId = useId()
  const conditionsId = useId()
  const nameId = useId()
  const subtitleId = useId()
  const familyId = useId()
  const briefId = useId()
  const situationId = useId()
  const notesId = useId()

  const [draft, setDraft] = useState<SceneDraft | null>(() =>
    experiment ? draftFromScene(experiment.sceneSpec) : null,
  )
  const [briefSituation, setBriefSituation] = useState(experiment?.brief?.situation ?? '')
  const [briefNotes, setBriefNotes] = useState((experiment?.brief?.notes ?? []).join('\n'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const dialogRef = useDialogFocus<HTMLDivElement>()
  const close = () => setSceneEditorOpen(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setSceneEditorOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [busy, setSceneEditorOpen])

  if (!experiment || !draft) return null

  const update = (patch: Partial<SceneDraft>) => {
    setDraft({ ...draft, ...patch })
    if (error) setError('')
  }

  const toggleKind = (kind: EntityKind) => {
    const exists = draft.entities.some((entity) => entity.kind === kind)
    if (exists) {
      update({
        entities: draft.entities.filter((entity) => entity.kind !== kind),
        conditions: draft.conditions.map((condition) => ({
          ...condition,
          targets: condition.targets.filter((target) => target !== kind),
        })),
      })
    } else {
      const meta = KIND_META[kind]
      update({
        entities: [
          ...draft.entities,
          { kind, label: meta.defaultLabel, caption: meta.defaultCaption },
        ],
      })
    }
  }

  const updateEntity = (kind: EntityKind, patch: { label?: string; caption?: string }) => {
    update({
      entities: draft.entities.map((entity) =>
        entity.kind === kind ? { ...entity, ...patch } : entity,
      ),
    })
  }

  const updateCondition = (
    index: number,
    patch: Partial<SceneDraft['conditions'][number]>,
  ) => {
    update({
      conditions: draft.conditions.map((condition, i) =>
        i === index ? { ...condition, ...patch } : condition,
      ),
    })
  }

  const toggleTarget = (index: number, kind: EntityKind) => {
    const condition = draft.conditions[index]
    if (!condition) return
    const targets = condition.targets.includes(kind)
      ? condition.targets.filter((target) => target !== kind)
      : [...condition.targets, kind]
    updateCondition(index, { targets })
  }

  const presentBindableKinds = BINDABLE_KINDS.filter((kind) =>
    draft.entities.some((entity) => entity.kind === kind),
  )

  const handleSave = () => {
    if (busy || revisionPending) return
    const title = draft.title.trim()
    if (!title) {
      setError('请先填写实验名称。')
      return
    }
    if (draft.entities.length === 0) {
      setError('至少保留一个场景组件。')
      return
    }
    if (draft.entities.some((entity) => !entity.label.trim())) {
      setError('组件名称不能为空。')
      return
    }
    if (draft.conditions.length === 0) {
      setError('至少保留一个条件开关。')
      return
    }
    if (draft.conditions.some((condition) => !condition.label.trim())) {
      setError('条件名称不能为空。')
      return
    }
    const clean: SceneDraft = {
      ...draft,
      title,
      subtitle: draft.subtitle.trim() || FAMILY_LABEL[draft.family].en,
    }
    try {
      assembleScene(clean)
    } catch {
      setError('场景结构不合法，请检查组件与条件设置。')
      return
    }
    const brief: ExperimentBrief = {
      situation: briefSituation.trim().slice(0, 200),
      notes: briefNotes
        .split('\n')
        .map((note) => note.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((note) => note.slice(0, 60)),
    }
    setBusy(true)
    void (async () => {
      try {
        const ok = await applySceneDraft(clean, brief)
        if (ok) close()
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) close()
      }}
    >
      <div
        className="modal scene-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Scene Editor</div>
            <h3 id={titleId}>自定义场景</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={close}
            aria-label="关闭"
            disabled={busy}
          >
            <CloseIcon />
          </button>
        </div>

        <p className="modal-desc">
          舞台由 7 个固定组件位构成：勾选组件、改名，再设置每个条件开关作用于哪些组件。保存后 3D
          场景与左侧条件列表立即更新，并记入版本轨道。
        </p>

        <div className="scene-editor-body scroll-area">
          <section aria-labelledby={basicId}>
            <h4 className="se-section-title" id={basicId}>
              基本信息
            </h4>
            <div className="se-basic-grid">
              <label className="modal-field" htmlFor={nameId}>
                <span className="modal-field-label">实验名称</span>
                <input
                  id={nameId}
                  className="field-input"
                  value={draft.title}
                  onChange={(event) => update({ title: event.target.value })}
                  maxLength={40}
                  disabled={busy}
                  autoFocus
                />
              </label>
              <label className="modal-field" htmlFor={subtitleId}>
                <span className="modal-field-label">副标题（英文）</span>
                <input
                  id={subtitleId}
                  className="field-input"
                  value={draft.subtitle}
                  onChange={(event) => update({ subtitle: event.target.value })}
                  maxLength={60}
                  disabled={busy}
                  spellCheck={false}
                />
              </label>
              <label className="modal-field se-family-field" htmlFor={familyId}>
                <span className="modal-field-label">实验家族（分类标签）</span>
                <select
                  id={familyId}
                  className="field-input"
                  value={draft.family}
                  onChange={(event) =>
                    update({ family: event.target.value as ExperimentFamily })
                  }
                  disabled={busy}
                >
                  {(Object.keys(FAMILY_LABEL) as ExperimentFamily[]).map((family) => (
                    <option key={family} value={family}>
                      {FAMILY_LABEL[family].zh} · {FAMILY_LABEL[family].en}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section aria-labelledby={briefId}>
            <h4 className="se-section-title" id={briefId}>
              实验说明
              <span>显示在舞台左下角的说明卡</span>
            </h4>
            <label className="modal-field" htmlFor={situationId}>
              <span className="modal-field-label">
                <span>情境说明</span>
                <span>{briefSituation.length}/200</span>
              </span>
              <textarea
                id={situationId}
                className="field-input se-brief-situation"
                value={briefSituation}
                onChange={(event) => setBriefSituation(event.target.value)}
                placeholder="这个实验设定了什么情境？舞台画面表达不了的背景写在这里。"
                maxLength={200}
                rows={3}
                disabled={busy}
              />
            </label>
            <label className="modal-field" htmlFor={notesId}>
              <span className="modal-field-label">
                <span>含混处与控制条件</span>
                <span>每行一条，最多 4 条，每条 60 字</span>
              </span>
              <textarea
                id={notesId}
                className="field-input se-brief-notes"
                value={briefNotes}
                onChange={(event) => setBriefNotes(event.target.value)}
                placeholder={'每行一条，例如：\n「准确率相同」只是控制条件，不意味着两者在所有相关方面相同。'}
                maxLength={243}
                rows={4}
                disabled={busy}
              />
            </label>
          </section>

          <section aria-labelledby={kindsId}>
            <h4 className="se-section-title" id={kindsId}>
              场景组件
              <span>已启用 {draft.entities.length}/7</span>
            </h4>
            <div className="se-kind-grid">
              {ENTITY_KINDS.map((kind) => {
                const meta = KIND_META[kind]
                const entity = draft.entities.find((item) => item.kind === kind)
                return (
                  <div key={kind} className={`se-kind-card ${entity ? 'is-on' : ''}`}>
                    <label className="se-kind-head">
                      <input
                        type="checkbox"
                        checked={Boolean(entity)}
                        onChange={() => toggleKind(kind)}
                        disabled={busy}
                      />
                      <span className="se-kind-name">
                        {meta.name}
                        <span className="se-kind-en">{meta.en}</span>
                      </span>
                    </label>
                    <p className="se-kind-role">{meta.role}</p>
                    {entity && (
                      <div className="se-kind-fields">
                        <input
                          className="field-input"
                          aria-label={`${meta.name}名称`}
                          value={entity.label}
                          onChange={(event) =>
                            updateEntity(kind, { label: event.target.value })
                          }
                          maxLength={20}
                          disabled={busy}
                        />
                        <input
                          className="field-input"
                          aria-label={`${meta.name}英文标注`}
                          value={entity.caption}
                          onChange={(event) =>
                            updateEntity(kind, { caption: event.target.value })
                          }
                          maxLength={40}
                          disabled={busy}
                          spellCheck={false}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section aria-labelledby={conditionsId}>
            <h4 className="se-section-title" id={conditionsId}>
              条件开关
              <span>{draft.conditions.length}/8</span>
            </h4>
            <div className="se-cond-list">
              {draft.conditions.map((condition, index) => (
                <div className="se-cond-card" key={condition.id}>
                  <div className="se-cond-head">
                    <span className="se-cond-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <input
                      className="field-input se-cond-label"
                      aria-label={`条件 ${index + 1} 名称`}
                      value={condition.label}
                      onChange={(event) =>
                        updateCondition(index, { label: event.target.value })
                      }
                      maxLength={20}
                      disabled={busy}
                    />
                    <select
                      className="field-input se-cond-axis"
                      aria-label={`条件 ${index + 1} 类型`}
                      value={condition.axis}
                      onChange={(event) =>
                        updateCondition(index, {
                          axis: event.target.value as SceneDraft['conditions'][number]['axis'],
                        })
                      }
                      disabled={busy}
                    >
                      {CONDITION_AXES.map((axis) => (
                        <option key={axis.value} value={axis.value}>
                          {axis.label} · {axis.hint}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="exp-icon-btn is-danger"
                      aria-label={`删除条件 ${condition.label || index + 1}`}
                      title="删除这个条件"
                      onClick={() =>
                        update({
                          conditions: draft.conditions.filter((_, i) => i !== index),
                        })
                      }
                      disabled={busy}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <input
                    className="field-input"
                    aria-label={`条件 ${index + 1} 说明`}
                    placeholder="一句话解释这个前提，探针会引用它。"
                    value={condition.hint}
                    onChange={(event) =>
                      updateCondition(index, { hint: event.target.value })
                    }
                    maxLength={120}
                    disabled={busy}
                  />
                  <div
                    className="se-cond-targets"
                    role="group"
                    aria-label={`条件「${condition.label || index + 1}」作用的组件`}
                  >
                    <span className="se-targets-label">开启时改变：</span>
                    {presentBindableKinds.map((kind) => {
                      const checked = condition.targets.includes(kind)
                      return (
                        <label
                          key={kind}
                          className={`se-target-chip ${checked ? 'is-on' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTarget(index, kind)}
                            disabled={busy}
                          />
                          {KIND_META[kind].name}
                        </label>
                      )
                    })}
                    {presentBindableKinds.length === 0 && (
                      <span className="se-targets-empty">先在上方启用组件</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-sm se-add-cond"
              onClick={() =>
                update({
                  conditions: [
                    ...draft.conditions,
                    {
                      id: newConditionId(),
                      label: `条件 ${draft.conditions.length + 1}`,
                      hint: '',
                      axis: 'epistemic',
                      value: false,
                      targets: [],
                    },
                  ],
                })
              }
              disabled={busy || draft.conditions.length >= 8}
            >
              <PlusIcon />
              添加条件
            </button>
          </section>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-sm" onClick={close} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={busy || revisionPending}
          >
            {busy ? '正在保存' : '保存并应用'}
          </button>
        </div>
      </div>
    </div>
  )
}