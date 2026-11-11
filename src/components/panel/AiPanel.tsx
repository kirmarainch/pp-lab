import { useEffect, useId, useState } from 'react'
import {
  AI_PRESETS,
  testAiConnection,
  validateBaseUrl,
  type AiConfig,
} from '../../lib/ai'
import { useLabStore } from '../../lib/store'
import { CloseIcon } from '../ui/Icons'
import { useDialogFocus } from '../ui/useDialogFocus'

const STATUS_TEXT = {
  off: '当前未连接。不连接也能使用本地规则探针。',
  untested: '已保存密钥，尚未测试连接。',
  connected: '已连接。运行探针时将通过你的模型接口生成。',
  error: '上次连接失败，请检查设置。',
} as const

export function AiPanel() {
  const aiConfig = useLabStore((state) => state.aiConfig)
  const aiKey = useLabStore((state) => state.aiKey)
  const aiStatus = useLabStore((state) => state.aiStatus)
  const setAiPanelOpen = useLabStore((state) => state.setAiPanelOpen)
  const saveAiSettings = useLabStore((state) => state.saveAiSettings)
  const disconnectAi = useLabStore((state) => state.disconnectAi)

  const titleId = useId()
  const presetId = useId()
  const baseUrlId = useId()
  const modelId = useId()
  const keyId = useId()

  const [preset, setPreset] = useState(aiConfig.preset)
  const [baseUrl, setBaseUrl] = useState(aiConfig.baseUrl)
  const [model, setModel] = useState(aiConfig.model)
  const [key, setKey] = useState(aiKey)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testedFor, setTestedFor] = useState('')

  const dialogRef = useDialogFocus<HTMLFormElement>()
  const close = () => setAiPanelOpen(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !testing) setAiPanelOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [testing, setAiPanelOpen])

  const signature = JSON.stringify([baseUrl.trim(), model.trim(), key.trim()])

  const handlePresetChange = (nextPreset: string) => {
    setPreset(nextPreset)
    const def = AI_PRESETS.find((item) => item.id === nextPreset)
    if (def && def.id !== 'custom') {
      setBaseUrl(def.baseUrl)
      setModel(def.model)
    }
    setTestResult(null)
    setError('')
  }

  const currentConfig: AiConfig = { preset, baseUrl, model }

  const handleTest = async () => {
    const urlError = validateBaseUrl(baseUrl)
    if (urlError) {
      setError(urlError)
      return
    }
    if (!key.trim()) {
      setError('请先填写 API 密钥。')
      return
    }
    setError('')
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testAiConnection(currentConfig, key)
      setTestResult(result)
      setTestedFor(signature)
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const urlError = validateBaseUrl(baseUrl)
    if (urlError) {
      setError(urlError)
      return
    }
    const testedOk = Boolean(testResult?.ok && testedFor === signature)
    if (saveAiSettings(currentConfig, key, testedOk)) close()
  }

  const handleDisconnect = () => {
    disconnectAi()
    setKey('')
    setTestResult(null)
    setTestedFor('')
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !testing) close()
      }}
    >
      <form
        className="modal ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        ref={dialogRef}
      >
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Bring your own model</div>
            <h3 id={titleId}>连接 AI</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={close}
            aria-label="关闭"
            disabled={testing}
          >
            <CloseIcon />
          </button>
        </div>

        <p className="ai-status-line" data-ai-status={aiStatus}>
          {STATUS_TEXT[aiStatus]}
        </p>

        <div className="modal-fields">
          <label className="modal-field" htmlFor={presetId}>
            <span className="modal-field-label">
              <span>服务商</span>
            </span>
            <select
              id={presetId}
              className="field-input"
              value={preset}
              onChange={(event) => handlePresetChange(event.target.value)}
              disabled={testing}
            >
              {AI_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="modal-field" htmlFor={baseUrlId}>
            <span className="modal-field-label">
              <span>接口地址</span>
              <span>OpenAI 兼容 · 仅公网 HTTPS</span>
            </span>
            <input
              id={baseUrlId}
              className="field-input"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value)
                setPreset('custom')
                setTestResult(null)
                if (error) setError('')
              }}
              placeholder="https://api.example.com/v1"
              disabled={testing}
              autoFocus={!aiConfig.baseUrl}
              maxLength={200}
              spellCheck={false}
            />
          </label>

          <label className="modal-field" htmlFor={modelId}>
            <span className="modal-field-label">
              <span>模型名</span>
            </span>
            <input
              id={modelId}
              className="field-input"
              value={model}
              onChange={(event) => {
                setModel(event.target.value)
                setTestResult(null)
              }}
              placeholder="例如 deepseek-chat"
              disabled={testing}
              maxLength={80}
              spellCheck={false}
            />
          </label>

          <label className="modal-field" htmlFor={keyId}>
            <span className="modal-field-label">
              <span>API 密钥</span>
              <span>只留在当前标签页</span>
            </span>
            <input
              id={keyId}
              className="field-input"
              type="password"
              value={key}
              onChange={(event) => {
                setKey(event.target.value)
                setTestResult(null)
                if (error) setError('')
              }}
              placeholder="sk-…"
              disabled={testing}
              autoFocus={Boolean(aiConfig.baseUrl)}
              maxLength={200}
              autoComplete="off"
            />
          </label>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {testResult && (
          <div className={`ai-test-result ${testResult.ok ? 'is-ok' : 'is-fail'}`} role="status">
            {testResult.message}
          </div>
        )}

        <div className="ai-notes">
          <p>连接后，探针的异议和追问由你选择的模型现场生成，针对你的主张和前提；不连接则使用本地规则。调用费用由你的服务商按 token 收取，本应用不收费、不经手。</p>
          <p>密钥只保存在当前标签页，关闭即清除；不会进入导出文件，也不会发往任何第三方——请求只发向你填写的接口地址。为安全起见，仅允许公网 HTTPS 地址。</p>
        </div>

        <div className="modal-actions">
          {aiKey && (
            <button
              type="button"
              className="btn btn-sm btn-ghost ai-disconnect"
              onClick={handleDisconnect}
              disabled={testing}
            >
              断开连接
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void handleTest()}
            disabled={testing}
          >
            {testing ? '正在测试' : '测试连接'}
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={testing}>
            保存并连接
          </button>
        </div>
      </form>
    </div>
  )
}