import { CampaignListTable } from '@/features/new-campaign/components/CampaignListTable'
import { CampaignOffersTable } from '@/features/new-campaign/components/CampaignOffersTable'
import { CampaignReportTable } from '@/features/new-campaign/components/CampaignReportTable'
import { CampaignViewSwitcher } from '@/features/new-campaign/components/CampaignViewSwitcher'
import {
  useCampaignWorkspaceActions,
  useCampaignWorkspaceState,
} from '@/features/new-campaign/components/CampaignWorkspaceProvider'
import type { WorkspaceView } from '@/features/new-campaign/types'

export function CampaignWorkspaceContent() {
  const { activeTabId, homeView, isReady, tabs } = useCampaignWorkspaceState()
  const { setCampaignView, setHomeView } = useCampaignWorkspaceActions()

  if (!isReady)
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Restoring workspace...</div>
    )

  if (activeTabId === 'home') {
    return (
      <>
        <CampaignViewSwitcher activeView={homeView} allowCampaigns onViewChange={setHomeView} />
        <HomeTable view={homeView} />
      </>
    )
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  if (!activeTab) return <CampaignListTable />
  return (
    <>
      <CampaignViewSwitcher
        activeView={activeTab.view}
        allowCampaigns={false}
        onViewChange={(view) =>
          setCampaignView(activeTab.id, view as Exclude<WorkspaceView, 'campaigns'>)
        }
      />
      {activeTab.view === 'offers' ? (
        <CampaignOffersTable campaign={activeTab.campaign} urlScope={`tab_${activeTab.id}`} />
      ) : (
        <CampaignReportTable campaign={activeTab.campaign} urlScope={`tab_${activeTab.id}`} />
      )}
    </>
  )
}

function HomeTable({ view }: { view: WorkspaceView }) {
  if (view === 'campaigns') return <CampaignListTable />
  if (view === 'offers') return <CampaignOffersTable urlScope="home" />
  return <CampaignReportTable urlScope="home" />
}
