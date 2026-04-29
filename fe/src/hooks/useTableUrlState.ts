import { useCallback, useEffect, useState } from 'react'
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

  useEffect(() => {
    setSearchParams(buildParams(filters, pagination), { replace: true })
    // buildParams is a module-level function — stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination, setSearchParams])

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
