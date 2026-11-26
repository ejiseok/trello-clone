import { clearToken, getToken } from '@/lib/token'

/** 401 응답을 받았을 때 발생시키는 전역 이벤트 (AuthProvider가 구독) */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type FastApiDetail = string | Array<{ msg?: string }> | undefined

function messageFromDetail(status: number, detail: FastApiDetail): string {
  if (typeof detail === 'string') return detail
  if (status === 422) return '입력값을 확인해 주세요.'
  if (status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  return '요청을 처리하지 못했습니다.'
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/** `/api` 기준 상대 경로로 요청한다. 실패하면 ApiError를 던진다. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.')
  }

  if (res.status === 401 && token) {
    // 토큰이 만료되었거나 유효하지 않음 → 토큰 삭제 후 로그인 화면으로
    clearToken()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  if (!res.ok) {
    let detail: FastApiDetail
    try {
      detail = ((await res.json()) as { detail?: FastApiDetail }).detail
    } catch {
      detail = undefined
    }
    throw new ApiError(res.status, messageFromDetail(res.status, detail))
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return '알 수 없는 오류가 발생했습니다.'
}
