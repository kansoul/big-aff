import { countActivePermissions, hasFullAccess } from '@/constants/permissions'

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

export function describeRolePermissions(perms: string[]): string {
  if (perms.length === 0) {
    return '—'
  }
  if (hasFullAccess(perms)) {
    return 'Full access'
  }
  const n = countActivePermissions(perms)
  return `${n} permission${n === 1 ? '' : 's'}`
}
