import { useState, type FormEvent } from 'react'
import { assetUrl } from '../lib/asset'
import { verifyCode } from '../lib/beta'

interface BetaGateProps {
  onUnlock: () => void
}

// 内测邀请码门禁屏。文案为草稿，最终措辞由用户决定（见 BETA_GATE_SPEC.zh-CN.md）。
export function BetaGate({ onUnlock }: BetaGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(false)
    const ok = await verifyCode(code)
    setBusy(false)
    if (ok) {
      onUnlock()
    } else {
      setError(true)
    }
  }

  return (
    <div className="beta-gate" role="dialog" aria-modal="true" aria-labelledby="beta-gate-title">
      <form className="beta-card" onSubmit={handleSubmit}>
        <img className="beta-icon" src={assetUrl('icon.png')} alt="" />
        <h1 className="beta-title" id="beta-gate-title">
          PP Lab 内测
        </h1>
        <p className="beta-sub">本项目尚在打磨，目前仅向受邀用户开放。</p>
        <label className="beta-label" htmlFor="beta-code">
          邀请码
        </label>
        <input
          id="beta-code"
          className="beta-input"
          type="text"
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            if (error) setError(false)
          }}
          placeholder="AAAA-BBBB-CCCC-DDDD"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          aria-invalid={error}
          aria-describedby={error ? 'beta-error' : undefined}
          disabled={busy}
        />
        {error && (
          <p className="beta-error" id="beta-error" role="alert">
            邀请码不正确，请检查后重试。
          </p>
        )}
        <button
          className="btn btn-primary beta-submit"
          type="submit"
          disabled={busy || code.trim() === ''}
        >
          {busy ? '校验中…' : '进入实验室'}
        </button>
        <p className="beta-help">没有邀请码？请联系项目作者获取。</p>
      </form>
    </div>
  )
}