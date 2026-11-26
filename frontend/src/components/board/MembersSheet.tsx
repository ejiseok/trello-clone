import { Loader2Icon, UserMinusIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/api/client'
import type { BoardDetail, Member } from '@/api/types'
import { useAuth } from '@/auth/useAuth'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAddMember, useRemoveMember } from '@/hooks/useBoard'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function MembersSheet({ board }: { board: BoardDetail }) {
  const { user } = useAuth()
  const isOwner = board.role === 'owner'
  const addMember = useAddMember(board.id)
  const removeMember = useRemoveMember(board.id)

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)

  const invite = (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }
    setError(null)
    addMember.mutate(value, {
      onSuccess: (member) => {
        setEmail('')
        toast.success(`${member.name}님을 보드에 초대했습니다.`)
      },
      onError: (err) => setError(getErrorMessage(err)),
    })
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <UsersIcon />
          멤버 {board.members.length}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>보드 멤버</SheetTitle>
          <SheetDescription>
            {isOwner
              ? '가입한 사용자의 이메일로 멤버를 초대할 수 있습니다.'
              : '멤버 초대와 제거는 보드 소유자만 할 수 있습니다.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          {isOwner && (
            <>
              <form onSubmit={invite} noValidate>
                <Field data-invalid={error !== null}>
                  <FieldLabel htmlFor="invite-email">이메일로 초대</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="invite-email"
                      type="email"
                      value={email}
                      placeholder="teammate@example.com"
                      aria-invalid={error !== null}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError(null)
                      }}
                    />
                    <Button type="submit" disabled={addMember.isPending || !email.trim()}>
                      {addMember.isPending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
                      초대
                    </Button>
                  </div>
                  {error ? (
                    <FieldError>{error}</FieldError>
                  ) : (
                    <FieldDescription>상대방이 먼저 회원가입을 해야 합니다.</FieldDescription>
                  )}
                </Field>
              </form>
              <Separator />
            </>
          )}

          <ul className="flex flex-col gap-1" aria-label="멤버 목록">
            {board.members.map((member) => (
              <li key={member.user_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60">
                <UserAvatar name={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.name}
                    {member.user_id === user?.id && (
                      <span className="ml-1 text-xs text-muted-foreground">(나)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
                <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                  {member.role === 'owner' ? '소유자' : '멤버'}
                </Badge>
                {isOwner && member.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${member.name} 제거`}
                    onClick={() => setRemoving(member)}
                  >
                    <UserMinusIcon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="멤버를 제거할까요?"
        description={`${removing?.name}님이 이 보드에 더 이상 접근할 수 없게 되고, 담당한 카드의 담당자 지정이 해제됩니다.`}
        confirmLabel="제거"
        onConfirm={() => {
          if (!removing) return
          const name = removing.name
          removeMember.mutate(removing.user_id, {
            onSuccess: () => toast.success(`${name}님을 보드에서 제거했습니다.`),
          })
        }}
      />
    </Sheet>
  )
}
