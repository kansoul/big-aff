import { memo, useCallback } from 'react'
import { BarChart3, Megaphone, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CampaignReportWorkspaceTab = {
  id: string
  campaignId: string
  campaignName: string
}

type Props = {
  activeTabId: string
  tabs: CampaignReportWorkspaceTab[]
  onActivateTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
}

function CampaignReportWorkspaceTabsInner({ activeTabId, tabs, onActivateTab, onCloseTab }: Props) {
  const handleClose = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, tabId: string) => {
      event.stopPropagation()
      onCloseTab(tabId)
    },
    [onCloseTab],
  )

  return (
    <div className="border-b border-border/80 bg-muted/15">
      <div className="min-w-0 overflow-x-auto" role="tablist" aria-label="Campaign report tabs">
        <div className="tab-container flex min-h-10 min-w-max items-end gap-1 pt-1.5 overflow-y-hidden">
          <button
            type="button"
            role="tab"
            aria-selected={activeTabId === 'home'}
            onClick={() => onActivateTab('home')}
            className={cn(
              'relative -mb-px flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border border-b-0 px-3 text-xs font-semibold transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeTabId === 'home'
                ? 'z-10 border-border bg-card text-foreground shadow-[0_-1px_1px_rgb(0_0_0_/_0.12)]'
                : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <BarChart3 className="size-3.5" aria-hidden />
            DAILY CAMPAIGN REPORTS
          </button>
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id
            return (
              <div
                key={tab.id}
                className={cn(
                  'group relative -mb-px flex h-9 max-w-64 shrink-0 items-center rounded-t-lg border border-b-0 text-xs transition-colors',
                  isActive
                    ? 'z-10 border-border bg-card text-foreground shadow-[0_-1px_1px_rgb(0_0_0_/_0.12)]'
                    : 'border-transparent bg-muted/25 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={tab.campaignName}
                  onClick={() => onActivateTab(tab.id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-3 py-2 text-left focus-visible:outline-none"
                >
                  <Megaphone className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{tab.campaignName}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mr-1 size-5 shrink-0 cursor-pointer rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Close ${tab.campaignName}`}
                  onClick={(event) => handleClose(event, tab.id)}
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const CampaignReportWorkspaceTabs = memo(CampaignReportWorkspaceTabsInner)
