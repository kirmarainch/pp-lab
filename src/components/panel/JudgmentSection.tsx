import { STANCES } from '../../lib/content'
import { useLabStore } from '../../lib/store'

export function JudgmentSection() {
  const experiment = useLabStore((state) => state.experiment)
  const revisionPending = useLabStore((state) => state.revisionPending)
  const updateClaim = useLabStore((state) => state.updateClaim)
  const setStance = useLabStore((state) => state.setStance)

  if (!experiment) return null

  const selectedStance = STANCES.find((stance) => stance.id === experiment.stanceId)

  return (
    <section className="section" aria-labelledby="claim-heading">
      <div className="section-head">
        <span className="section-title" id="claim-heading">
          判断 / Claim
        </span>
      </div>

      <div>
        <div className="field-label">
          <span>主张</span>
          <span>{experiment.claim.length}/280</span>
        </div>
        <textarea
          className="claim-input"
          value={experiment.claim}
          maxLength={280}
          disabled={revisionPending}
          onChange={(event) => updateClaim(event.target.value)}
          placeholder="（待填写）"
          aria-label="你的判断"
          spellCheck={false}
        />
      </div>

      <div className="section-head">
        <span className="section-title">立场 / Stance</span>
      </div>

      <div className="stance-list" role="radiogroup" aria-label="立场">
        {STANCES.map((stance) => {
          const selected = experiment.stanceId === stance.id
          return (
            <button
              key={stance.id}
              type="button"
              role="radio"
              disabled={revisionPending}
              aria-checked={selected}
              className="stance-card"
              onClick={() => setStance(stance.id)}
            >
              <span className="stance-radio" aria-hidden="true" />
              <span>
                <span className="stance-head">
                  <span className="stance-name">{stance.name}</span>
                  <span className="stance-en">{stance.en}</span>
                </span>
                <span className="stance-summary">{stance.summary}</span>
                {selected && <span className="stance-lens">{stance.lens}</span>}
              </span>
            </button>
          )
        })}
      </div>

      {selectedStance && (
        <div className="stance-detail">
          <div className="stance-detail-block">
            <div className="stance-detail-label">核心承诺</div>
            <ul>
              {selectedStance.commitments.map((commitment) => (
                <li key={commitment}>{commitment}</li>
              ))}
            </ul>
          </div>

          <div className="stance-detail-block">
            <div className="stance-detail-label">常见反驳</div>
            <ul>
              {selectedStance.objections.map((objection) => (
                <li key={objection}>{objection}</li>
              ))}
            </ul>
          </div>

          <p className="stance-limitation">{selectedStance.limitation}</p>

          <div className="stance-sources">
            {selectedStance.sources.map((source) => (
              <a
                key={source.url}
                className="stance-source"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.citation} ↗
              </a>
            ))}
          </div>

          <p className="stance-disclaimer">基于其思想的模拟视角，不代表本人发言。</p>
        </div>
      )}
    </section>
  )
}
