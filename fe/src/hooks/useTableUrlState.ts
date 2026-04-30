import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parsePaginationFromParams, type TablePaginationState } from '@/lib/utils'

type UseTableUrlStateOptions<F> = {
  parseFilters: (params: URLSearchParams) => F
  buildParams: (filters: F, pagination: TablePaginationState) => URLSearchParams
  defaultFilters: F
  defaultPageSize?: number
}

export function useTableUrlState<F>({
  parseFilters,
  buildParams,
  defaultFilters,
  defaultPageSize = 30,
}: UseTableUrlStateOptions<F>) {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState<F>(() => parseFilters(searchParams))
  const [pagination, setPagination] = useState<TablePaginationState>(() =>
    parsePaginationFromParams(searchParams, defaultPageSize),
  )

  const isMounted = useRef(false)
  // Tracks whether the last searchParams change was triggered by our own setSearchParams call,
  // so we don't sync URL → state on our own updates (which would cause extra re-renders).
  const isInternalUpdate = useRef(false)

  // State → URL: when user changes filters or pagination, update the URL.
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    isInternalUpdate.current = true
    setSearchParams(buildParams(filters, pagination), { replace: true })
    // buildParams is a module-level function — stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination, setSearchParams])

  // URL → State: when URL changes externally (Back/Forward navigation), sync state from URL.
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    setFilters(parseFilters(searchParams))
    setPagination(parsePaginationFromParams(searchParams, defaultPageSize))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const onFilterChange = useCallback((patch: Partial<F>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(defaultFilters)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    // defaultFilters is a module-level constant — stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { filters, setFilters, pagination, setPagination, onFilterChange, onFilterReset }
}
