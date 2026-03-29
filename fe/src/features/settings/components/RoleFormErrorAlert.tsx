import { AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

type RoleFormErrorAlertProps = {
  message: string | null
  className?: string
}

export function RoleFormErrorAlert({ message, className }: RoleFormErrorAlertProps) {
  if (!message) {
    return null
  }
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive',
        className,
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}
