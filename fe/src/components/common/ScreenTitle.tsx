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
    <p className={cn('text-xl font-semibold tracking-tight text-foreground mb-6', className)}>
      {title}
    </p>
  )
}

export const ScreenTitle = memo(ScreenTitleInner)
