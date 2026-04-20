import type { ManagedUser } from '@/shared/types'

export type AccountOptionForAssign = {
  id: number
  account_id: string
  account_name: string | null
}

export type AssignedAccountSummary = {
  id: number
  account_id: string
  account_name: string | null
}

/**
 * User row from `GET /users` including currently assigned accounts.
 */
export type UserAccountAssignmentRow = Pick<ManagedUser, 'id' | 'name' | 'email'> & {
  accounts: AssignedAccountSummary[]
}
