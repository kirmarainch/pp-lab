import { useEffect, useState } from 'react'
import { PROBE_STATUS_LABEL, STANCE_BY_ID } from '../../lib/content'
import { useLabStore, type ProbeAction } from '../../lib/store'
import { ArrowRightIcon, ProbeIcon } from '../ui/Icons'

export function ProbeSection() {
  const experiment = useLabStore((state) => state.experiment)
  const runProbe = useLabStore((state) => state.runProbe)
  const resolveProbe = useLabStore((state) => state.resolveProbe)

  const revisionPending = useLabStore((state) => state.revisionPending)
  const [mode, setMode] = useState<'idle' | 'respond' | 'revise'>('idle')
  const [revisedClaim, setRevisedClaim] = useState('')
  const [response, setResponse] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setMode('idle')
    setResponse('')
  }, [experiment?.probe?.id])

  if (!experiment) return null

  const probe = experiment.probe
  const conditions = experiment.sceneSpec.conditions
  const currentStates = Object.fromEntries(
    conditions.map((condition) => [condition.id, condition.value]),
  )
  const stale = probe
    ? probe.claimSnapshot === undefined ||
      probe.claimSnapshot !== experiment.claim ||
      probe.stanceId !== experiment.stanceId ||
      Object.entries(probe.conditionStates).some(
        ([conditionId, value]) => currentStates[conditionId] !== value,
      )
    : false
  const probeStance = probe?.stanceId ? STANCE_BY_ID[probe.stanceId] : undefined

  const handleAction = async (action: ProbeAction, text?: string) => {
    if (pending || revisionPending) return
    setPending(true)
    try {
      const saved = await resolveProbe(action, text, action === 'revise' ? revisedClaim : undefined)
      if (saved) {
        setMode('idle')
        setResponse('')
      }
    } finally {
      setPending(false)
    }
  }

  const handleRunProbe = () => {
    setMode('idle')
    setResponse('')
    runProbe()
  }

  return (
    <section className="section" aria-labelledby="probe-heading">
      <div className="section-head">
        <span className="section-title" id="probe-heading">
          探针 / Probe
        </span>
      </div>

      {!probe ? (
        <>
          <button type="button" className="probe-launch" onClick={handleRunProbe} disabled={pending || revisionPending || mode !== 'idle'}>
            <span className="launch-label">
              <ProbeIcon />
              对当前前提运行探针
            </span>
            <ArrowRightIcon className="arrow" />
          </button>
        </>
      ) : (
        <>
          <div className="probe-card">
            <div className="probe-card-head">
              <span className="probe-tag">Latest objection / 最新异议</span>
              <span className={`status-tag is-${probe.status}`}>
                {PROBE_STATUS_LABEL[probe.status]}
              </span>
            </div>

            <div className="probe-target">
              <span>Target premise</span>
              {probe.targetPremise}
            </div>

            <p className="probe-objection">{probe.objection}</p>

            <div className="probe-question">
              <span className="q-mark" aria-hidden="true">
                ?
              </span>
              <span>{probe.question}</span>
            </div>

            <div className="probe-conditions" aria-label="探针生成时的条件快照">
              {conditions.map((condition) => (
                <span
                  key={condition.id}
                  className={`cond-chip ${
                    probe.conditionStates[condition.id] ? 'is-on' : ''
                  }`}
                >
                  {condition.label} · {probe.conditionStates[condition.id] ? '开' : '关'}
                </span>
              ))}
            </div>

            <div className="probe-note">
              {probeStance ? probeStance.name : '未选择立场'} · 本地规则
            </div>

            {probe.status === 'open' && mode === 'idle' && (
              <div className="probe-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setMode('respond')}
                  disabled={pending || revisionPending}
                >
                  回应
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setRevisedClaim(experiment.claim)
                    setMode('revise')
                  }}
                  disabled={pending || revisionPending}
                >
                  修改前提
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void handleAction('retain')}
                  disabled={pending || revisionPending}
                >
                  保留异议
                </button>
              </div>
            )}

            {mode !== 'idle' && (
              <div className="response-form">
                {mode === 'revise' && (
                  <textarea
                    className="claim-input"
                    value={revisedClaim}
                    onChange={(event) => setRevisedClaim(event.target.value)}
                    maxLength={280}
                    aria-label="你的判断"
                    disabled={pending || revisionPending}
                    autoFocus
                  />
                )}
                <textarea
                  className="response-input"
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  placeholder="（待填写）"
                  aria-label="你的回应"
                  disabled={pending || revisionPending}
                  autoFocus={mode === 'respond'}
                />
                <div className="response-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setMode('idle')}
                    disabled={pending || revisionPending}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => void handleAction(mode === 'revise' ? 'revise' : 'respond', response)}
                    disabled={pending || revisionPending || !response.trim() ||
                      (mode === 'revise' && (!revisedClaim.trim() || revisedClaim.trim() === experiment.claim.trim()))}
                  >
                    记入反例轨道
                  </button>
                </div>
              </div>
            )}

            {probe.status !== 'open' && (
              <div className="probe-response">
                <strong>{PROBE_STATUS_LABEL[probe.status]}</strong>
                {probe.response ? ` · ${probe.response}` : ''}
              </div>
            )}
          </div>

          {stale && <div className="stale-note">快照已过期。</div>}

          <button type="button" className="probe-launch" onClick={handleRunProbe} disabled={pending || revisionPending || mode !== 'idle'}>
            <span className="launch-label">
              <ProbeIcon />
              {stale ? '对当前前提重新探针' : '再运行一次探针'}
            </span>
            <ArrowRightIcon className="arrow" />
          </button>
        </>
      )}
    </section>
  )
}
