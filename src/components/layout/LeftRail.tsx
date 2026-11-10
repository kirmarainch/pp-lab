import { useLabStore } from '../../lib/store'

export function LeftRail() {
  const experiment = useLabStore((state) => state.experiment)
  const revisionPending = useLabStore((state) => state.revisionPending)
  const toggleCondition = useLabStore((state) => state.toggleCondition)

  if (!experiment) return null

  const { sceneSpec } = experiment
  const activeCount = sceneSpec.conditions.filter((condition) => condition.value).length
  const probeTargetId =
    experiment.probe?.status === 'open' ? experiment.probe.targetConditionId : undefined

  return (
    <aside className="left-rail scroll-area" aria-label="实验与前提条件">
      <div>
        <div className="rail-eyebrow">
          <span>Experiment / 实验</span>
          <span className="count">01</span>
        </div>

        <article className="experiment-card">
          <div className="experiment-family">
            <span className="dot" aria-hidden="true" />
            黑箱室 · Black Box Room
          </div>
          <h2>{sceneSpec.title}</h2>
          <div className="en">{sceneSpec.subtitle}</div>
          <div className="experiment-meta">
            <span>SEED 01</span>
            <span>{sceneSpec.conditions.length} PREMISES</span>
          </div>
        </article>
      </div>

      <section className="rail-section">
        <div className="rail-section-head">
          <span className="rail-section-title">前提条件</span>
          <span className="rail-section-en">
            Premises · {activeCount}/{sceneSpec.conditions.length} on
          </span>
        </div>

        <div className="condition-list">
          {sceneSpec.conditions.map((condition, index) => {
            const isTargeted = condition.id === probeTargetId
            return (
              <button
                key={condition.id}
                type="button"
                className={`condition-row ${condition.value ? 'is-on' : ''} ${isTargeted ? 'is-targeted' : ''}`}
                data-condition-id={condition.id}
                aria-pressed={condition.value}
                disabled={revisionPending}
                onClick={() => toggleCondition(condition.id)}
              >
                <span className="condition-head">
                  <span className="condition-title-wrap">
                    <span className="condition-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="condition-title">{condition.label}</span>
                    {isTargeted && (
                      <span className="condition-target" title="探针目标前提">
                        目标
                      </span>
                    )}
                  </span>
                </span>
                <span className="condition-hint">{condition.hint}</span>
                <span className="condition-foot">
                  <span className="condition-state">
                    {condition.value ? 'On / 已开启' : 'Off / 已关闭'}
                  </span>
                  <span className="switch" aria-hidden="true" />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="binding-note">
        <span className="live-dot" aria-hidden="true" />
        LIVE BINDING
      </div>
    </aside>
  )
}
