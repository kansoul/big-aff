import { useState } from 'react'
import { useRouteError } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PATHS } from '@/constants/paths'

/**
 * A lazy-import chunk error happens when the open tab is running an old build
 * while the server has already deployed a new one (the old hashed files no
 * longer exist). In that case we should prompt the user to reload and get the
 * latest version instead of showing the default error screen.
 */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''

  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i.test(
    message,
  )
}

/** Clear CacheStorage + service workers, then reload to ensure the latest version. */
async function clearCachesAndReload(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
  } finally {
    window.location.reload()
  }
}

export function AppErrorPage() {
  const error = useRouteError()
  const [reloading, setReloading] = useState(false)
  const isOutdated = isChunkLoadError(error)

  const handleReload = () => {
    setReloading(true)
    void clearCachesAndReload()
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <RefreshCw className="size-7 text-primary" aria-hidden />
      </div>

      <div className="mt-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isOutdated ? 'A new version is available' : 'Something went wrong'}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {isOutdated
            ? 'The app has just been updated. Please reload the page to use the latest version.'
            : 'This page failed to load. Please reload the page, or try again in a few minutes if it persists.'}
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Button
          size="lg"
          className="min-w-44 gap-2 font-semibold"
          onClick={handleReload}
          disabled={reloading}
        >
          <RefreshCw className={`size-4 ${reloading ? 'animate-spin' : ''}`} aria-hidden />
          {reloading ? 'Reloading…' : 'Reload page'}
        </Button>
        {!isOutdated && (
          <Button
            size="lg"
            variant="outline"
            className="min-w-44 gap-2 font-semibold"
            onClick={() => {
              window.location.href = PATHS.root
            }}
            disabled={reloading}
          >
            Go to Dashboard
          </Button>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </div>
  )
}
