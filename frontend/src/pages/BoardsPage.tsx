import { LayoutGridIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { getErrorMessage } from '@/api/client'
import type { BoardSummary } from '@/api/types'
import { BoardTile } from '@/components/board/BoardTile'
import { BoardTitleDialog } from '@/components/board/BoardTitleDialog'
import { AppHeader } from '@/components/common/AppHeader'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBoards, useCreateBoard, useDeleteBoard, useRenameBoard } from '@/hooks/useBoards'

export function BoardsPage() {
  const navigate = useNavigate()
  const boards = useBoards()
  const createBoard = useCreateBoard()
  const renameBoard = useRenameBoard()
  const deleteBoard = useDeleteBoard()

  const [createOpen, setCreateOpen] = useState(false)
  const [renaming, setRenaming] = useState<BoardSummary | null>(null)
  const [deleting, setDeleting] = useState<BoardSummary | null>(null)

  const handleDelete = (board: BoardSummary) => {
    deleteBoard.mutate(board.id, {
      onSuccess: () => toast.success(`'${board.title}' 보드를 삭제했습니다.`),
      onError: (err) => toast.error('보드를 삭제하지 못했습니다.', { description: getErrorMessage(err) }),
    })
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <LayoutGridIcon className="size-5 text-primary" />내 보드
          </h1>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />새 보드
          </Button>
        </div>

        {boards.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : boards.isError ? (
          <ErrorState
            title="보드 목록을 불러오지 못했습니다"
            message={getErrorMessage(boards.error)}
            onRetry={() => void boards.refetch()}
          />
        ) : boards.data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-background p-12 text-center">
            <LayoutGridIcon className="size-10 text-primary/70" />
            <div className="space-y-1">
              <p className="font-medium">아직 보드가 없습니다</p>
              <p className="text-sm text-muted-foreground">
                첫 보드를 만들거나, 다른 사람에게 초대를 받아 보세요.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />첫 보드 만들기
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {boards.data.map((board) => (
              <BoardTile
                key={board.id}
                board={board}
                onRename={() => setRenaming(board)}
                onDelete={() => setDeleting(board)}
              />
            ))}
          </div>
        )}
      </main>

      <BoardTitleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        heading="새 보드 만들기"
        description="보드를 만든 사람이 보드 소유자가 됩니다."
        submitLabel="만들기"
        onSubmit={async (title) => {
          const board = await createBoard.mutateAsync(title)
          navigate(`/boards/${board.id}`)
        }}
      />
      <BoardTitleDialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        heading="보드 이름 변경"
        submitLabel="저장"
        initialTitle={renaming?.title}
        onSubmit={async (title) => {
          if (renaming) await renameBoard.mutateAsync({ boardId: renaming.id, title })
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="보드를 삭제할까요?"
        description={
          <>
            <strong className="text-foreground">{deleting?.title}</strong> 보드와 그 안의 모든
            리스트, 카드가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </>
        }
        onConfirm={() => deleting && handleDelete(deleting)}
      />
    </div>
  )
}
