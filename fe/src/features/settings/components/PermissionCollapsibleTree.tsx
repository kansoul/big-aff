import { type Dispatch, type SetStateAction, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { PERMISSION_CATALOG } from '@/constants/permissions'

function toggleSlug(selected: string[], slug: string, on: boolean): string[] {
  if (on) {
    return [...new Set([...selected, slug])]
  }
  return selected.filter((s) => s !== slug)
}

function groupCheckboxState(selected: string[], groupSlugs: string[]): boolean | 'indeterminate' {
  if (groupSlugs.length === 0) {
    return false
  }
  const set = new Set(selected)
  const onCount = groupSlugs.filter((s) => set.has(s)).length
  if (onCount === 0) {
    return false
  }
  if (onCount === groupSlugs.length) {
    return true
  }
  return 'indeterminate'
}

function applyGroupToSelected(
  selected: string[],
  groupSlugs: string[],
  checked: boolean,
): string[] {
  if (checked) {
    return [...new Set([...selected, ...groupSlugs])]
  }
  const drop = new Set(groupSlugs)
  return selected.filter((s) => !drop.has(s))
}

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700/60 rounded-[2px] px-0">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

type PermissionCollapsibleTreeProps = {
  selected: string[]
  setSelected: Dispatch<SetStateAction<string[]>>
  /** When provided, only permissions in this list are shown. null/undefined = no restriction. */
  allowedPermissions?: string[] | null
}

export function PermissionCollapsibleTree({
  selected,
  setSelected,
  allowedPermissions,
}: PermissionCollapsibleTreeProps) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim().toLowerCase()

  const isAllowed = (slug: string) =>
    allowedPermissions == null || allowedPermissions.includes(slug)

  const matchesQuery = (label: string) => !trimmed || label.toLowerCase().includes(trimmed)

  const toggleLeaf = (slug: string, checked: boolean) => {
    setSelected((prev) => toggleSlug(prev, slug, checked))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search permissions…"
          className="h-8 pl-8 pr-8 text-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Tree */}
      <div className="space-y-2">
        {PERMISSION_CATALOG.map((cluster) => {
          const visibleScreens = cluster.screens
            .map((screen) => ({
              ...screen,
              permissions: screen.permissions.filter(
                (p) =>
                  isAllowed(p.slug) &&
                  (matchesQuery(p.label) ||
                    matchesQuery(screen.label) ||
                    matchesQuery(cluster.label)),
              ),
            }))
            .filter((screen) => screen.permissions.length > 0)

          if (visibleScreens.length === 0) return null

          const visibleClusterSlugs = visibleScreens.flatMap((s) =>
            s.permissions.map((p) => p.slug),
          )
          const isSearching = !!trimmed

          return (
            <Collapsible
              key={cluster.id}
              open={isSearching ? true : undefined}
              defaultOpen
              className="group/cluster rounded-md border border-border/70 bg-muted/15"
            >
              <div className="flex items-center justify-center gap-2 px-1.5 py-1">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Expand or collapse ${cluster.label}`}
                  >
                    <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]/cluster:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <Checkbox
                  className="shrink-0 rounded-[4px]"
                  checked={groupCheckboxState(selected, visibleClusterSlugs)}
                  onCheckedChange={(state) => {
                    const on = state === true
                    setSelected((prev) => applyGroupToSelected(prev, visibleClusterSlugs, on))
                  }}
                />
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="min-w-0 flex-1 h-full rounded-sm py-0.5 pr-1 text-left text-sm font-bold leading-tight tracking-widest uppercase text-muted-foreground hover:bg-muted/50"
                  >
                    {highlight(cluster.label, trimmed)}
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="overflow-hidden border-t border-border/50 bg-background/60">
                <div className="space-y-1.5 px-1.5 pb-2 pt-1.5 pl-2">
                  {visibleScreens.map((screen) => {
                    const visibleScreenSlugs = screen.permissions.map((p) => p.slug)
                    return (
                      <Collapsible
                        key={screen.id}
                        open={isSearching ? true : undefined}
                        defaultOpen
                        className="group/screen rounded-md border border-border/50 bg-muted/10"
                      >
                        <div className="flex items-start gap-0.5 px-1 py-0.5">
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-0.5 size-6 shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Expand or collapse ${screen.label}`}
                            >
                              <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]/screen:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                          <Checkbox
                            className="mt-1.5 shrink-0 rounded-[4px] mr-1 ml-2"
                            checked={groupCheckboxState(selected, visibleScreenSlugs)}
                            onCheckedChange={(state) => {
                              const on = state === true
                              setSelected((prev) =>
                                applyGroupToSelected(prev, visibleScreenSlugs, on),
                              )
                            }}
                          />
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="min-w-0 mt-1.5 flex-1 rounded-sm py-0.5 pr-1 text-left text-xs font-semibold leading-tight text-foreground/90 hover:bg-muted/50"
                            >
                              {highlight(screen.label, trimmed)}
                            </button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="overflow-hidden">
                          <div className="mb-1 space-y-0 border-l border-border/60 pl-3 ml-4 mr-1">
                            {screen.permissions.map((p) => (
                              <div
                                key={p.key}
                                className="flex items-start gap-2.5 rounded-sm py-1 pr-1 hover:bg-muted/40 ml-6"
                              >
                                <Checkbox
                                  className="shrink-0 rounded-[4px]"
                                  checked={selected.includes(p.slug)}
                                  onCheckedChange={(state) => {
                                    toggleLeaf(p.slug, state === true)
                                  }}
                                />
                                <div className="min-w-0 text-xs leading-tight">
                                  <span className="font-xs">{highlight(p.label, trimmed)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}

        {trimmed &&
          PERMISSION_CATALOG.every((cluster) =>
            cluster.screens.every((screen) =>
              screen.permissions.every(
                (p) =>
                  !isAllowed(p.slug) ||
                  (!matchesQuery(p.label) &&
                    !matchesQuery(screen.label) &&
                    !matchesQuery(cluster.label)),
              ),
            ),
          ) && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No permissions match &ldquo;{query.trim()}&rdquo;
            </p>
          )}
      </div>
    </div>
  )
}
