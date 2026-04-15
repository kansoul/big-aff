import { useCallback, useEffect, useState } from 'react'

import { styleReportApi } from '@/features/style-report/api'
import { StyleReportTableCard } from '@/features/style-report/components'
import type {
  StyleReportFilterParams,
  StyleReportListResponse,
  StyleReportOrderBy,
  StyleReportRow,
} from '@/features/style-report/types'

const DEFAULT_FILTERS: StyleReportFilterParams = {
  page: 1,
  per_page: 10,
  order_by: 'date',
  order: 'desc',
}

const MOCK_ROWS: StyleReportRow[] = [
  {
    id: 1,
    date: '2026-04-15',
    style_name: 'Classic Card',
    channel_name: 'Tech Daily',
    page_views: 28740,
    clicks: 914,
    earnings: 681.35,
    cpc: 0.75,
  },
  {
    id: 2,
    date: '2026-04-15',
    style_name: 'Inline Minimal',
    channel_name: 'Sports Hub',
    page_views: 19480,
    clicks: 540,
    earnings: 372.6,
    cpc: 0.69,
  },
  {
    id: 3,
    date: '2026-04-14',
    style_name: 'Hero Banner',
    channel_name: 'Lifestyle Lab',
    page_views: 31510,
    clicks: 1112,
    earnings: 923.96,
    cpc: 0.83,
  },
  {
    id: 4,
    date: '2026-04-14',
    style_name: 'Split Grid',
    channel_name: 'Food Stories',
    page_views: 16290,
    clicks: 458,
    earnings: 316.02,
    cpc: 0.69,
  },
  {
    id: 5,
    date: '2026-04-13',
    style_name: 'Widget Compact',
    channel_name: 'Finance Pulse',
    page_views: 22860,
    clicks: 798,
    earnings: 638.4,
    cpc: 0.8,
  },
  {
    id: 6,
    date: '2026-04-13',
    style_name: 'Carousel Premium',
    channel_name: 'Travel Scope',
    page_views: 17520,
    clicks: 504,
    earnings: 408.24,
    cpc: 0.81,
  },
  {
    id: 7,
    date: '2026-04-12',
    style_name: 'Story Native',
    channel_name: 'Gaming Zone',
    page_views: 26670,
    clicks: 1022,
    earnings: 807.38,
    cpc: 0.79,
  },
  {
    id: 8,
    date: '2026-04-12',
    style_name: 'Sidebar Mix',
    channel_name: 'Movie Talk',
    page_views: 14840,
    clicks: 365,
    earnings: 266.45,
    cpc: 0.73,
  },
  {
    id: 9,
    date: '2026-04-11',
    style_name: 'Compact Feed',
    channel_name: 'Health Corner',
    page_views: 20310,
    clicks: 587,
    earnings: 430.58,
    cpc: 0.73,
  },
  {
    id: 10,
    date: '2026-04-11',
    style_name: 'Dynamic Tile',
    channel_name: 'Auto World',
    page_views: 18120,
    clicks: 466,
    earnings: 358.82,
    cpc: 0.77,
  },
  {
    id: 11,
    date: '2026-04-10',
    style_name: 'Floating Dock',
    channel_name: 'News Wire',
    page_views: 30190,
    clicks: 1093,
    earnings: 928.05,
    cpc: 0.85,
  },
  {
    id: 12,
    date: '2026-04-10',
    style_name: 'Grid Insight',
    channel_name: 'Culture Mix',
    page_views: 13640,
    clicks: 332,
    earnings: 228.08,
    cpc: 0.69,
  },
]

function compareByOrder(rowA: StyleReportRow, rowB: StyleReportRow, orderBy: StyleReportOrderBy) {
  switch (orderBy) {
    case 'date':
      return rowA.date.localeCompare(rowB.date)
    case 'style_name':
      return rowA.style_name.localeCompare(rowB.style_name)
    case 'channel_name':
      return rowA.channel_name.localeCompare(rowB.channel_name)
    case 'page_views':
      return rowA.page_views - rowB.page_views
    case 'clicks':
      return rowA.clicks - rowB.clicks
    case 'earnings':
      return rowA.earnings - rowB.earnings
    case 'cpc':
      return rowA.cpc - rowB.cpc
    default:
      return 0
  }
}

function getMockResponse(filters: StyleReportFilterParams): StyleReportListResponse {
  const query = filters.query?.trim().toLowerCase()
  const orderBy = filters.order_by ?? 'date'
  const order = filters.order ?? 'desc'
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 10

  const filtered = query
    ? MOCK_ROWS.filter((row) =>
        [row.date, row.style_name, row.channel_name].some((value) =>
          value.toLowerCase().includes(query),
        ),
      )
    : [...MOCK_ROWS]

  const sorted = filtered.sort((a, b) => {
    const result = compareByOrder(a, b, orderBy)
    return order === 'asc' ? result : -result
  })

  const total = sorted.length
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const rows = sorted.slice(startIndex, endIndex)

  return {
    data: rows,
    pagination: {
      current_page: page,
      from: total === 0 ? null : startIndex + 1,
      to: total === 0 ? null : Math.min(endIndex, total),
      last_page: Math.max(1, Math.ceil(total / perPage)),
      last_page_url: null,
      next_page_url: null,
      path: '/style-report',
      per_page: perPage,
      prev_page_url: null,
      total,
    },
  }
}

export function StyleReportPage() {
  const [data, setData] = useState<StyleReportRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<StyleReportFilterParams>(DEFAULT_FILTERS)

  const loadData = useCallback(async (activeFilters: StyleReportFilterParams) => {
    try {
      setLoading(true)
      const { data: response } = await styleReportApi.list(activeFilters)
      setData(response.data)
      setRowCount(response.pagination.total)
    } catch {
      const mockResponse = getMockResponse(activeFilters)
      setData(mockResponse.data)
      setRowCount(mockResponse.pagination.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onFilterChange = useCallback((patch: Partial<StyleReportFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onSortingChange = useCallback((orderBy: string | null, order: 'asc' | 'desc' | null) => {
    setFilters((prev) => ({
      ...prev,
      order_by: (orderBy as StyleReportOrderBy | null) ?? undefined,
      order: order ?? undefined,
      page: 1,
    }))
  }, [])

  return (
    <StyleReportTableCard
      data={data}
      rowCount={rowCount}
      loading={loading}
      filters={filters}
      onFilterChange={onFilterChange}
      onFilterReset={onFilterReset}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
    />
  )
}
