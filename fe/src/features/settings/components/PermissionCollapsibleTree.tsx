import { type Dispatch, type SetStateAction } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PERMISSION_CATALOG, type PermissionCluster } from '@/constants/permissions'

function toggleBit(mask: number, bit: number, on: boolean): number {
  if (on) {
    return mask | bit
  }
  return mask & ~bit
}

function screenBitsMask(screen: PermissionCluster['screens'][number]): number {
  return screen.permissions.reduce((acc, p) => acc | p.bit, 0)
}

function clusterBitsMask(cluster: PermissionCluster): number {
  return cluster.screens.reduce((acc, s) => acc | screenBitsMask(s), 0)
}

/** Radix: `indeterminate` when some but not all bits in `groupMask` are set. */
function groupCheckboxState(mask: number, groupMask: number): boolean | 'indeterminate' {
  if (groupMask === 0) {
    return false
  }
  const on = mask & groupMask
  if (on === 0) {
    return false
  }
  if (on === groupMask) {
    return true
  }
  return 'indeterminate'
}

function applyGroupToMask(mask: number, groupMask: number, checked: boolean): number {
  if (checked) {
    return mask | groupMask
  }
  return mask & ~groupMask
}

type PermissionCollapsibleTreeProps = {
  mask: number
  setMask: Dispatch<SetStateAction<number>>
}

export function PermissionCollapsibleTree({ mask, setMask }: PermissionCollapsibleTreeProps) {
  const toggleLeaf = (bit: number, checked: boolean) => {
    setMask((prev) => toggleBit(prev, bit, checked))
  }

  return (
    <div className="space-y-2">
      {PERMISSION_CATALOG.map((cluster) => {
        const clusterMask = clusterBitsMask(cluster)
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
                checked={groupCheckboxState(mask, clusterMask)}
                onCheckedChange={(state) => {
                  const on = state === true
                  setMask((m) => applyGroupToMask(m, clusterMask, on))
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
                  const screenMask = screenBitsMask(screen)
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
                          checked={groupCheckboxState(mask, screenMask)}
                          onCheckedChange={(state) => {
                            const on = state === true
                            setMask((m) => applyGroupToMask(m, screenMask, on))
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
                                checked={(mask & p.bit) === p.bit}
                                onCheckedChange={(state) => {
                                  toggleLeaf(p.bit, state === true)
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
