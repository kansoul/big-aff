import { type UserRole, USER_ROLES, type RBACRole } from '@/shared/types'

export function getUserRole(userRoles: UserRole[], isAdmin: boolean): RBACRole {
  return {
    isAdmin: isAdmin,
    isManager: userRoles.includes(USER_ROLES.Manager),
    isLeader: userRoles.includes(USER_ROLES.Leader),
    isMember: userRoles.includes(USER_ROLES.Member),
  }
}
