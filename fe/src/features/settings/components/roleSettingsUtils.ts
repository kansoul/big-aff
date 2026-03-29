import { countActivePermissionBits, isFullPermissionMask } from '@/constants/permissions'

export function formatApiError(err: unknown): string {
  const ax = err as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } }
  }
  const errors = ax.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()[0]
    if (first) {
      return first
    }
  }
  return ax.response?.data?.message ?? 'Something went wrong. Please try again.'
}

export function describeRoleMask(mask: number): string {
  if (mask === 0) {
    return '—'
  }
  if (isFullPermissionMask(mask)) {
    return 'Full access'
  }
  const n = countActivePermissionBits(mask)
  return `${n} permission${n === 1 ? '' : 's'}`
}
