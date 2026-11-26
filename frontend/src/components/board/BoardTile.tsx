import { MoreHorizontalIcon, PencilIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { BoardSummary } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateTime } from '@/lib/date'

interface BoardTileProps {
  board: BoardSummary
  onRename: () => void
  onDelete: () => void
}

export function BoardTile({ board, onRename, onDelete }: BoardTileProps) {
  const isOwner = board.role === 'owner'

  return (
    <Card className="relative h-32 justify-between border-t-4 border-t-primary transition-shadow hover:shadow-md hover:ring-primary/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
      <CardHeader>
        <CardTitle className="line-clamp-2 break-all">
          {/* 카드 전체를 클릭 영역으로 */}
          <Link to={`/boards/${board.id}`} className="outline-none after:absolute after:inset-0">
            {board.title}
          </Link>
        </CardTitle>
        <CardAction className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${board.title} 메뉴`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onRename}>
                <PencilIcon />
                이름 변경
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2Icon />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardDescription className="flex items-center justify-between gap-2 px-(--card-spacing) text-xs">
        <span>{formatDateTime(board.created_at)} 생성</span>
        {!isOwner && (
          <Badge variant="secondary">
            <UsersIcon />
            공유됨
          </Badge>
        )}
      </CardDescription>
    </Card>
  )
}
