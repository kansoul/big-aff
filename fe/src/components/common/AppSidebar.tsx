import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronsLeft, ChevronsRight, Menu } from 'lucide-react'
import { NavLink, useMatch } from 'react-router-dom'

import {
  AccountSwitcher,
  AddAccountButton,
  SwitchAccountMenu,
} from '@/components/common/AccountSwitcher'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { NAVIGATION_ITEMS, type NavItem, type NavSubItem } from '@/constants/header'
import { hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useIsMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'big_aff_sidebar_collapsed'
const SIDEBAR_WIDTH_EXPANDED = 'w-64'
const SIDEBAR_WIDTH_COLLAPSED = 'w-[4.5rem]'

function readStoredCollapsed(): boolean {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

function filterNavItems(items: NavItem[], user: ReturnType<typeof useAuthStore.getState>['user']) {
  return items
    .map((item) => ({
      ...item,
      items: item.items?.filter((sub) => {
        if (sub.adminOnly && !user?.is_admin) return false
        if (sub.mainSystemOnly && !user?.is_main_system) return false
        return !sub.requiredPermission || hasPermission(user?.permissions, sub.requiredPermission)
      }),
    }))
    .filter((item) => !item.items || item.items.length > 0)
}

function SidebarNavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavSubItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const isActive = Boolean(useMatch({ path: item.href, end: false }))
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left py-3">{item.name}</span>}
    </NavLink>
  )

  if (!collapsed) {
    return link
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={8}>
        {item.name}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user)
  const items = useMemo(() => filterNavItems(NAVIGATION_ITEMS, user), [user])

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto p-3" aria-label="Main navigation">
        {items.map((item) => {
          if (!item.items?.length && item.href && item.icon) {
            return (
              <ul key={item.href} className="flex flex-col gap-1 py-1">
                <li>
                  <SidebarNavLink
                    item={{ name: item.name, href: item.href, icon: item.icon }}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              </ul>
            )
          }

          return (
            <div key={item.name}>
              {!collapsed && (
                <h2 className="mb-2 px-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  {item.name}
                </h2>
              )}
              <ul className="flex flex-col gap-1">
                {item.items?.map((sub) => (
                  <li key={sub.href}>
                    <SidebarNavLink item={sub} collapsed={collapsed} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}

function SidebarHeader({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
}) {
  const toggleButton = onToggleCollapse && (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('size-9 shrink-0 rounded-lg', collapsed && 'w-full')}
      aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
      title={collapsed ? 'Expand menu' : 'Collapse menu'}
      onClick={onToggleCollapse}
    >
      {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
    </Button>
  )

  return (
    <div className="flex flex-col gap-3 border-b border-border/70 p-3">
      <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between')}>
        <div className="min-w-0 flex-1">
          <AccountSwitcher align="start" collapsed={collapsed} />
        </div>
        <ThemeToggle />
      </div>
      {collapsed ? (
        toggleButton
      ) : (
        <div className="flex items-center gap-1.5">
          <AddAccountButton />
          <SwitchAccountMenu />
          {toggleButton}
        </div>
      )}
    </div>
  )
}

function AppSidebarInner() {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const toggleCollapse = useCallback(() => setCollapsed((previous) => !previous), [])

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="fixed top-2 left-2 z-50 size-9 shrink-0 bg-background/90 shadow-xs backdrop-blur-xl"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="flex w-64 flex-col gap-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Main navigation</SheetDescription>
            </SheetHeader>
            <SidebarHeader collapsed={false} />
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-svh shrink-0 flex-col border-r border-border/70 bg-background transition-[width] duration-200 ease-linear',
        collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <SidebarNav collapsed={collapsed} />
    </aside>
  )
}

export const AppSidebar = memo(AppSidebarInner)
