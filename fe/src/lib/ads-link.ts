const FB_URL_PARAMS = '?campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&tt=fb'
const GOOGLE_URL_PARAMS = '?campaign_id={campaignid}&adset_id={adgroupid}&ad_id={creative}&tt=gg'

export function buildCopyLink(siteUrl: string, slug: string, platform: 'facebook' | 'google'): string {
  const base = siteUrl.replace(/\/$/, '')
  const params = platform === 'facebook' ? FB_URL_PARAMS : GOOGLE_URL_PARAMS
  return `${base}/articles/${slug}${params}`
}
