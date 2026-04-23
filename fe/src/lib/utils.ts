import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isNil(v: unknown): v is null | undefined {
  return v === null || v === undefined
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
