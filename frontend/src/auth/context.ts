import { createContext } from 'react'

import type { User } from '@/api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (data: { email: string; name: string; password: string }) => Promise<void>
  logout: () => void
  /** /me 조회가 네트워크 오류 등으로 실패했을 때 다시 시도 */
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
