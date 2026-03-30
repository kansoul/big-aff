import { memo, useEffect } from 'react'
import { useMatches } from 'react-router-dom'

import { appTitle } from '@/config'

function routeHandlePageTitle(handle: unknown): string {
  if (handle == null || typeof handle !== 'object' || !('title' in handle)) {
    return ''
  }
  const raw = (handle as { title: unknown }).title
  return typeof raw === 'string' ? raw.trim() : ''
}

function DocumentTitleInner() {
  const matches = useMatches()
  const leaf = matches.at(-1)
  const pageTitle = routeHandlePageTitle(leaf?.handle)

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle}` : appTitle
  }, [pageTitle])

  return null
}

export const DocumentTitle = memo(DocumentTitleInner)
