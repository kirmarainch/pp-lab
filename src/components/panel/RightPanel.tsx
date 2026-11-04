import { JudgmentSection } from './JudgmentSection'
import { ProbeSection } from './ProbeSection'

export function RightPanel() {
  return (
    <aside className="right-panel" aria-label="判断与检验">
      <div className="panel-scroll scroll-area">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Judgment &amp; Test</div>
            <h2>判断与检验</h2>
          </div>
          <span className="panel-mode">
            <span className="dot" aria-hidden="true" />
            本地模式
          </span>
        </div>

        <JudgmentSection />
        <ProbeSection />
      </div>
    </aside>
  )
}
