import { apiFetch } from '@/api/client'
import type { User } from '@/api/types'

export const authApi = {
  signup: (data: { email: string; name: string; password: string }) =>
    apiFetch<User>('/auth/signup', { method: 'POST', body: data }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: data,
    }),
  me: () => apiFetch<User>('/auth/me'),
}
