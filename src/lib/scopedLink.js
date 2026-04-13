import { toScopedQuery } from './contextKernel'

export function toScopedSearch(globalContext = {}, extra = {}) {
  const params = toScopedQuery(globalContext, extra)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function toScopedPath(pathname, globalContext = {}, extra = {}) {
  return `${pathname}${toScopedSearch(globalContext, extra)}`
}
