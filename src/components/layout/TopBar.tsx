import { assetUrl } from '../../lib/asset'
import { exportExperiment } from '../../lib/exportExperiment'
import { useLabStore } from '../../lib/store'
import type { Theme } from '../../lib/theme'
import { AiIcon, DownloadIcon, MoonIcon, SunIcon } from '../ui/Icons'

const SAVE_LABEL = {
  idle: '本地模式',
  saving: '正在写入本地',
  saved: '已保存 · 本地',
  error: '本地存储不可用',
} as const

const AI_CHIP_LABEL = {
  off: '连接 AI',
  untested: 'AI 未测试',
  connected: 'AI 已连接',
  error: 'AI 连接失败',
} as const

interface TopBarProps {
  theme: Theme
  onToggleTheme: () => void
}

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const experiment = useLabStore((state) => state.experiment)
  const saveState = useLabStore((state) => state.saveState)
  const notify = useLabStore((state) => state.notify)
  const aiStatus = useLabStore((state) => state.aiStatus)
  const setAiPanelOpen = useLabStore((state) => state.setAiPanelOpen)

  const handleExport = () => {
    const current = useLabStore.getState()
    if (!current.experiment) return
    exportExperiment(current.experiment, current.revisions)
    notify('已导出 JSON。')
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <img className="brand-plaque" src={assetUrl('icon.png')} alt="PP Lab 图标" />
          <span className="brand-word">
            PP
            <span className="brand-mark" aria-hidden="true" />
            <span className="thin">LAB</span>
          </span>
        </div>
        <div className="topbar-divider" aria-hidden="true" />
        <div className="crumb">
          <span>黑箱室</span>
          <span className="sep">/</span>
          <strong>{experiment?.title ?? '正在载入'}</strong>
          <span className="chip">
            <span className="dot" aria-hidden="true" />
            示例种子
          </span>
          <span className="chip optional">SPEC 1.0</span>
        </div>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="theme-toggle"
          data-theme={theme}
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? '切换到夜晚模式' : '切换到白天模式'}
          aria-pressed={theme === 'dark'}
        >
          <SunIcon />
          <MoonIcon />
          <span className="theme-toggle-thumb" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`chip ai-chip is-${aiStatus}`}
          onClick={() => setAiPanelOpen(true)}
          title="连接你自己的模型接口，让 AI 现场生成探针"
          data-ai-status={aiStatus}
        >
          <AiIcon />
          {AI_CHIP_LABEL[aiStatus]}
        </button>
        <span className="save-status">
          <span
            className={`status-dot ${saveState === 'saving' ? 'is-saving' : ''} ${
              saveState === 'error' ? 'is-error' : ''
            }`}
            aria-hidden="true"
          />
          {SAVE_LABEL[saveState]}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={handleExport}
          disabled={!experiment}
          title="导出当前实验与版本轨道为 JSON"
        >
          <DownloadIcon />
          导出 JSON
        </button>
      </div>
    </header>
  )
}
