import {
  CampaignWorkspaceContent,
  CampaignWorkspaceProvider,
  CampaignWorkspaceTabs,
} from '@/features/new-campaign/components'

export function NewCampaignPage() {
  return (
    <CampaignWorkspaceProvider>
      <section className="new-campaign-workspace">
        <CampaignWorkspaceTabs />
        <CampaignWorkspaceContent />
      </section>
    </CampaignWorkspaceProvider>
  )
}
