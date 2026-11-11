import { useEffect, useId, useState } from 'react'
import { CloseIcon } from './Icons'
import { useDialogFocus } from './useDialogFocus'

interface RevisionDialogProps {
  open: boolean
  defaultLabel: string
  onClose: () => void
  onSubmit: (label: string, reason: string) => Promise<boolean>
}

export function RevisionDialog({
  open,
  defaultLabel,
  onClose,
  onSubmit,
}: RevisionDialogProps) {
  const titleId = useId()
  const labelId = useId()
  const reasonId = useId()
  const [label, setLabel] = useState(defaultLabel)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const dialogRef = useDialogFocus<HTMLFormElement>(open)

  useEffect(() => {
    if (!open) return
    setLabel(defaultLabel)
    setReason('')
    setError('')
    setPending(false)
  }, [open, defaultLabel])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose, pending])

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanReason = reason.trim()
    if (!cleanReason) {
      setError('版本必须留下修改理由。')
      return
    }
    setError('')
    setPending(true)
    try {
      if (await onSubmit(label, cleanReason)) onClose()
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => void handleSubmit(event)}
        ref={dialogRef}
      >
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Record a checkpoint</div>
            <h3 id={titleId}>保存当前版本</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="关闭"
            disabled={pending}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="modal-fields">
          <label className="modal-field" htmlFor={labelId}>
            <span className="modal-field-label">
              <span>版本名称</span>
              <span>可选</span>
            </span>
            <input
              id={labelId}
              className="field-input"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={defaultLabel}
              disabled={pending}
              maxLength={48}
              autoFocus
            />
          </label>

          <label className="modal-field" htmlFor={reasonId}>
            <span className="modal-field-label">
              <span>修改理由</span>
              <span className="required">必填</span>
            </span>
            <textarea
              id={reasonId}
              className="field-input"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                if (error) setError('')
              }}
              placeholder="（待填写）"
              disabled={pending}
              maxLength={280}
            />
          </label>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            disabled={pending}
          >
            取消
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
            {pending ? '正在记录' : '写入反例轨道'}
          </button>
        </div>
      </form>
    </div>
  )
}
