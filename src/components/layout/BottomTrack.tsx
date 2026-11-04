import { useState } from 'react'
import { formatRecordTime } from '../../lib/format'
import { useLabStore } from '../../lib/store'
import { nextRevisionNumber } from '../../lib/revision'
import { RevisionDialog } from '../ui/RevisionDialog'
import { RestoreIcon } from '../ui/Icons'

function padVersion(version: number): string {
  return String(version).padStart(2, '0')
}

export function BottomTrack() {
  const experiment = useLabStore((state) => state.experiment)
  const revisions = useLabStore((state) => state.revisions)
  const selectedRevisionId = useLabStore((state) => state.selectedRevisionId)
  const selectRevision = useLabStore((state) => state.selectRevision)
  const restoreRevision = useLabStore((state) => state.restoreRevision)
  const saveVersion = useLabStore((state) => state.saveVersion)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [restoring, setRestoring] = useState(false)

  if (!experiment) return null

  const latest = revisions.at(-1)
  const selected =
    revisions.find((revision) => revision.id === selectedRevisionId) ?? latest
  const nextVersion = nextRevisionNumber(revisions)
  const defaultLabel = `实验版本 v${padVersion(nextVersion)}`

  const handleRestore = async () => {
    if (!selected || restoring) return
    setRestoring(true)
    try {
      await restoreRevision(selected.id)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <section className="bottom-track" aria-label="反例轨道">
      <div className="track-head">
        <div className="track-title-wrap">
          <span className="track-title">反例轨道</span>
          <span className="track-sub">Counterexample Track</span>
          <span className="track-count">{revisions.length} VERSIONS</span>
        </div>
        <div className="track-head-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setDialogOpen(true)}
          >
            保存当前版本
          </button>
        </div>
      </div>

      <div className="timeline-scroll scroll-area" role="group" aria-label="版本时间线">
        {revisions.map((revision) => {
          const isLatest = revision.id === latest?.id
          const isSelected = revision.id === selected?.id
          return (
            <button
              key={revision.id}
              type="button"
              className="timeline-card"
              aria-current={isSelected}
              data-latest={isLatest}
              onClick={() => selectRevision(revision.id)}
              aria-label={`版本 ${revision.version}：${revision.label}`}
            >
              <span className="timeline-top">
                <span className="timeline-version">v{padVersion(revision.version)}</span>
                <span className="timeline-time">
                  {formatRecordTime(revision.createdAt)}
                </span>
              </span>
              <span className="timeline-label">{revision.label}</span>
              <span className="timeline-reason">{revision.reason}</span>
              <span className="timeline-status">
                <span className="dot" aria-hidden="true" />
                {isLatest ? 'Latest / 最新快照' : 'Snapshot / 历史快照'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="track-detail">
        {selected ? (
          <>
            <div className="detail-head">
              <div className="detail-title">
                <span className="detail-version">v{padVersion(selected.version)}</span>
                <span className="detail-name">{selected.label}</span>
              </div>
              <span className="detail-time">{formatRecordTime(selected.createdAt)}</span>
            </div>
            <div className="detail-reason">{selected.reason}</div>
            <div className="detail-conditions">
              {experiment.sceneSpec.conditions.map((condition) => (
                <span
                  key={condition.id}
                  className={`cond-chip ${
                    selected.snapshot.conditions[condition.id] ? 'is-on' : ''
                  }`}
                >
                  {condition.label} ·{' '}
                  {selected.snapshot.conditions[condition.id] ? '开' : '关'}
                </span>
              ))}
            </div>
            <div className="detail-foot">
              <span className="probe-note">
                {selected.id === latest?.id ? '最新' : '生成新记录'}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void handleRestore()}
                disabled={restoring}
                title={`恢复「${selected.label}」的快照`}
              >
                <RestoreIcon />
                回溯至此
              </button>
            </div>
          </>
        ) : (
          <div className="detail-empty">
            <strong>还没有版本</strong>
            <span>保存一次判断，反例轨道才会开始记录。</span>
          </div>
        )}
      </div>

      <RevisionDialog
        open={dialogOpen}
        defaultLabel={defaultLabel}
        onClose={() => setDialogOpen(false)}
        onSubmit={(label, reason) => saveVersion(label, reason)}
      />
    </section>
  )
}
