export class ApiError extends Error {
  readonly status: number
  readonly issues?: { path: string; message: string }[]
  constructor(message: string, status: number, issues?: { path: string; message: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the gateway server', 0)
  }
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const e = (json ?? {}) as { message?: string; issues?: { path: string; message: string }[] }
    throw new ApiError(e.message ?? `Request failed (${res.status})`, res.status, e.issues)
  }
  return json as T
}
