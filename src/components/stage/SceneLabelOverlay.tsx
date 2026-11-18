import type { SceneAnnotation } from '../../lib/schema'

function annotationTone(annotation: SceneAnnotation): string {
  if (annotation.conditionId === 'interpretable') return 'is-cyan'
  if (annotation.conditionId === 'verifiable') return 'is-amber'
  if (annotation.conditionId === 'has-reasons') return 'is-paper'
  if (annotation.entityId === 'observer') return 'is-muted'
  return ''
}

interface SceneLabelOverlayProps {
  annotations: SceneAnnotation[]
  register: (id: string, element: HTMLDivElement | null) => void
}

export function SceneLabelOverlay({
  annotations,
  register,
}: SceneLabelOverlayProps) {
  return (
    <div className="stage-labels" aria-hidden="true">
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="scene-label-anchor"
          ref={(element) => register(annotation.id, element)}
        >
          <div className={`scene-label ${annotationTone(annotation)}`}>
            <div className="scene-label-card">
              <span className="scene-label-text">{annotation.text}</span>
              {annotation.sublabel && (
                <span className="scene-label-sub">{annotation.sublabel}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

