import { lazy, Suspense, useEffect, useState } from 'react'
import { assetUrl } from './lib/asset'
import { applyTheme, getInitialTheme, type Theme } from './lib/theme'
import { useLabStore } from './lib/store'
import { TopBar } from './components/layout/TopBar'
import { LeftRail } from './components/layout/LeftRail'
import { BottomTrack } from './components/layout/BottomTrack'
import { RightPanel } from './components/panel/RightPanel'
import { Toast } from './components/ui/Toast'
import { BetaGate } from './components/BetaGate'
import { isBetaUnlocked, unlockBeta } from './lib/beta'

const AiPanel = lazy(() => import('./components/panel/AiPanel').then((m) => ({ default: m.AiPanel })))
const ExperimentsPanel = lazy(() => import('./components/panel/ExperimentsPanel').then((m) => ({ default: m.ExperimentsPanel })))
const SceneEditorPanel = lazy(() => import('./components/panel/SceneEditorPanel').then((m) => ({ default: m.SceneEditorPanel })))
const StagePanel = lazy(() => import('./components/stage/StagePanel').then((m) => ({ default: m.StagePanel })))

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
  const [unlocked, setUnlocked] = useState(isBetaUnlocked)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  if (!unlocked) {
    return (
      <BetaGate
        onUnlock={() => {
          unlockBeta()
          setUnlocked(true)
        }}
      />
    )
  }

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
            <Suspense fallback={<BootScreen />}>
              <StagePanel theme={theme} />
            </Suspense>
            <RightPanel />
          </main>
          <BottomTrack />
        </>
      ) : (
        <BootScreen />
      )}
      <Suspense fallback={null}>
        {aiPanelOpen && <AiPanel />}
        {experimentsPanelOpen && <ExperimentsPanel />}
        {sceneEditorOpen && <SceneEditorPanel />}
      </Suspense>
      <Toast />
    </div>
  )
}
