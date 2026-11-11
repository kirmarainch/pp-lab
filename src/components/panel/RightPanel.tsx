import { useLabStore } from '../../lib/store'
import { JudgmentSection } from './JudgmentSection'
import { ProbeSection } from './ProbeSection'

export function RightPanel() {
  const aiKey = useLabStore((state) => state.aiKey)

  return (
    <aside className="right-panel" aria-label="判断与检验">
      <div className="panel-scroll scroll-area">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Judgment &amp; Test</div>
            <h2>判断与检验</h2>
          </div>
          <span className={`panel-mode ${aiKey ? 'is-ai' : ''}`}>
            <span className="dot" aria-hidden="true" />
            {aiKey ? 'AI 探针' : '本地探针'}
          </span>
        </div>

        <JudgmentSection />
        <ProbeSection />
      </div>
    </aside>
  )
}
