import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  // 한글 이름은 첫 글자, 영문은 단어별 첫 글자 최대 2개
  if (/^[가-힣]/.test(trimmed)) return trimmed[0]
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

interface UserAvatarProps {
  name: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function UserAvatar({ name, size = 'default', className }: UserAvatarProps) {
  return (
    <Avatar size={size} className={className} title={name}>
      <AvatarFallback className={cn('font-medium')}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
