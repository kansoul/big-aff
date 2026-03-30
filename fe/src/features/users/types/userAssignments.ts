export type UserParentAssignmentRow = {
  id: number
  name: string
  email: string
  /** Always true for rows returned (child-only users are omitted from the list). */
  can_be_parent: boolean
  child_user_ids: number[]
}

/** Full directory of users the actor can manage; used for child picker labels. */
export type UserOptionForAssign = {
  id: number
  name: string
  email: string
  is_assigned_child: boolean
}

export type ParentChildAssignmentsPayload = {
  assignments: UserParentAssignmentRow[]
  user_options: UserOptionForAssign[]
}
