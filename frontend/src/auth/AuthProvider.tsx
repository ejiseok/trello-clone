import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { authApi } from '@/api/auth'
import { UNAUTHORIZED_EVENT } from '@/api/client'
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/auth/context'
import { queryKeys } from '@/hooks/queryKeys'
import { clearToken, getToken, setToken } from '@/lib/token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState<string | null>(() => getToken())

  // 사용자 정보도 서버 데이터이므로 TanStack Query로 관리한다
  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: token !== null,
    retry: false,
    staleTime: Infinity,
  })

  const resetSession = useCallback(() => {
    clearToken()
    setTokenState(null)
    queryClient.clear()
  }, [queryClient])

  // 어떤 요청에서든 401이 오면 로그아웃 처리 (ProtectedRoute가 로그인 화면으로 보낸다)
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, resetSession)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, resetSession)
  }, [resetSession])

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await authApi.login({ email, password })
      setToken(access_token)
      queryClient.clear()
      await queryClient.fetchQuery({ queryKey: queryKeys.me, queryFn: authApi.me })
      setTokenState(access_token)
    },
    [queryClient],
  )

  const signup = useCallback(
    async (data: { email: string; name: string; password: string }) => {
      await authApi.signup(data)
      await login(data.email, data.password)
    },
    [login],
  )

  const value = useMemo<AuthContextValue>(() => {
    let status: AuthStatus
    if (token === null) status = 'anonymous'
    else if (meQuery.data) status = 'authenticated'
    else if (meQuery.isError) status = 'error'
    else status = 'loading'

    return {
      status,
      user: token !== null ? (meQuery.data ?? null) : null,
      login,
      signup,
      logout: resetSession,
      retry: () => void meQuery.refetch(),
    }
  }, [token, meQuery, login, signup, resetSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
