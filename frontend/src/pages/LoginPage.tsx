import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'

import { getErrorMessage } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { FormTextField } from '@/components/common/FormTextField'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup } from '@/components/ui/field'
import { AuthLayout } from '@/pages/AuthLayout'

const schema = z.object({
  email: z.string().trim().min(1, '이메일을 입력해 주세요.').pipe(z.email('올바른 이메일 형식이 아닙니다.')),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/boards'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
      navigate(from, { replace: true })
    } catch (err) {
      form.setError('root', { message: getErrorMessage(err) })
    }
  })

  const { isSubmitting, errors } = form.formState

  return (
    <AuthLayout
      title="로그인"
      description="이메일과 비밀번호로 로그인하세요."
      footer={
        <>
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            회원가입
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
          <FormTextField
            control={form.control}
            name="password"
            label="비밀번호"
            type="password"
            autoComplete="current-password"
          />
          {errors.root && <FieldError>{errors.root.message}</FieldError>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            로그인
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
