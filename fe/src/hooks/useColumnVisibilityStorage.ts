import { useCallback, useState } from 'react'

const STORAGE_PREFIX = 'col_vis:'

function readStorage(key: string, defaults: Record<string, boolean>): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return defaults
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return defaults
    // Merge: stored values override defaults
    return { ...defaults, ...(parsed as Record<string, boolean>) }
  } catch {
    return defaults
  }
}

function writeStorage(key: string, value: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

/**
 * Persists MRT column visibility to localStorage under a route-scoped key.
 *
 * @param storageKey  Usually `useLocation().pathname`
 * @param defaults    Columns hidden by default (user can still show them)
 *
 * For columns that must always be hidden based on business logic (forced),
 * merge them separately in the component after calling this hook.
 */
export function useColumnVisibilityStorage(
  storageKey: string,
  defaults: Record<string, boolean> = {},
) {
  const [columnVisibility, setColumnVisibilityRaw] = useState<Record<string, boolean>>(() =>
    readStorage(storageKey, defaults),
  )

  const setColumnVisibility = useCallback(
    (
      updater:
        | Record<string, boolean>
        | ((prev: Record<string, boolean>) => Record<string, boolean>),
    ) => {
      setColumnVisibilityRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        writeStorage(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  return { columnVisibility, setColumnVisibility }
}
