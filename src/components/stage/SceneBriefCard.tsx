import { useId } from 'react'
import type { ExperimentBrief } from '../../lib/schema'

export function hasBriefContent(brief: ExperimentBrief | undefined): boolean {
  return Boolean(brief && (brief.situation.trim() !== '' || brief.notes.length > 0))
}

interface SceneBriefCardProps {
  brief: ExperimentBrief
  open: boolean
  onToggle: () => void
  variant: 'float' | 'static'
}

export function SceneBriefCard({ brief, open, onToggle, variant }: SceneBriefCardProps) {
  const bodyId = useId()
  const situation = brief.situation.trim()

  if (!open) {
    return (
      <button
        type="button"
        className={`scene-brief-toggle scene-brief-${variant}`}
        onClick={onToggle}
        aria-expanded={false}
      >
        <span className="scene-brief-toggle-dot" aria-hidden="true" />
        实验说明
        {brief.notes.length > 0 && (
          <span className="scene-brief-count">{brief.notes.length} 条注记</span>
        )}
      </button>
    )
  }

  return (
    <aside className={`scene-brief-card scene-brief-${variant}`} aria-label="实验说明">
      <div className="scene-brief-head">
        <span className="scene-brief-eyebrow">实验说明 / Brief</span>
        <button
          type="button"
          className="scene-brief-collapse"
          onClick={onToggle}
          aria-expanded={true}
          aria-controls={bodyId}
        >
          收起
        </button>
      </div>
      <div className="scene-brief-body scroll-area" id={bodyId}>
        {situation && <p className="scene-brief-situation">{situation}</p>}
        {brief.notes.length > 0 && (
          <ul className="scene-brief-notes">
            {brief.notes.map((note, index) => (
              <li key={`${index}-${note}`}>{note}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}