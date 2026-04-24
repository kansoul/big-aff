import type { ManagedUser } from '@/shared/types'

export type ChannelOptionForAssign = {
  code: string
  name: string | null
}

export type AssignedChannelSummary = {
  code: string
  name: string | null
}

export type UserChannelAssignmentRow = Pick<ManagedUser, 'id' | 'name' | 'email'> & {
  channels: AssignedChannelSummary[]
}
