import { Loader2Icon } from 'lucide-react'

export function FullPageSpinner({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
      <Loader2Icon className="size-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
