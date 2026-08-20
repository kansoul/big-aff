export type LinkPlatform = 'facebook' | 'google' | 'tiktok'

const PLATFORM_PARAMS: Record<LinkPlatform, Record<string, string>> = {
  facebook: {
    campaign_id: '{{campaign.id}}',
    adset_id: '{{adset.id}}',
    ad_id: '{{ad.id}}',
    tt: 'fb',
  },
  google: {
    campaign_id: '{campaignid}',
    adset_id: '{adgroupid}',
    ad_id: '{creative}',
    tt: 'gg',
  },
  tiktok: {
    campaign_id: '__CAMPAIGN_ID__',
    adset_id: '__AID__',
    ad_id: '__CID__',
    tt: 'tt',
  },
}

export function buildTrackingLink(
  rawUrl: string,
  trackingCode: string,
  platform: LinkPlatform,
): string {
  const url = new URL(rawUrl)

  Object.entries(PLATFORM_PARAMS[platform]).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  url.searchParams.set('tracking_code', trackingCode)

  return url
    .toString()
    .replaceAll('%7B%7Bcampaign.id%7D%7D', '{{campaign.id}}')
    .replaceAll('%7B%7Badset.id%7D%7D', '{{adset.id}}')
    .replaceAll('%7B%7Bad.id%7D%7D', '{{ad.id}}')
    .replaceAll('%7Bcampaignid%7D', '{campaignid}')
    .replaceAll('%7Badgroupid%7D', '{adgroupid}')
    .replaceAll('%7Bcreative%7D', '{creative}')
}
