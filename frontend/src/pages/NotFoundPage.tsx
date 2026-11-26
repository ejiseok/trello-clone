import { Link } from 'react-router'

import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <ErrorState
      className="min-h-svh"
      title="페이지를 찾을 수 없습니다"
      message="주소가 올바른지 확인해 주세요."
      action={
        <Button asChild>
          <Link to="/boards">보드 목록으로</Link>
        </Button>
      }
    />
  )
}
