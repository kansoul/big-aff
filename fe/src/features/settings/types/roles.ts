export type RoleCreatePayload = {
  name: string
  permission_mask?: number
}

export type RoleUpdatePayload = {
  name?: string
  permission_mask?: number
}
