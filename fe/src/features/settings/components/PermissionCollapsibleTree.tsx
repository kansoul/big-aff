import { type Dispatch, type SetStateAction } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PERMISSION_CATALOG, type PermissionCluster } from '@/constants/permissions'

function toggleSlug(selected: string[], slug: string, on: boolean): string[] {
  if (on) {
    return [...new Set([...selected, slug])]
  }
  return selected.filter((s) => s !== slug)
}

function screenSlugsMask(screen: PermissionCluster['screens'][number]): string[] {
  return screen.permissions.map((p) => p.slug)
}

function clusterSlugsMask(cluster: PermissionCluster): string[] {
  return cluster.screens.flatMap((s) => screenSlugsMask(s))
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

type PermissionCollapsibleTreeProps = {
  selected: string[]
  setSelected: Dispatch<SetStateAction<string[]>>
}

export function PermissionCollapsibleTree({
  selected,
  setSelected,
}: PermissionCollapsibleTreeProps) {
  const toggleLeaf = (slug: string, checked: boolean) => {
    setSelected((prev) => toggleSlug(prev, slug, checked))
  }

  return (
    <div className="space-y-2">
      {PERMISSION_CATALOG.map((cluster) => {
        const clusterSlugs = clusterSlugsMask(cluster)
        return (
          <Collapsible
            key={cluster.id}
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
                checked={groupCheckboxState(selected, clusterSlugs)}
                onCheckedChange={(state) => {
                  const on = state === true
                  setSelected((prev) => applyGroupToSelected(prev, clusterSlugs, on))
                }}
              />
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="min-w-0 flex-1 h-full rounded-sm py-0.5 pr-1 text-left text-sm font-bold leading-tight tracking-widest uppercase text-muted-foreground hover:bg-muted/50"
                >
                  {cluster.label}
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="overflow-hidden border-t border-border/50 bg-background/60">
              <div className="space-y-1.5 px-1.5 pb-2 pt-1.5 pl-2">
                {cluster.screens.map((screen) => {
                  const screenSlugs = screenSlugsMask(screen)
                  return (
                    <Collapsible
                      key={screen.id}
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
                          checked={groupCheckboxState(selected, screenSlugs)}
                          onCheckedChange={(state) => {
                            const on = state === true
                            setSelected((prev) => applyGroupToSelected(prev, screenSlugs, on))
                          }}
                        />
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="min-w-0 mt-1.5 flex-1 rounded-sm py-0.5 pr-1 text-left text-xs font-semibold leading-tight text-foreground/90 hover:bg-muted/50"
                          >
                            {screen.label}
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
                                <span className="font-xs">{p.label}</span>
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
    </div>
  )
}
