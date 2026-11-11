import { useEffect, useState } from 'react'
import { assetUrl } from './lib/asset'
import { applyTheme, getInitialTheme, type Theme } from './lib/theme'
import { useLabStore } from './lib/store'
import { TopBar } from './components/layout/TopBar'
import { LeftRail } from './components/layout/LeftRail'
import { BottomTrack } from './components/layout/BottomTrack'
import { RightPanel } from './components/panel/RightPanel'
import { AiPanel } from './components/panel/AiPanel'
import { ExperimentsPanel } from './components/panel/ExperimentsPanel'
import { SceneEditorPanel } from './components/panel/SceneEditorPanel'
import { StagePanel } from './components/stage/StagePanel'
import { Toast } from './components/ui/Toast'

function BootScreen() {
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <img className="boot-icon" src={assetUrl('icon.png')} alt="" />
      <div className="boot-title">PP LAB</div>
      <div className="boot-sub">正在载入</div>
      <div className="boot-line" aria-hidden="true" />
    </div>
  )
}

export default function App() {
  const hydrate = useLabStore((state) => state.hydrate)
  const hydrated = useLabStore((state) => state.hydrated)
  const aiPanelOpen = useLabStore((state) => state.aiPanelOpen)
  const experimentsPanelOpen = useLabStore((state) => state.experimentsPanelOpen)
  const sceneEditorOpen = useLabStore((state) => state.sceneEditorOpen)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="app-shell">
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      />
      {hydrated ? (
        <>
          <main className="main-grid">
            <LeftRail />
            <StagePanel theme={theme} />
            <RightPanel />
          </main>
          <BottomTrack />
        </>
      ) : (
        <BootScreen />
      )}
      {aiPanelOpen && <AiPanel />}
      {experimentsPanelOpen && <ExperimentsPanel />}
      {sceneEditorOpen && <SceneEditorPanel />}
      <Toast />
    </div>
  )
}
