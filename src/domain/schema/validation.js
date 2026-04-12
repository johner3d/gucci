export class DataValidationError extends Error {
  constructor(message, diagnostics = []) {
    super(message)
    this.name = 'DataValidationError'
    this.diagnostics = diagnostics
  }
}

export function issue(path, code, message, level = 'error') {
  return { path, code, message, level }
}

export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function requireString(value, path, field, diagnostics) {
  if (typeof value[field] !== 'string' || !value[field]) {
    diagnostics.push(issue(`${path}.${field}`, 'invalid_type', 'Expected non-empty string'))
    return false
  }
  return true
}

export function requireArray(value, path, field, diagnostics) {
  if (!Array.isArray(value[field])) {
    diagnostics.push(issue(`${path}.${field}`, 'invalid_type', 'Expected array'))
    return false
  }
  return true
}

export function ensureRecord(value, path, diagnostics) {
  if (!isRecord(value)) {
    diagnostics.push(issue(path, 'invalid_type', 'Expected object payload'))
    return false
  }
  return true
}
