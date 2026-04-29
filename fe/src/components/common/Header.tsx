import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader } from '@/components/ui/sheet'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { NAVIGATION_ITEMS, type NavItem, type NavSubItem } from '@/constants/header'
import { PATHS, type NavSectionId } from '@/constants/paths'
import { hasPermission } from '@/constants/permissions'
import { dashboardApi } from '@/features/dashboard/api'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useTheme } from '@/hooks/useTheme'

import logoHeaderDark from '@/assets/logo-s-white.png'
import logoHeaderLight from '@/assets/logo-s-red.png'
import logoNexaDark from '@/assets/dark-logo-nexa.png'
import logoNexaLight from '@/assets/logo-nexa.png'

import { cn } from '@/lib/utils'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
import * as React from 'react'
import { Link, NavLink, useLocation, useMatch, useMatches, useNavigate } from 'react-router-dom'
import { siteDomain } from '@/config'

const navTabActive = 'text-red-600 border-b-2 border-red-600 dark:text-red-400 dark:border-red-400'
const navTabInactive =
  'text-foreground border-b-2 border-transparent hover:text-red-600 dark:hover:text-red-400'
const navTabBase =
  'outline-none inline-flex items-center gap-1.5 border-b-2 border-transparent px-2 py-2 rounded-lg text-xs font-semibold tracking-wider transition-colors data-popup-open:hover:bg-transparent hover:text-red-600 hover:border-b-2 hover:border-red-600 dark:hover:text-red-400 dark:hover:border-red-400'
const navSubActive = 'text-red-600 dark:text-red-400'

type AppRouteHandle = { title: string; navSection?: NavSectionId }

function useActiveNavSection(): NavSectionId | undefined {
  const matches = useMatches()
  const handle = matches.at(-1)?.handle as AppRouteHandle | undefined
  return handle?.navSection
}

function navGroupIsActive(item: NavItem, activeNavSection: NavSectionId | undefined): boolean {
  return item.navSection != null && item.navSection === activeNavSection
}

function useNavSubActive(href: string): boolean {
  return Boolean(useMatch({ path: href, end: false }))
}

function navGroupHasActiveChild(item: NavItem, pathname: string): boolean {
  return (
    item.items?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + '/')) ?? false
  )
}

function MobileNavSubLink({ sub, onNavigate }: { sub: NavSubItem; onNavigate: () => void }) {
  const isActive = useNavSubActive(sub.href)
  const MobileSubIcon = sub.icon
  return (
    <NavLink
      to={sub.href}
      onClick={onNavigate}
      className={cn(
        'flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-xs font-medium tracking-wide',
        isActive ? navSubActive : 'text-foreground hover:bg-accent/40',
      )}
    >
      <MobileSubIcon className="size-4 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 flex-1 text-left">{sub.name}</span>
    </NavLink>
  )
}

function DesktopNavSubLink({ sub }: { sub: NavSubItem }) {
  const isActive = useNavSubActive(sub.href)
  const SubIcon = sub.icon
  return (
    <NavigationMenuLink asChild>
      <NavLink
        to={sub.href}
        className={cn(
          'flex min-h-9 w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-xs! font-medium tracking-wide transition-colors rounded-sm bg-transparent! hover:bg-transparent! focus:bg-transparent! data-active:bg-transparent! hover:text-red-600 dark:hover:text-red-400 focus:text-red-600 dark:focus:text-red-400',
          isActive ? navSubActive : 'text-foreground',
        )}
      >
        <SubIcon className="size-4 shrink-0 opacity-70" aria-hidden />
        <span className="min-w-0 flex-1 text-left">{sub.name}</span>
      </NavLink>
    </NavigationMenuLink>
  )
}

function hasNavigableParentHref(item: NavItem): item is NavItem & { href: string } {
  return Boolean(item.href)
}

function filterNavItemsForUser(items: NavItem[], userPermissions: string[] | undefined): NavItem[] {
  return items
    .map((item) => {
      if (!item.items?.length) {
        return item
      }
      const filteredItems = item.items.filter(
        (sub) => !sub.requiredPermission || hasPermission(userPermissions, sub.requiredPermission),
      )
      return { ...item, items: filteredItems }
    })
    .filter((item) => {
      if (item.items?.length) {
        return item.items.length > 0
      }
      return true
    })
}

const MobileNav = React.memo(function MobileNav({
  activeNavSection,
  onNavigate,
  items,
}: {
  activeNavSection: NavSectionId | undefined
  onNavigate: () => void
  items: NavItem[]
}) {
  const { pathname } = useLocation()
  return (
    <nav className="flex flex-col gap-1 px-2 pb-6" aria-label="Main navigation">
      {items.map((item) => {
        const groupActive =
          navGroupIsActive(item, activeNavSection) || navGroupHasActiveChild(item, pathname)
        const linkClass = ({ isActive }: { isActive: boolean }) =>
          cn(
            'flex items-center gap-2.5 rounded-md px-3 py-3 text-xs font-semibold tracking-wide transition-colors',
            isActive ? navSubActive : 'text-foreground hover:bg-accent/50',
          )

        if (!item.items?.length) {
          if (!item.href) {
            return null
          }
          const MobileLeafIcon = item.icon
          return (
            <NavLink key={item.name} to={item.href} onClick={onNavigate} className={linkClass}>
              {MobileLeafIcon && (
                <MobileLeafIcon className="size-4 shrink-0 opacity-80" aria-hidden />
              )}
              {item.name}
            </NavLink>
          )
        }

        const parentNavigable = hasNavigableParentHref(item)
        const MobileParentIcon = item.icon

        return (
          <Collapsible
            key={item.name}
            defaultOpen={groupActive}
            className="group/collapsible overflow-hidden bg-background"
          >
            <div className="flex items-stretch border-b border-border/40">
              {parentNavigable ? (
                <>
                  <NavLink
                    to={item.href}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-12 flex-1 items-center gap-2.5 px-3 text-xs font-semibold tracking-wide',
                        isActive || groupActive
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-foreground',
                      )
                    }
                  >
                    {MobileParentIcon && (
                      <MobileParentIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                    )}
                    {item.name}
                  </NavLink>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-none border-l border-border/40"
                      aria-label={`${item.name} submenu`}
                    >
                      <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                </>
              ) : (
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left text-xs font-semibold tracking-wide',
                      groupActive ? 'text-red-600 dark:text-red-400' : 'text-foreground',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {MobileParentIcon && (
                        <MobileParentIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                      )}
                      {item.name}
                    </span>
                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
            <CollapsibleContent>
              <ul className="flex flex-col divide-y divide-border/50 bg-muted/30">
                {item.items.map((sub) => (
                  <li key={sub.href} className="min-w-0">
                    <MobileNavSubLink sub={sub} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </nav>
  )
})

export const Header = React.memo(function Header() {
  const location = useLocation()
  const activeNavSection = useActiveNavSection()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { theme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  const navItemsForUser = React.useMemo(
    () => filterNavItemsForUser(NAVIGATION_ITEMS, user?.permissions),
    [user?.permissions],
  )

  React.useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const closeMobileNav = React.useCallback(() => setMobileNavOpen(false), [])

  const handleLogout = React.useCallback(async () => {
    try {
      await dashboardApi.logout()
    } catch (err) {
      console.error('Logout failed', err)
    } finally {
      logout()
      void navigate(PATHS.login)
    }
  }, [logout, navigate])

  const openMobileNav = React.useCallback(() => setMobileNavOpen(true), [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation-sheet"
            onClick={openMobileNav}
          >
            <Menu className="size-5" />
          </Button>

          <Link to={PATHS.dashboard}>
            <img
              src={
                siteDomain === 'nexa'
                  ? theme === 'dark'
                    ? logoNexaDark
                    : logoNexaLight
                  : theme === 'dark'
                    ? logoHeaderDark
                    : logoHeaderLight
              }
              alt={siteDomain === 'ticollab' ? 'Ticollab' : 'Nexa'}
              className="h-5 w-auto object-contain object-left md:h-6"
            />
          </Link>

          <NavigationMenu className="hidden md:flex" viewport={false}>
            <NavigationMenuList className="gap-6">
              {navItemsForUser.map((item) => {
                const groupActive =
                  navGroupIsActive(item, activeNavSection) ||
                  navGroupHasActiveChild(item, location.pathname)

                if (!item.items?.length) {
                  if (!item.href) {
                    return null
                  }
                  const ItemIcon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <NavigationMenuItem key={item.name}>
                      <NavigationMenuLink asChild>
                        <NavLink
                          to={item.href}
                          className={cn(
                            navTabBase,
                            isActive ? navTabActive : navTabInactive,
                            'bg-transparent! focus:bg-transparent! data-[state=open]:bg-transparent! data-active:bg-transparent!',
                          )}
                        >
                          {ItemIcon && <ItemIcon className="size-3.5 shrink-0" aria-hidden />}
                          {item.name}
                        </NavLink>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  )
                }

                const ParentIcon = item.icon
                return (
                  <NavigationMenuItem key={item.name}>
                    <NavigationMenuTrigger
                      className={cn(
                        navTabBase,
                        groupActive ? navTabActive : navTabInactive,
                        'h-auto bg-transparent! focus:bg-transparent! data-[state=open]:bg-transparent! data-active:bg-transparent!',
                      )}
                    >
                      {ParentIcon && (
                        <ParentIcon className="size-3.5 shrink-0 mr-1.5" aria-hidden />
                      )}
                      {item.name}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="flex min-w-48 w-auto flex-col gap-0 p-1">
                        {item.items.map((sub) => (
                          <li key={sub.href}>
                            <DesktopNavSubLink sub={sub} />
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            id="mobile-navigation-sheet"
            className="flex w-[min(100%,20rem)] flex-col gap-0 overflow-y-auto p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
              <Link to={PATHS.dashboard}>
                <img
                  src={
                    siteDomain === 'nexa'
                      ? theme === 'dark'
                        ? logoNexaDark
                        : logoNexaLight
                      : theme === 'dark'
                        ? logoHeaderDark
                        : logoHeaderLight
                  }
                  alt={siteDomain === 'ticollab' ? 'Ticollab' : 'Nexa'}
                  className="h-5 w-auto object-contain object-left md:h-6"
                />
              </Link>
              <SheetDescription className="sr-only">
                Main navigation links and submenus
              </SheetDescription>
            </SheetHeader>
            <MobileNav
              activeNavSection={activeNavSection}
              onNavigate={closeMobileNav}
              items={navItemsForUser}
            />
          </SheetContent>
        </Sheet>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-2 p-2">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void handleLogout()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
})
