import { useEffect, useId, useState } from 'react'
import { formatRecordTime } from '../../lib/format'
import { useLabStore } from '../../lib/store'
import { EXPERIMENT_TEMPLATES, FAMILY_LABEL } from '../../lib/templates'
import type { ExperimentFamily } from '../../lib/schema'
import { CloseIcon, CopyIcon, EditIcon, PlusIcon, TrashIcon } from '../ui/Icons'
import { useDialogFocus } from '../ui/useDialogFocus'

export function ExperimentsPanel() {
  const experiments = useLabStore((state) => state.experiments)
  const activeId = useLabStore((state) => state.experiment?.id)
  const aiKey = useLabStore((state) => state.aiKey)
  const aiConfig = useLabStore((state) => state.aiConfig)
  const setAiPanelOpen = useLabStore((state) => state.setAiPanelOpen)
  const setExperimentsPanelOpen = useLabStore((state) => state.setExperimentsPanelOpen)
  const switchExperiment = useLabStore((state) => state.switchExperiment)
  const createExperiment = useLabStore((state) => state.createExperiment)
  const createExperimentFromAi = useLabStore((state) => state.createExperimentFromAi)
  const renameExperiment = useLabStore((state) => state.renameExperiment)
  const duplicateExperiment = useLabStore((state) => state.duplicateExperiment)
  const deleteExperiment = useLabStore((state) => state.deleteExperiment)

  const titleId = useId()
  const nameId = useId()
  const aiDescriptionId = useId()
  const aiClaimId = useId()
  const renameTitleId = useId()
  const renameSubtitleId = useId()

  const [creating, setCreating] = useState(false)
  const [createMode, setCreateMode] = useState<'template' | 'ai'>('template')
  const [createTitle, setCreateTitle] = useState('')
  const [createFamily, setCreateFamily] = useState<ExperimentFamily>('black-box-room')
  const [aiDescription, setAiDescription] = useState('')
  const [aiInitialClaim, setAiInitialClaim] = useState('')
  const [createError, setCreateError] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameSubtitle, setRenameSubtitle] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiStage, setAiStage] = useState('')

  const dialogRef = useDialogFocus<HTMLDivElement>()
  const close = () => setExperimentsPanelOpen(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setExperimentsPanelOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [busy, setExperimentsPanelOpen])

  const run = async (action: () => Promise<boolean>, closeOnSuccess = false) => {
    if (busy) return
    setBusy(true)
    try {
      const ok = await action()
      if (ok && closeOnSuccess) close()
      return ok
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (createMode === 'ai') {
      if (!aiKey) {
        setCreateError('请先连接 AI。')
        return
      }
      if (aiDescription.trim().length < 10) {
        setCreateError('描述至少写 10 个字，说清楚实验里有什么、争的是什么。')
        return
      }
      setCreateError('')
      setBusy(true)
      setAiStage('')
      void (async () => {
        try {
          const result = await createExperimentFromAi(aiDescription, createTitle, aiInitialClaim, setAiStage)
          if (result.ok) close()
          else setCreateError(result.message ?? 'AI 生成失败，请重试。')
        } finally {
          setBusy(false)
          setAiStage('')
        }
      })()
      return
    }
    if (!createTitle.trim()) {
      setCreateError('请先填写实验名称。')
      return
    }
    setCreateError('')
    void run(() => createExperiment(createFamily, createTitle), true)
  }

  const handleRename = (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault()
    if (!renameTitle.trim()) return
    void run(async () => {
      const ok = await renameExperiment(id, renameTitle, renameSubtitle)
      if (ok) setRenamingId(null)
      return ok
    })
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) close()
      }}
    >
      <div
        className="modal experiments-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Experiments</div>
            <h3 id={titleId}>{creating ? '新建实验' : '实验管理'}</h3>
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

        {creating ? (
          <form className="exp-create-form" onSubmit={handleCreate}>
            <div className="segmented exp-create-mode" role="group" aria-label="创建方式">
              <button
                type="button"
                aria-pressed={createMode === 'template'}
                onClick={() => {
                  setCreateMode('template')
                  setCreateError('')
                }}
                disabled={busy}
              >
                从模板创建
              </button>
              <button
                type="button"
                aria-pressed={createMode === 'ai'}
                onClick={() => {
                  setCreateMode('ai')
                  setCreateError('')
                }}
                disabled={busy}
              >
                用 AI 生成
              </button>
            </div>

            <label className="modal-field" htmlFor={nameId}>
              <span className="modal-field-label">
                <span>实验名称</span>
                <span>{createMode === 'ai' ? '可留空，由 AI 命名' : '之后可随时重命名'}</span>
              </span>
              <input
                id={nameId}
                className="field-input"
                value={createTitle}
                onChange={(event) => {
                  setCreateTitle(event.target.value)
                  if (createError) setCreateError('')
                }}
                placeholder="给实验起个名字，例如「机器能理解吗」"
                maxLength={40}
                autoFocus
                disabled={busy}
              />
            </label>

            {createMode === 'ai' ? (
              aiKey ? (
                <>
                  <p className="exp-ai-model">
                    将使用 <strong>{aiConfig.model.trim() || '未命名模型'}</strong>{' '}
                    生成 · 费用由你的服务商按 token 收取
                  </p>
                  <label className="modal-field" htmlFor={aiDescriptionId}>
                    <span className="modal-field-label">
                      <span>描述你的思想实验</span>
                      <span>{aiDescription.length}/600</span>
                    </span>
                    <textarea
                      id={aiDescriptionId}
                      className="field-input exp-ai-input"
                      value={aiDescription}
                      onChange={(event) => {
                        setAiDescription(event.target.value)
                        if (createError) setCreateError('')
                      }}
                      placeholder="说清楚：实验里有什么对象、谁在观察或检验、争的是什么。例如：一台机器能完美模拟我已故亲人的对话，我知道它是程序，但每次回应都恰到好处——它算不算在安慰我？"
                      maxLength={600}
                      rows={5}
                      disabled={busy}
                    />
                  </label>
                  <label className="modal-field" htmlFor={aiClaimId}>
                    <span className="modal-field-label">
                      <span>初步判断（可选）</span>
                      <span>{aiInitialClaim.length}/280</span>
                    </span>
                    <textarea
                      id={aiClaimId}
                      className="field-input exp-ai-claim"
                      value={aiInitialClaim}
                      onChange={(event) => {
                        setAiInitialClaim(event.target.value)
                        if (createError) setCreateError('')
                      }}
                      placeholder="写一句你现在的看法。AI 会把它整理成主张草稿，生成后仍可修改；不填则留空，由你自己下判断。"
                      maxLength={280}
                      rows={2}
                      disabled={busy}
                    />
                  </label>
                  <p className="exp-note">
                    AI 会把描述拆解成场景组件和前提条件，整理情境说明、标出含混处，并生成本实验的质询视角。生成后可以在舞台右上角「自定义场景」里手动调整。
                  </p>
                </>
              ) : (
                <div className="exp-ai-gate">
                  <p>
                    AI 生成会用你自己的模型接口，把描述拆解成场景组件和条件开关。先在顶栏「连接
                    AI」里填写密钥；不连接也可以用模板创建，再手动自定义。
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      close()
                      setAiPanelOpen(true)
                    }}
                    disabled={busy}
                  >
                    去连接 AI
                  </button>
                </div>
              )
            ) : (
              <fieldset className="exp-template-fieldset">
                <legend className="modal-field-label">选择模板</legend>
                <div className="exp-template-grid" role="radiogroup" aria-label="实验模板">
                  {EXPERIMENT_TEMPLATES.map((template) => (
                    <label
                      key={template.family}
                      className={`exp-template-card ${createFamily === template.family ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="experiment-template"
                        value={template.family}
                        checked={createFamily === template.family}
                        onChange={() => setCreateFamily(template.family)}
                        disabled={busy}
                      />
                      <span className="exp-template-name">
                        {template.name}
                        <span className="exp-template-en">{FAMILY_LABEL[template.family].en}</span>
                      </span>
                      <span className="exp-template-tagline">{template.tagline}</span>
                      <span className="exp-template-desc">{template.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {createError && (
              <div className="form-error" role="alert">
                {createError}
              </div>
            )}

            {busy && createMode === 'ai' && aiStage && (
              <p className="exp-ai-stage" role="status">
                <span className="probe-spinner" aria-hidden="true" />
                {aiStage}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setCreating(false)}
                disabled={busy}
              >
                返回
              </button>
              <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
                {busy
                  ? createMode === 'ai'
                    ? 'AI 正在分析实验结构…'
                    : '正在创建'
                  : createMode === 'ai'
                    ? '生成并打开'
                    : '创建并打开'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-sm btn-primary exp-new-btn"
              onClick={() => setCreating(true)}
              disabled={busy}
            >
              <PlusIcon />
              新建实验
            </button>

            <ul className="exp-list" aria-label="全部实验">
              {experiments.map((summary) => {
                const isActive = summary.id === activeId
                if (renamingId === summary.id) {
                  return (
                    <li key={summary.id} className="exp-row is-editing">
                      <form
                        className="exp-rename-form"
                        onSubmit={(event) => handleRename(event, summary.id)}
                      >
                        <label className="modal-field" htmlFor={renameTitleId}>
                          <span className="modal-field-label">名称</span>
                          <input
                            id={renameTitleId}
                            className="field-input"
                            value={renameTitle}
                            onChange={(event) => setRenameTitle(event.target.value)}
                            maxLength={40}
                            autoFocus
                            disabled={busy}
                          />
                        </label>
                        <label className="modal-field" htmlFor={renameSubtitleId}>
                          <span className="modal-field-label">副标题（英文，可留空）</span>
                          <input
                            id={renameSubtitleId}
                            className="field-input"
                            value={renameSubtitle}
                            onChange={(event) => setRenameSubtitle(event.target.value)}
                            maxLength={60}
                            disabled={busy}
                            spellCheck={false}
                          />
                        </label>
                        <div className="exp-inline-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setRenamingId(null)}
                            disabled={busy}
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="btn btn-sm btn-primary"
                            disabled={busy || !renameTitle.trim()}
                          >
                            保存
                          </button>
                        </div>
                      </form>
                    </li>
                  )
                }
                if (confirmDeleteId === summary.id) {
                  return (
                    <li key={summary.id} className="exp-row is-editing">
                      <div className="exp-confirm" role="alert">
                        <p>
                          删除「{summary.title}」？它的 {summary.revisionCount} 个版本记录会一并删除，不可恢复。
                        </p>
                        <div className="exp-inline-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={busy}
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const ok = await deleteExperiment(summary.id)
                                if (ok) setConfirmDeleteId(null)
                                return ok
                              })
                            }
                          >
                            {busy ? '正在删除' : '确认删除'}
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                }
                return (
                  <li key={summary.id} className={`exp-row ${isActive ? 'is-active' : ''}`}>
                    <button
                      type="button"
                      className="exp-row-main"
                      disabled={busy}
                      onClick={() => {
                        if (isActive) close()
                        else void run(() => switchExperiment(summary.id), true)
                      }}
                      title={isActive ? '当前实验，点击关闭面板' : '打开这个实验'}
                    >
                      <span className="exp-row-title">
                        {summary.title}
                        {isActive && <span className="exp-badge">当前</span>}
                      </span>
                      <span className="exp-row-meta">
                        {FAMILY_LABEL[summary.family].zh} · {summary.revisionCount} 个版本 · 更新于{' '}
                        {formatRecordTime(summary.updatedAt)}
                      </span>
                    </button>
                    <div className="exp-row-actions">
                      <button
                        type="button"
                        className="exp-icon-btn"
                        title="重命名"
                        aria-label={`重命名 ${summary.title}`}
                        disabled={busy}
                        onClick={() => {
                          setConfirmDeleteId(null)
                          setRenamingId(summary.id)
                          setRenameTitle(summary.title)
                          setRenameSubtitle(summary.subtitle)
                        }}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="exp-icon-btn"
                        title="复制当前状态为新实验"
                        aria-label={`复制 ${summary.title}`}
                        disabled={busy}
                        onClick={() => void run(() => duplicateExperiment(summary.id), true)}
                      >
                        <CopyIcon />
                      </button>
                      <button
                        type="button"
                        className="exp-icon-btn is-danger"
                        title={experiments.length <= 1 ? '至少保留一个实验' : '删除'}
                        aria-label={`删除 ${summary.title}`}
                        disabled={busy || experiments.length <= 1}
                        onClick={() => {
                          setRenamingId(null)
                          setConfirmDeleteId(summary.id)
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <p className="exp-note">
              实验只保存在这台设备的浏览器里。顶栏「导出 JSON」导出的是当前打开的实验。
            </p>
          </>
        )}
      </div>
    </div>
  )
}