import { ArrowLeftIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError, getErrorMessage } from '@/api/client'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { MembersSheet } from '@/components/board/MembersSheet'
import { CardDetailDialog } from '@/components/card/CardDetailDialog'
import { AppHeader } from '@/components/common/AppHeader'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EditableText } from '@/components/common/EditableText'
import { ErrorState } from '@/components/common/ErrorState'
import { UserAvatar } from '@/components/common/UserAvatar'
import { AvatarGroup } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useBoard } from '@/hooks/useBoard'
import { useDeleteBoard, useRenameBoard } from '@/hooks/useBoards'

function BoardSkeleton() {
  return (
    <div className="flex gap-3 p-4" aria-label="보드를 불러오는 중">
      {[4, 2, 3].map((n, i) => (
        <div key={i} className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted p-2">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: n }, (_, j) => (
            <Skeleton key={j} className="h-16 bg-background" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function BoardPage() {
  const params = useParams()
  const boardId = Number(params.boardId)
  const navigate = useNavigate()
  const board = useBoard(boardId)
  const renameBoard = useRenameBoard()
  const deleteBoard = useDeleteBoard()
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 열린 카드는 URL(?card=ID)에 둬서 새로고침/뒤로가기에도 유지
  const [searchParams, setSearchParams] = useSearchParams()
  const openCardId = searchParams.get('card') ? Number(searchParams.get('card')) : null
  const openCard = (cardId: number) => setSearchParams({ card: String(cardId) })
  const closeCard = () => setSearchParams({}, { replace: true })

  const notFound =
    !Number.isFinite(boardId) || (board.error instanceof ApiError && board.error.status === 404)

  return (
    <div className="flex h-svh flex-col bg-muted/40">
      <AppHeader>
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/boards" aria-label="보드 목록으로">
            <ArrowLeftIcon />
          </Link>
        </Button>
        {board.data && (
          <>
            <EditableText
              value={board.data.title}
              ariaLabel="보드 이름"
              className="text-base"
              inputClassName="max-w-80"
              onSave={(title) =>
                renameBoard.mutate(
                  { boardId, title },
                  {
                    onError: (err) =>
                      toast.error('보드 이름을 바꾸지 못했습니다.', {
                        description: getErrorMessage(err),
                      }),
                  },
                )
              }
            />
            <div className="ml-auto flex items-center gap-2">
              <AvatarGroup className="hidden sm:flex">
                {board.data.members.slice(0, 4).map((m) => (
                  <UserAvatar key={m.user_id} name={m.name} size="sm" />
                ))}
              </AvatarGroup>
              <MembersSheet board={board.data} />
              {board.data.role === 'owner' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="보드 메뉴">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                      <Trash2Icon />
                      보드 삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        )}
      </AppHeader>

      {notFound ? (
        <ErrorState
          className="flex-1"
          title="보드를 찾을 수 없습니다"
          message="삭제되었거나 접근 권한이 없는 보드입니다."
          action={
            <Button asChild>
              <Link to="/boards">보드 목록으로</Link>
            </Button>
          }
        />
      ) : board.isPending ? (
        <BoardSkeleton />
      ) : board.isError ? (
        <ErrorState
          className="flex-1"
          title="보드를 불러오지 못했습니다"
          message={getErrorMessage(board.error)}
          onRetry={() => void board.refetch()}
        />
      ) : (
        <>
          {board.data.lists.length === 0 && (
            <p className="px-6 pt-4 text-sm text-muted-foreground">
              아직 리스트가 없습니다. 오른쪽의 ‘리스트 추가’로 첫 리스트를 만들어 보세요. (예: 할 일 · 진행
              중 · 완료)
            </p>
          )}
          <BoardCanvas board={board.data} onOpenCard={openCard} />
          <CardDetailDialog board={board.data} cardId={openCardId} onClose={closeCard} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="보드를 삭제할까요?"
        description="보드와 그 안의 모든 리스트, 카드가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        onConfirm={() =>
          deleteBoard.mutate(boardId, {
            onSuccess: () => {
              toast.success('보드를 삭제했습니다.')
              navigate('/boards', { replace: true })
            },
            onError: (err) =>
              toast.error('보드를 삭제하지 못했습니다.', { description: getErrorMessage(err) }),
          })
        }
      />
    </div>
  )
}
