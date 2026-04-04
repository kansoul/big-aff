import { memo } from 'react'
import { useMatches } from 'react-router-dom'

import { cn } from '@/lib/utils'

type RouteTitleHandle = { title?: string }

type ScreenTitleProps = {
  className?: string
}

function ScreenTitleInner({ className }: ScreenTitleProps) {
  const matches = useMatches()
  const leaf = matches[matches.length - 1]
  const title = (leaf?.handle as RouteTitleHandle | undefined)?.title?.trim() ?? ''

  if (!title) {
    return null
  }

  return (
    <div className={cn('mb-4 flex items-center gap-2 border-b pb-4', className)}>
      <span className="h-4 w-0.5 shrink-0 rounded-full bg-red-600 dark:bg-red-400" aria-hidden />
      <h1 className="text-3xl! font-semibold tracking-tight m-0! text-foreground">{title}</h1>
    </div>
  )
}

export const ScreenTitle = memo(ScreenTitleInner)
