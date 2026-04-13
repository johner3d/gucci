const TELEMETRY_BUFFER_KEY = '__qaLatencyHooks'

function safeNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return Number(performance.now().toFixed(3))
  }
  return Date.now()
}

function getBuffer() {
  if (typeof globalThis === 'undefined') return []
  if (!globalThis[TELEMETRY_BUFFER_KEY]) globalThis[TELEMETRY_BUFFER_KEY] = []
  return globalThis[TELEMETRY_BUFFER_KEY]
}

export function captureLatencyHook(checkpoint, metadata = {}) {
  const event = {
    checkpoint,
    at_ms: safeNow(),
    metadata,
  }
  getBuffer().push(event)
  return event
}
