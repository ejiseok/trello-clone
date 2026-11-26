import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/auth/useAuth'
import { ErrorState } from '@/components/common/ErrorState'
import { FullPageSpinner } from '@/components/common/FullPageSpinner'

/** 로그인한 사용자만 접근 가능. 아니면 /login 으로 보내고, 로그인 후 원래 위치로 돌아온다. */
export function ProtectedRoute() {
  const { status, retry, logout } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'error') {
    return (
      <ErrorState
        className="min-h-svh"
        title="사용자 정보를 불러오지 못했습니다"
        message="서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
        onRetry={retry}
        action={
          <button className="text-sm text-muted-foreground underline" onClick={logout}>
            로그아웃
          </button>
        }
      />
    )
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** 로그인/회원가입 화면: 이미 로그인했다면 보드 목록으로 */
export function PublicOnlyRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to="/boards" replace />
  return <Outlet />
}
