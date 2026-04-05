/**
 * Single source of truth for app pathnames (leading `/`).
 * Use for `<Link>`, `navigate()`, `<Navigate>`, and nav `href` in `header.ts`.
 */
export const PATHS = {
  root: '/',
  login: '/login',
  dashboard: '/dashboard',
  media: '/media',
  settingsUsers: '/settings/users',
  settingsUsersAssign: '/settings/users-assign',
  settingsRoles: '/settings/roles',
} as const

/** Identifies a top-level nav group; set on route `handle.navSection` and optional `NavItem.navSection`. */
export const NAV_SECTIONS = {
  dashboard: 'dashboard',
  settings: 'settings',
} as const

export type NavSectionId = (typeof NAV_SECTIONS)[keyof typeof NAV_SECTIONS]

export type AppPath = (typeof PATHS)[keyof typeof PATHS]

/**
 * React Router `path` for a child of a layout whose parent route is `path: '/'`.
 * (No leading slash; supports nested segments like `settings/users`.)
 */
export function routeSegment(path: Exclude<AppPath, typeof PATHS.root>): string {
  return path.slice(1)
}
