/**
 * Single source of truth for app pathnames (leading `/`).
 * Use for `<Link>`, `navigate()`, `<Navigate>`, and nav `href` in `header.ts`.
 */
export const PATHS = {
  root: '/',
  login: '/login',
  dashboard: '/dashboard',
  media: '/media',
  posts: '/posts',
  postsCreate: '/posts/create',
  postsView: '/posts/:id',
  postsEdit: '/posts/:id/edit',
  settingsUsers: '/users',

  settingsRoles: '/roles',
  settingsSites: '/sites',
  settingsSitesCreate: '/sites/create',
  settingsSitesView: '/sites/:id',
  settingsSitesEdit: '/sites/:id/edit',
  categories: '/categories',
  channels: '/channels',
  styles: '/styles',
  follows: '/follows',
  teams: '/teams',
  teamsAssignUsers: '/teams-assign-users',
  adsLinks: '/ads-links',
  businessCenters: '/business-centers',
  businessCentersCreate: '/business-centers/create',
  businessCentersEdit: '/business-centers/:id/edit',
  accounts: '/accounts',
  adClients: '/ad-clients',
  adsReport: '/ads-report',
  styleReport: '/style-report',
  revenueReport: '/revenue-report',
  campaignRuleSettings: '/campaign-rule-settings',
  googleConversions: '/google-conversions',
  campaignReport: '/campaign-report',
} as const

export const postViewPath = (id: number | string) => `/posts/${id}`
export const postEditPath = (id: number | string) => `/posts/${id}/edit`

export const siteViewPath = (id: number | string) => `/sites/${id}`
export const siteEditPath = (id: number | string) => `/sites/${id}/edit`

export const businessCenterEditPath = (id: number | string) => `/business-centers/${id}/edit`

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
