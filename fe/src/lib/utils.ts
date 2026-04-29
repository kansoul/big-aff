import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isNil(v: unknown): v is null | undefined {
  return v === null || v === undefined
}

// ---------------------------------------------------------------------------
// Table URL state utilities
// ---------------------------------------------------------------------------

export type TablePaginationState = { pageIndex: number; pageSize: number }

export function parsePaginationFromParams(
  params: URLSearchParams,
  defaultPageSize = 30,
): TablePaginationState {
  const page = Number(params.get('page'))
  const perPage = Number(params.get('per_page'))
  return {
    pageIndex: Number.isFinite(page) && page > 0 ? page - 1 : 0,
    pageSize: Number.isFinite(perPage) && perPage > 0 ? perPage : defaultPageSize,
  }
}

export function setPaginationInParams(
  params: URLSearchParams,
  pagination: TablePaginationState,
  defaultPageSize = 30,
): void {
  if (pagination.pageIndex > 0) params.set('page', String(pagination.pageIndex + 1))
  else params.delete('page')
  if (pagination.pageSize !== defaultPageSize) params.set('per_page', String(pagination.pageSize))
  else params.delete('per_page')
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const delta = 2
  const left = current - delta
  const right = current + delta
  const pages: (number | '...')[] = [1]

  if (left > 2) pages.push('...')

  for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i += 1) {
    pages.push(i)
  }

  if (right < total - 1) pages.push('...')

  pages.push(total)

  return pages
}
