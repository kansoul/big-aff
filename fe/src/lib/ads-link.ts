const GOOGLE_URL_PARAMS = '?campaign_id={campaignid}&adset_id={adgroupid}&ad_id={creative}&tt=gg'
const TIKTOK_URL_PARAMS = '?campaign_id=__CAMPAIGN_ID__&adset_id=__AID__&ad_id=__CID__&tt=tt'

const URL_PARAMS: Record<'google' | 'tiktok', string> = {
  google: GOOGLE_URL_PARAMS,
  tiktok: TIKTOK_URL_PARAMS,
}

export function buildCopyLink(
  siteUrl: string,
  slug: string,
  platform: 'google' | 'tiktok',
): string {
  const base = siteUrl.replace(/\/$/, '')
  return `${base}/articles/${slug}${URL_PARAMS[platform]}`
}
