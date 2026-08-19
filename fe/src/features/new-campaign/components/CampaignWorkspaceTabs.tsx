import { memo, useCallback } from 'react'
import { LayoutGrid, Megaphone, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useCampaignWorkspaceActions,
  useCampaignWorkspaceState,
} from '@/features/new-campaign/components/CampaignWorkspaceProvider'

function CampaignWorkspaceTabsInner() {
  const { activeTabId, tabs } = useCampaignWorkspaceState()
  const { activateTab, closeTab } = useCampaignWorkspaceActions()

  const onClose = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, tabId: string) => {
      event.stopPropagation()
      closeTab(tabId)
    },
    [closeTab],
  )

  return (
    <div className="-mx-2 -mt-4 mb-4 border-b border-border bg-muted/35 md:-mx-4" role="tablist">
      <div className="flex min-h-11 min-w-max items-end overflow-x-auto px-2 pt-2 md:px-4">
        <button
          type="button"
          role="tab"
          aria-selected={activeTabId === 'home'}
          onClick={() => activateTab('home')}
          className={cn(
            'flex h-9 items-center gap-2 border border-b-0 px-3 text-xs font-semibold transition-colors',
            activeTabId === 'home'
              ? 'bg-background text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground',
          )}
        >
          <LayoutGrid className="size-3.5" aria-hidden />
          HOME
        </button>
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={tab.campaign.campaign_name}
              onClick={() => activateTab(tab.id)}
              className={cn(
                'group flex h-9 max-w-76 items-center gap-2 border border-b-0 pl-3 pr-1.5 text-left text-xs transition-colors',
                isActive
                  ? 'bg-background text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground',
              )}
            >
              <Megaphone className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{tab.campaign.campaign_name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Close ${tab.campaign.campaign_name}`}
                onClick={(event) => onClose(event, tab.id)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const CampaignWorkspaceTabs = memo(CampaignWorkspaceTabsInner)
