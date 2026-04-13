export const Severity = Object.freeze({
  CRITICAL: 'critical',
  VIOLATED: 'violated',
  ELEVATED: 'elevated',
  WATCH: 'watch',
  NORMAL: 'normal',
})

export const Trust = Object.freeze({
  SUPPORTED: 'supported',
  PROVISIONAL: 'provisional',
  DISPUTED: 'disputed',
})

export const OperationalStatus = Object.freeze({
  VIOLATED: 'violated',
  ELEVATED: 'elevated',
  WATCH: 'watch',
  NORMAL: 'normal',
})

const severityLegacyMap = Object.freeze({
  high: Severity.CRITICAL,
  medium: Severity.ELEVATED,
  low: Severity.WATCH,
  blocked: Severity.CRITICAL,
  degraded: Severity.ELEVATED,
  breach: Severity.VIOLATED,
  alert: Severity.ELEVATED,
  unknown: Severity.WATCH,
})

const trustLegacyMap = Object.freeze({
  confirmed: Trust.SUPPORTED,
  trusted: Trust.SUPPORTED,
  strong: Trust.SUPPORTED,
  weak: Trust.PROVISIONAL,
  uncertain: Trust.PROVISIONAL,
  unknown: Trust.PROVISIONAL,
  unsupported: Trust.DISPUTED,
})

const operationalStatusLegacyMap = Object.freeze({
  high: OperationalStatus.VIOLATED,
  medium: OperationalStatus.ELEVATED,
  low: OperationalStatus.WATCH,
  blocked: OperationalStatus.VIOLATED,
  critical: OperationalStatus.VIOLATED,
  breach: OperationalStatus.VIOLATED,
  alert: OperationalStatus.ELEVATED,
  degraded: OperationalStatus.ELEVATED,
  stable: OperationalStatus.NORMAL,
  supported: OperationalStatus.NORMAL,
  provisional: OperationalStatus.WATCH,
  unknown: OperationalStatus.WATCH,
})

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase()
}

function mapByIncludes(token, includeMap, fallback) {
  const matched = Object.entries(includeMap).find(([needle]) => token.includes(needle))
  return matched ? matched[1] : fallback
}

export function toApprovedSeverity(value, fallback = Severity.WATCH) {
  const token = normalizeToken(value)
  if (Object.values(Severity).includes(token)) return token
  return mapByIncludes(token, severityLegacyMap, fallback)
}

export function toApprovedTrust(value, fallback = Trust.PROVISIONAL) {
  const token = normalizeToken(value)
  if (Object.values(Trust).includes(token)) return token
  return mapByIncludes(token, trustLegacyMap, fallback)
}

export function toApprovedOperationalStatus(value, fallback = OperationalStatus.WATCH) {
  const token = normalizeToken(value)
  if (Object.values(OperationalStatus).includes(token)) return token
  return mapByIncludes(token, operationalStatusLegacyMap, fallback)
}
