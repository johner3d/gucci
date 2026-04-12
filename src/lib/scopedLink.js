export function toScopedSearch(globalContext = {}, extra = {}) {
  const params = new URLSearchParams({ ...globalContext, ...extra })
  return `?${params.toString()}`
}

export function toScopedPath(pathname, globalContext = {}, extra = {}) {
  return `${pathname}${toScopedSearch(globalContext, extra)}`
}
