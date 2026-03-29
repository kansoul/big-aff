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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { NAVIGATION_ITEMS, type NavItem, type NavSubItem } from '@/constants/header'
import { hasPermission } from '@/constants/permissions'
import { dashboardApi } from '@/features/dashboard/api'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useTheme } from '@/hooks/useTheme'

import logoHeaderDark from '@/assets/logo-s-white.png'
import logoHeaderLight from '@/assets/logo-s-red.png'
import { cn } from '@/lib/utils'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

/** Brand red: active page / tab in main nav */
const navTabActive = 'text-red-600 border-b-2 border-red-600 dark:text-red-400 dark:border-red-400'
const navTabInactive =
  'text-muted-foreground border-b-2 border-transparent hover:text-red-600 dark:hover:text-red-400'
const navTabBase =
  'inline-flex items-center gap-1.5 border-b-2 border-transparent py-2 text-xs font-semibold tracking-wider transition-colors'
const navSubActive = 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'

function navItemActive(pathname: string, item: NavItem): boolean {
  if (item.items?.length) {
    const parentPrefix = item.href ?? ''
    return (
      (item.href ? pathname.startsWith(item.href) : false) ||
      item.items.some((sub) => subPathActive(pathname, sub, parentPrefix))
    )
  }
  return item.href ? pathname.startsWith(item.href) : false
}

function subPathActive(pathname: string, sub: NavSubItem, parentHref: string): boolean {
  if (sub.href === parentHref) {
    return pathname === sub.href || pathname === `${sub.href}/`
  }
  return pathname === sub.href || pathname.startsWith(`${sub.href}/`)
}

function hasNavigableParentHref(item: NavItem): item is NavItem & { href: string } {
  return Boolean(item.href)
}

function filterNavItemsForUser(items: NavItem[], scopes: string[] | undefined): NavItem[] {
  return items
    .map((item) => {
      if (!item.items?.length) {
        return item
      }
      const filteredItems = item.items.filter(
        (sub) => !sub.requiredPermission || hasPermission(scopes, sub.requiredPermission),
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
  pathname,
  onNavigate,
  items,
}: {
  pathname: string
  onNavigate: () => void
  items: NavItem[]
}) {
  return (
    <nav className="flex flex-col gap-1 px-2 pb-6" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = navItemActive(pathname, item)
        const linkClass = (active: boolean) =>
          cn(
            'flex items-center gap-2.5 rounded-md px-3 py-3 text-sm font-semibold tracking-wide transition-colors',
            active ? navSubActive : 'text-foreground hover:bg-accent/50',
          )

        if (!item.items?.length) {
          if (!item.href) {
            return null
          }
          const MobileLeafIcon = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={linkClass(isActive)}
            >
              <MobileLeafIcon className="size-4 shrink-0 opacity-80" aria-hidden />
              {item.name}
            </Link>
          )
        }

        const parentNavigable = hasNavigableParentHref(item)
        const MobileParentIcon = item.icon

        return (
          <Collapsible
            key={item.name}
            defaultOpen={isActive}
            className="group/collapsible overflow-hidden rounded-md border border-border/60 bg-background"
          >
            <div className="flex items-stretch border-b border-border/40">
              {parentNavigable ? (
                <>
                  <Link
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex min-h-12 flex-1 items-center gap-2.5 px-3 text-sm font-semibold tracking-wide',
                      navItemActive(pathname, item)
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-foreground',
                    )}
                  >
                    <MobileParentIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                    {item.name}
                  </Link>
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
                      'flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold tracking-wide',
                      navItemActive(pathname, item)
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-foreground',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <MobileParentIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                      {item.name}
                    </span>
                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
            <CollapsibleContent>
              <ul className="flex flex-col divide-y divide-border/50 bg-muted/30">
                {item.items.map((sub) => {
                  const subActive = subPathActive(pathname, sub, item.href ?? '')
                  const MobileSubIcon = sub.icon
                  return (
                    <li key={sub.href} className="min-w-0">
                      <Link
                        to={sub.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium tracking-wide',
                          subActive ? navSubActive : 'text-foreground hover:bg-accent/40',
                        )}
                      >
                        <MobileSubIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                        <span className="min-w-0 flex-1 text-left">{sub.name}</span>
                      </Link>
                    </li>
                  )
                })}
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
      void navigate('/login')
    }
  }, [logout, navigate])

  const openMobileNav = React.useCallback(() => setMobileNavOpen(true), [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4 md:px-8">
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

          <Link to="/dashboard" className="flex min-w-0 items-center">
            <img
              src={theme === 'dark' ? logoHeaderDark : logoHeaderLight}
              alt="TiCOLLAB"
              className="h-7 w-auto max-w-[min(100%,12rem)] object-contain object-left md:h-8"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItemsForUser.map((item) => {
              const isActive = navItemActive(location.pathname, item)
              const activeClass = isActive ? navTabActive : navTabInactive

              if (!item.items?.length) {
                if (!item.href) {
                  return null
                }
                const ItemIcon = item.icon
                return (
                  <Link key={item.name} to={item.href} className={cn(navTabBase, activeClass)}>
                    <ItemIcon className="size-3.5 shrink-0" aria-hidden />
                    {item.name}
                  </Link>
                )
              }

              if (!hasNavigableParentHref(item)) {
                const ParentIcon = item.icon
                return (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          navTabBase,
                          activeClass,
                          'cursor-pointer border-none bg-transparent font-inherit',
                        )}
                        aria-haspopup="menu"
                      >
                        <ParentIcon className="size-3.5 shrink-0" aria-hidden />
                        {item.name}
                        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="flex min-w-48 w-auto flex-col gap-0 p-1"
                    >
                      {item.items.map((sub) => {
                        const subActive = subPathActive(location.pathname, sub, item.href ?? '')
                        const SubIcon = sub.icon
                        return (
                          <DropdownMenuItem key={sub.href} asChild className="w-full">
                            <Link
                              to={sub.href}
                              className={cn(
                                'flex min-h-9 w-full cursor-pointer items-center gap-2 px-2 py-1.5',
                                subActive && navSubActive,
                              )}
                            >
                              <SubIcon className="size-4 shrink-0 opacity-70" aria-hidden />
                              <span className="min-w-0 flex-1 text-left">{sub.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }

              const HoverParentIcon = item.icon
              return (
                <div key={item.name} className="group relative">
                  <Link to={item.href} className={cn(navTabBase, activeClass)} aria-haspopup="menu">
                    <HoverParentIcon className="size-3.5 shrink-0" aria-hidden />
                    {item.name}
                    <ChevronDown
                      className="size-3.5 opacity-60 transition-transform group-hover:rotate-180"
                      aria-hidden
                    />
                  </Link>
                  <div
                    className="pointer-events-none invisible absolute left-0 top-full z-50 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
                    role="menu"
                    aria-label={`${item.name} submenu`}
                  >
                    <ul
                      className="flex min-w-48 flex-col divide-y divide-border/60 rounded-md border bg-popover p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10"
                      role="none"
                    >
                      {item.items.map((sub) => {
                        const subActive = subPathActive(location.pathname, sub, item.href)
                        const HoverSubIcon = sub.icon
                        return (
                          <li key={sub.href} className="min-w-0" role="none">
                            <Link
                              role="menuitem"
                              to={sub.href}
                              className={cn(
                                'flex min-h-9 w-full items-center gap-2 px-3 py-2 text-sm font-medium tracking-wide transition-colors hover:bg-red-50 dark:hover:bg-red-950/30',
                                subActive ? navSubActive : 'text-foreground',
                              )}
                            >
                              <HoverSubIcon className="size-4 shrink-0 opacity-70" aria-hidden />
                              <span className="min-w-0 flex-1 text-left">{sub.name}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              )
            })}
          </nav>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            id="mobile-navigation-sheet"
            className="flex w-[min(100%,20rem)] flex-col gap-0 overflow-y-auto p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Main navigation links and submenus
              </SheetDescription>
            </SheetHeader>
            <MobileNav
              pathname={location.pathname}
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
