const jsonHeaders = { Accept: 'application/json' }

export async function loadJSON(path) {
  const response = await fetch(path, { headers: jsonHeaders })
  if (!response.ok) {
    throw new Error(`Could not load ${path}`)
  }
  return response.json()
}
