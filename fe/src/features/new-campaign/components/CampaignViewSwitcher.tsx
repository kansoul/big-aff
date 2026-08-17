import { memo } from 'react'
import { ListFilter, Megaphone, MousePointerClick } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkspaceView } from '@/features/new-campaign/types'

type CampaignViewSwitcherProps = {
  activeView: WorkspaceView
  allowCampaigns: boolean
  onViewChange: (view: WorkspaceView) => void
}

const VIEWS: { id: WorkspaceView; label: string; icon: typeof Megaphone }[] = [
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'offers', label: 'Offers', icon: ListFilter },
  { id: 'click-ids', label: 'Click ID', icon: MousePointerClick },
]

function CampaignViewSwitcherInner({
  activeView,
  allowCampaigns,
  onViewChange,
}: CampaignViewSwitcherProps) {
  return (
    <div
      className="mb-3 flex items-center gap-1 border-b border-border pb-3"
      aria-label="Table views"
    >
      {VIEWS.filter((view) => allowCampaigns || view.id !== 'campaigns').map((view) => {
        const Icon = view.icon
        return (
          <Button
            key={view.id}
            type="button"
            size="sm"
            variant={activeView === view.id ? 'default' : 'outline'}
            className={cn('h-8 gap-1.5 text-xs', activeView !== view.id && 'bg-background')}
            aria-pressed={activeView === view.id}
            onClick={() => onViewChange(view.id)}
          >
            <Icon className="size-3.5" aria-hidden />
            {view.label}
          </Button>
        )
      })}
    </div>
  )
}

export const CampaignViewSwitcher = memo(CampaignViewSwitcherInner)
