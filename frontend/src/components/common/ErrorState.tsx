import { TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = '문제가 발생했습니다',
  message,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 p-8 text-center', className)}
    >
      <TriangleAlertIcon className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            다시 시도
          </Button>
        )}
        {action}
      </div>
    </div>
  )
}
