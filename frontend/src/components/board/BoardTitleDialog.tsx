import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getErrorMessage } from '@/api/client'
import { FormTextField } from '@/components/common/FormTextField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldError, FieldGroup } from '@/components/ui/field'

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '보드 이름을 입력해 주세요.')
    .max(200, '보드 이름은 200자 이하로 입력해 주세요.'),
})
type FormValues = z.infer<typeof schema>

interface BoardTitleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  heading: string
  description?: string
  submitLabel: string
  initialTitle?: string
  onSubmit: (title: string) => Promise<unknown>
}

/** 새 보드 만들기 / 보드 이름 변경 공용 다이얼로그 */
export function BoardTitleDialog({
  open,
  onOpenChange,
  heading,
  description,
  submitLabel,
  initialTitle = '',
  onSubmit,
}: BoardTitleDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: initialTitle },
  })

  useEffect(() => {
    if (open) form.reset({ title: initialTitle })
  }, [open, initialTitle, form])

  const submit = form.handleSubmit(async ({ title }) => {
    try {
      await onSubmit(title)
      onOpenChange(false)
    } catch (err) {
      form.setError('root', { message: getErrorMessage(err) })
    }
  })

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <FieldGroup className="py-4">
            <FormTextField
              control={form.control}
              name="title"
              label="보드 이름"
              placeholder="예: 학기 프로젝트"
              autoFocus
            />
            {errors.root && <FieldError>{errors.root.message}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
