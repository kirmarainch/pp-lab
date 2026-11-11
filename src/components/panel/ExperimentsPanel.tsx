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
  const setExperimentsPanelOpen = useLabStore((state) => state.setExperimentsPanelOpen)
  const switchExperiment = useLabStore((state) => state.switchExperiment)
  const createExperiment = useLabStore((state) => state.createExperiment)
  const renameExperiment = useLabStore((state) => state.renameExperiment)
  const duplicateExperiment = useLabStore((state) => state.duplicateExperiment)
  const deleteExperiment = useLabStore((state) => state.deleteExperiment)

  const titleId = useId()
  const nameId = useId()
  const renameTitleId = useId()
  const renameSubtitleId = useId()

  const [creating, setCreating] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createFamily, setCreateFamily] = useState<ExperimentFamily>('black-box-room')
  const [createError, setCreateError] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameSubtitle, setRenameSubtitle] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
            <label className="modal-field" htmlFor={nameId}>
              <span className="modal-field-label">
                <span>实验名称</span>
                <span>之后可随时重命名</span>
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

            {createError && (
              <div className="form-error" role="alert">
                {createError}
              </div>
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
                {busy ? '正在创建' : '创建并打开'}
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