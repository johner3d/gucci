import { Severity } from '../../domain/uiVocabulary'

const severityWeight = {
  [Severity.CRITICAL]: 3,
  [Severity.ELEVATED]: 2,
  [Severity.WATCH]: 1,
  [Severity.NORMAL]: 0,
}

function toTrustLevel(level) {
  if (!level) return 'Medium'
  return `${level}`.charAt(0).toUpperCase() + `${level}`.slice(1)
}

export function DecisionActionCard({
  domain,
  decisionStatement,
  businessImpact,
  owner,
  timingExpectation,
  trustLevel,
  evidenceAnchors,
}) {
  return (
    <article className="decision-action-card stack">
      <h3>{domain}</h3>
      <div>
        <strong>Decision statement:</strong> {decisionStatement}
      </div>
      <div>
        <strong>Business impact:</strong> {businessImpact}
      </div>
      <div>
        <strong>Owner:</strong> {owner}
      </div>
      <div>
        <strong>Timing expectation:</strong> {timingExpectation}
      </div>
      <div>
        <strong>Trust level:</strong> {toTrustLevel(trustLevel)}
      </div>
      <div>
        <strong>Evidence anchors:</strong>
        {!evidenceAnchors?.length ? <span className="meta"> none available</span> : null}
        {evidenceAnchors?.length ? (
          <ul className="list-reset decision-action-evidence">
            {evidenceAnchors.map((anchor) => (
              <li key={`${domain}-${anchor}`}>{anchor}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  )
}

export function rankTrustLevel({ severity, evidenceAnchors = [] }) {
  const riskWeight = severityWeight[severity] ?? 1
  if (riskWeight >= 3 && evidenceAnchors.length >= 3) return 'high'
  if (riskWeight >= 2 || evidenceAnchors.length >= 2) return 'medium'
  return 'monitoring'
}
