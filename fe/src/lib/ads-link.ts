const FB_URL_PARAMS = '?campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&tt=fb'
const GOOGLE_URL_PARAMS = '?campaign_id={campaignid}&adset_id={adgroupid}&ad_id={creative}&tt=gg'
const TIKTOK_URL_PARAMS = '?campaign_id=__CAMPAIGN_ID__&adset_id=__AID__&ad_id=__CID__&tt=tt'

const URL_PARAMS: Record<'facebook' | 'google' | 'tiktok', string> = {
  facebook: FB_URL_PARAMS,
  google: GOOGLE_URL_PARAMS,
  tiktok: TIKTOK_URL_PARAMS,
}

export function buildCopyLink(
  siteUrl: string,
  slug: string,
  platform: 'facebook' | 'google' | 'tiktok',
): string {
  const base = siteUrl.replace(/\/$/, '')
  return `${base}/articles/${slug}${URL_PARAMS[platform]}`
}
