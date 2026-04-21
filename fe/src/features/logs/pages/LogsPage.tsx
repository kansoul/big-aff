import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { logsApi } from '@/features/logs/api'
import { LogEntryDetailDrawer, LogsTableCard } from '@/features/logs/components'
import type { LogEntry, LogFilters, LogPagination } from '@/features/logs/types'
import { formatApiError } from '@/features/settings/components'

const DEFAULT_FILTERS: LogFilters = { file: null, level: null, keyword: null }
const DEFAULT_PAGINATION: LogPagination = { total: 0, per_page: 50, current_page: 1, last_page: 1 }
const AUTO_REFRESH_INTERVAL = 30_000

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [data, setData] = useState<LogEntry[]>([])
  const [pagination, setPagination] = useState<LogPagination>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [fileOptions, setFileOptions] = useState<string[]>([])
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const [filters, setFilters] = useState<LogFilters>(() => ({
    file: searchParams.get('file'),
    level: searchParams.get('level') as LogFilters['level'],
    keyword: searchParams.get('keyword'),
  }))
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1))
  const [perPage, setPerPage] = useState(() => Number(searchParams.get('per_page') ?? 50))

  const refreshSignalRef = useRef(0)
  const [refreshSignal, setRefreshSignal] = useState(0)

  const refresh = useCallback(() => {
    refreshSignalRef.current += 1
    setRefreshSignal(refreshSignalRef.current)
  }, [])

  // Sync filters to URL
  useEffect(() => {
    const params: Record<string, string> = {}
    if (filters.file) params.file = filters.file
    if (filters.level) params.level = filters.level
    if (filters.keyword) params.keyword = filters.keyword
    if (page > 1) params.page = String(page)
    if (perPage !== 50) params.per_page = String(perPage)
    setSearchParams(params, { replace: true })
  }, [filters, page, perPage, setSearchParams])

  // Load file list once
  useEffect(() => {
    logsApi
      .files()
      .then((res) => {
        setFileOptions(res.data.data.map((f) => f.name))
      })
      .catch((err) => console.error('Failed to load log files', err))
  }, [])

  // Fetch entries
  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await logsApi.list(page, perPage, filters)
        if (!ignore) {
          setData(res.data.data)
          setPagination(res.data.pagination)
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [page, perPage, filters, refreshSignal])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(refresh, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [autoRefresh, refresh])

  function handleFiltersChange(next: LogFilters) {
    setFilters(next)
    setPage(1)
  }

  function handleFiltersReset() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await logsApi.clear()
      toast.success('Logs cleared successfully')
      refresh()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h1 className="text-lg font-semibold">Application Logs</h1>
        <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          Auto-refresh (30s)
        </label>
      </div>

      <div className="flex-1 overflow-auto">
        <LogsTableCard
          data={data}
          pagination={pagination}
          loading={loading}
          filters={filters}
          fileOptions={fileOptions}
          onFilterChange={handleFiltersChange}
          onFilterReset={handleFiltersReset}
          onPageChange={setPage}
          onPerPageChange={(p) => {
            setPerPage(p)
            setPage(1)
          }}
          onRefresh={refresh}
          onClear={handleClearLogs}
          onRowClick={setSelectedEntry}
        />
      </div>

      <LogEntryDetailDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  )
}
