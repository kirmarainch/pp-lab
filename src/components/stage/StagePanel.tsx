import { useCallback, useMemo, useRef, useState } from 'react'
import { describeScene } from '../../lib/narrative'
import { resolveScene } from '../../lib/resolveScene'
import type { CameraPreset } from '../../lib/schema'
import { useLabStore } from '../../lib/store'
import { SceneErrorBoundary } from '../ui/SceneErrorBoundary'
import { BlackBoxCanvas } from './BlackBoxCanvas'
import { Fallback2D } from './Fallback2D'
import { SceneLabelOverlay } from './SceneLabels'

type CameraPresetId = CameraPreset['id']

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
    )
  } catch {
    return false
  }
}

export function StagePanel() {
  const experiment = useLabStore((state) => state.experiment)
  const [presetId, setPresetId] = useState<CameraPresetId>('overview')
  const [webglAvailable] = useState(detectWebGL)
  const [renderFailed, setRenderFailed] = useState(false)
  const labelRegistry = useRef<Map<string, HTMLDivElement>>(new Map())

  const registerLabel = useCallback(
    (id: string, element: HTMLDivElement | null) => {
      if (element) {
        labelRegistry.current.set(id, element)
      } else {
        labelRegistry.current.delete(id)
      }
    },
    [],
  )

  const scene = useMemo(
    () => (experiment ? resolveScene(experiment.sceneSpec) : null),
    [experiment],
  )

  if (!experiment || !scene) return null

  const preset =
    scene.spec.cameraPresets.find((item) => item.id === presetId) ??
    scene.spec.cameraPresets[0]

  if (!preset) return null

  const use3D = webglAvailable && !renderFailed
  const activeCount = scene.spec.conditions.filter((condition) => condition.value).length

  return (
    <section className="stage-panel" aria-label="黑箱室交互场景">
      <div className="stage-canvas-host">
        {use3D ? (
          <SceneErrorBoundary
            fallback={<Fallback2D scene={scene} />}
            onError={() => setRenderFailed(true)}
          >
            <BlackBoxCanvas
              scene={scene}
              preset={preset}
              labelRegistry={labelRegistry}
            />
          </SceneErrorBoundary>
        ) : (
          <Fallback2D scene={scene} />
        )}
      </div>

      <div className="stage-vignette" aria-hidden="true" />
      <div className="stage-grain" aria-hidden="true" />
      <div className="stage-scan" aria-hidden="true" />
      {use3D && (
        <SceneLabelOverlay
          annotations={scene.annotations}
          register={registerLabel}
        />
      )}

      <div className="stage-hud">
        <div className="stage-hud-top">
          <div className="stage-title">
            <div className="scene-tag">
              <span className="bracket">[</span>
              Scene 01 · Black Box Room
              <span className="bracket">]</span>
            </div>
            <h1>{scene.spec.title}</h1>
            <div className="stage-sub">{scene.spec.subtitle}</div>
          </div>

          <div className="stage-toolbar">
            <div className="segmented" role="group" aria-label="相机预设">
              {scene.spec.cameraPresets.map((camera) => (
                <button
                  key={camera.id}
                  type="button"
                  aria-pressed={camera.id === preset.id}
                  onClick={() => setPresetId(camera.id)}
                >
                  {camera.label}
                </button>
              ))}
            </div>
            <span className="stage-tool-meta">
              Camera · {preset.label} / {activeCount} conditions
            </span>
          </div>
        </div>

        <div className="stage-hud-bottom">
          <div className="stage-caption">
            <div className="caption-eyebrow">Condition reading / 条件读数</div>
            <p>{describeScene(scene.spec)}</p>
          </div>

          <div className="stage-status">
            <span className="live-badge">Live binding</span>
            <span className="stage-render-meta">
              {use3D ? 'WebGL · R3F' : 'SVG · 2D fallback'} · Spec{' '}
              {scene.spec.schemaVersion} · {scene.spec.bindings.length} bindings
            </span>
          </div>
        </div>
      </div>

      {!use3D && (
        <div className="stage-fallback-note">WEBGL 不可用 · 2D 图解</div>
      )}
    </section>
  )
}
