import { useCallback, useMemo, useRef, useState } from 'react'
import { describeScene } from '../../lib/narrative'
import { resolveScene } from '../../lib/resolveScene'
import type { CameraPreset } from '../../lib/schema'
import { useLabStore } from '../../lib/store'
import { FAMILY_LABEL } from '../../lib/templates'
import type { Theme } from '../../lib/theme'
import { SceneErrorBoundary } from '../ui/SceneErrorBoundary'
import { SlidersIcon } from '../ui/Icons'
import { BlackBoxCanvas } from './BlackBoxCanvas'
import { Fallback2D } from './Fallback2D'
import { SceneLabelOverlay } from './SceneLabels'
import { hasBriefContent, SceneBriefCard } from './SceneBriefCard'
import { ThoughtMap } from './ThoughtMap'

type CameraPresetId = CameraPreset['id']
type StageView = 'scene' | 'map'

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

export function StagePanel({ theme }: { theme: Theme }) {
  const experiment = useLabStore((state) => state.experiment)
  const revisionPending = useLabStore((state) => state.revisionPending)
  const setSceneEditorOpen = useLabStore((state) => state.setSceneEditorOpen)
  const [view, setView] = useState<StageView>('scene')
  const [presetId, setPresetId] = useState<CameraPresetId>('overview')
  const [briefOpen, setBriefOpen] = useState(true)
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
  const brief = experiment.brief
  const showBrief = view === 'scene' && hasBriefContent(brief)
  const toggleBrief = () => setBriefOpen((current) => !current)

  return (
    <>
      {showBrief && brief && (
        <SceneBriefCard brief={brief} open={briefOpen} onToggle={toggleBrief} variant="static" />
      )}
      <section
        className="stage-panel"
        data-view={view}
        aria-label={view === 'map' ? '思想星图' : `${FAMILY_LABEL[experiment.family].zh}交互场景`}
      >
        <div className="stage-canvas-host">
          {view === 'map' ? (
            <ThoughtMap experiment={experiment} />
          ) : use3D ? (
            <SceneErrorBoundary
              fallback={<Fallback2D scene={scene} theme={theme} />}
              onError={() => setRenderFailed(true)}
            >
              <BlackBoxCanvas
                key={theme}
                scene={scene}
                preset={preset}
                labelRegistry={labelRegistry}
                theme={theme}
              />
            </SceneErrorBoundary>
          ) : (
            <Fallback2D scene={scene} theme={theme} />
          )}
        </div>

        <div className="stage-vignette" aria-hidden="true" />
        <div className="stage-grain" aria-hidden="true" />
        <div className="stage-scan" aria-hidden="true" />
        {view === 'scene' && use3D && (
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
                {view === 'map'
                  ? 'Map 01 · Argument Constellation'
                  : `Scene 01 · ${FAMILY_LABEL[experiment.family].en}`}
                <span className="bracket">]</span>
              </div>
              {view === 'scene' && (
                <>
                  <h1>{scene.spec.title}</h1>
                  <div className="stage-sub">{scene.spec.subtitle}</div>
                </>
              )}
            </div>

            <div className="stage-toolbar">
              <div className="segmented stage-view-switch" role="group" aria-label="舞台视图">
                <button
                  type="button"
                  aria-pressed={view === 'scene'}
                  onClick={() => setView('scene')}
                >
                  场景
                </button>
                <button
                  type="button"
                  aria-pressed={view === 'map'}
                  onClick={() => setView('map')}
                >
                  星图
                </button>
              </div>

              {view === 'scene' ? (
                <>
                  <div className="stage-scene-tools">
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
                    <button
                      type="button"
                      className="btn btn-sm stage-customize-btn"
                      data-testid="scene-editor-open"
                      onClick={() => setSceneEditorOpen(true)}
                      disabled={revisionPending}
                      title="编辑场景组件与条件开关"
                    >
                      <SlidersIcon />
                      自定义场景
                    </button>
                  </div>
                  <span className="stage-tool-meta">
                    Camera · {preset.label} / {activeCount} conditions
                  </span>
                </>
              ) : (
                <span className="stage-tool-meta">点击节点或关系查看解释与来源</span>
              )}
            </div>
          </div>

          {view === 'scene' && (
            <div className="stage-hud-bottom">
              <div className="stage-bottom-left">
                {showBrief && brief && (
                  <SceneBriefCard
                    brief={brief}
                    open={briefOpen}
                    onToggle={toggleBrief}
                    variant="float"
                  />
                )}
                <div className="stage-caption">
                  <div className="caption-eyebrow">Condition reading / 条件读数</div>
                  <p>{describeScene(scene.spec)}</p>
                </div>
              </div>

              <div className="stage-status">
                <span className="live-badge">Live binding</span>
                <span className="stage-render-meta">
                  {use3D ? 'WebGL · R3F' : 'SVG · 2D fallback'} · Spec{' '}
                  {scene.spec.schemaVersion} · {scene.spec.bindings.length} bindings
                </span>
              </div>
            </div>
          )}
        </div>

        {view === 'scene' && !use3D && (
          <div className="stage-fallback-note">WEBGL 不可用 · 2D 图解</div>
        )}
      </section>
    </>
  )
}
