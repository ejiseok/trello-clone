// access token 저장소 (localStorage). 접근이 막힌 환경에서도 앱이 죽지 않도록 감싼다.
const TOKEN_KEY = 'trello.access_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // 저장에 실패해도 현재 세션 동안은 메모리 상태로 동작한다
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 무시
  }
}
