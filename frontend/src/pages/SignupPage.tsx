import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'

import { ApiError, getErrorMessage } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { FormTextField } from '@/components/common/FormTextField'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup } from '@/components/ui/field'
import { AuthLayout } from '@/pages/AuthLayout'

// 서버(backend/app/schemas/user.py)와 같은 규칙
const PASSWORD_MIN_LENGTH = 8

const schema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, '이메일을 입력해 주세요.')
      .pipe(z.email('올바른 이메일 형식이 아닙니다.')),
    name: z.string().trim().min(1, '이름을 입력해 주세요.').max(50, '이름은 50자 이하로 입력해 주세요.'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`)
      .max(128, '비밀번호는 128자 이하로 입력해 주세요.'),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다.',
  })
type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '', password: '', passwordConfirm: '' },
  })

  const onSubmit = form.handleSubmit(async ({ email, name, password }) => {
    try {
      await signup({ email, name, password })
      navigate('/boards', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError('email', { message: err.message })
      } else {
        form.setError('root', { message: getErrorMessage(err) })
      }
    }
  })

  const { isSubmitting, errors } = form.formState

  return (
    <AuthLayout
      title="회원가입"
      description="팀 보드를 만들고 함께 일해 보세요."
      footer={
        <>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormTextField
            control={form.control}
            name="email"
            label="이메일"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            autoFocus
          />
          <FormTextField control={form.control} name="name" label="이름" autoComplete="name" />
          <FormTextField
            control={form.control}
            name="password"
            label={`비밀번호 (${PASSWORD_MIN_LENGTH}자 이상)`}
            type="password"
            autoComplete="new-password"
          />
          <FormTextField
            control={form.control}
            name="passwordConfirm"
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
          />
          {errors.root && <FieldError>{errors.root.message}</FieldError>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            가입하기
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
