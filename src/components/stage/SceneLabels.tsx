import { useMemo, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneAnnotation } from '../../lib/schema'

export type LabelRegistry = RefObject<Map<string, HTMLDivElement>>

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

interface LabelProjectorProps {
  annotations: SceneAnnotation[]
  registry: LabelRegistry
}

export function LabelProjector({ annotations, registry }: LabelProjectorProps) {
  const { camera, size } = useThree()
  const world = useMemo(() => new THREE.Vector3(), [])
  const view = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    for (const annotation of annotations) {
      const element = registry.current.get(annotation.id)
      if (!element) continue

      world.set(...annotation.position)
      view.copy(world).applyMatrix4(camera.matrixWorldInverse)

      if (view.z > -0.2) {
        element.style.opacity = '0'
        continue
      }

      world.project(camera)
      const x = (world.x * 0.5 + 0.5) * size.width
      const y = (-world.y * 0.5 + 0.5) * size.height

      if (
        x < -80 ||
        x > size.width + 80 ||
        y < -30 ||
        y > size.height + 30
      ) {
        element.style.opacity = '0'
        continue
      }

      element.style.opacity = '1'
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
    }
  })

  return null
}
