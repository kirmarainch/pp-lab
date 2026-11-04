import { useEffect } from 'react'
import { assetUrl } from './lib/asset'
import { useLabStore } from './lib/store'
import { TopBar } from './components/layout/TopBar'
import { LeftRail } from './components/layout/LeftRail'
import { BottomTrack } from './components/layout/BottomTrack'
import { RightPanel } from './components/panel/RightPanel'
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

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <div className="app-shell">
      <TopBar />
      {hydrated ? (
        <>
          <main className="main-grid">
            <LeftRail />
            <StagePanel />
            <RightPanel />
          </main>
          <BottomTrack />
        </>
      ) : (
        <BootScreen />
      )}
      <Toast />
    </div>
  )
}
