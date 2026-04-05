export type RoleCreatePayload = {
  name: string
  permissions?: string[]
}

export type RoleUpdatePayload = {
  name?: string
  permissions?: string[]
}
