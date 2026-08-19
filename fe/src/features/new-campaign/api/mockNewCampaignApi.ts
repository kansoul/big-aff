import type {
  CampaignListFilters,
  CampaignListResponse,
  CampaignReportFilters,
  CampaignReportResponse,
  CampaignReportRow,
  CampaignRow,
  ClickIdChartPoint,
  OfferListFilters,
  OfferListResponse,
  OfferRow,
} from '@/features/new-campaign/types'

const RESPONSE_DELAY_MS = 280

const CAMPAIGNS: CampaignRow[] = [
  {
    campaign_id: '53605677-833f-4d6c-a45c-438d6022c3c0',
    campaign_name: 'TikTok - United States - IH Speedyliveus LP V2 PrePop TICOHN',
    external_campaign_id: '7298216145801204011',
    conversions: 41,
    revenue: 95.39,
    ctr: 2.84,
  },
  {
    campaign_id: '076a4059-74e8-4465-a53a-ebc313647a37',
    campaign_name: 'TikTok - United States - IH Speedyliveus LP V2 PrePop TICO 1',
    external_campaign_id: '7298216145801204012',
    conversions: 28,
    revenue: 64.72,
    ctr: 2.16,
  },
  {
    campaign_id: '8f86f6f8-ccd3-47e5-ad58-92070d02da32',
    campaign_name: 'TikTok - Global - MNT_10k$-2',
    external_campaign_id: '7298216145801204013',
    conversions: 17,
    revenue: 48.2,
    ctr: 1.92,
  },
  {
    campaign_id: '1c50ae1f-48c5-4b6b-9941-be179566e051',
    campaign_name: 'TikTok - Global - MNT_10K$ -1',
    external_campaign_id: '7298216145801204014',
    conversions: 0,
    revenue: 0,
    ctr: 1.44,
  },
  {
    campaign_id: '1ff4ae2f-3dc5-422f-8f57-2541936dedd4',
    campaign_name: 'TikTok - Global - LXBQPLTT LP - ctv - Direct',
    external_campaign_id: null,
    conversions: 9,
    revenue: 23.18,
    ctr: 1.7,
  },
  {
    campaign_id: '2e6e2121-6e15-43bd-9219-8c1468e24a88',
    campaign_name: 'TikTok - Global - IH Speedylive SPLTT1 Direct TICOHN',
    external_campaign_id: '7298216145801204016',
    conversions: 12,
    revenue: 31.95,
    ctr: 2.35,
  },
  {
    campaign_id: '1df35b7b-bac0-4d63-b92b-bad6b79508f7',
    campaign_name: 'TikTok - Global - IH Speedylive SPLTT1 Direct TICO 1',
    external_campaign_id: '7298216145801204017',
    conversions: 6,
    revenue: 14.5,
    ctr: 1.18,
  },
  {
    campaign_id: 'b76bc952-4793-44a8-abf5-d4ea855a1f6b',
    campaign_name: 'TikTok - Global - IH Quickpayly QPLTT1 LP TICOHN',
    external_campaign_id: '7298216145801204018',
    conversions: 31,
    revenue: 76.8,
    ctr: 3.12,
  },
  {
    campaign_id: 'f6a1866f-41c6-4e68-9adb-e598e0506bfa',
    campaign_name: 'TikTok - Global - IH Quickpayly QPLTT1 LP TICO 1',
    external_campaign_id: '7298216145801204019',
    conversions: 23,
    revenue: 58.41,
    ctr: 2.62,
  },
]

function wait(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, RESPONSE_DELAY_MS))
}

function paginate<T>(items: T[], page: number, perPage: number): { data: T[]; total: number } {
  const start = (page - 1) * perPage
  return { data: items.slice(start, start + perPage), total: items.length }
}

function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  orderBy: keyof T | undefined,
  order: 'asc' | 'desc' | undefined,
): T[] {
  if (!orderBy || !order) return rows
  const multiplier = order === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[orderBy]
    const right = b[orderBy]
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier
    return String(left ?? '').localeCompare(String(right ?? '')) * multiplier
  })
}

function makeReportRows(campaign?: CampaignRow): CampaignReportRow[] {
  const source = campaign ? [campaign] : CAMPAIGNS
  return source.flatMap((item) =>
    Array.from({ length: 12 }, (_, index) => {
      const day = String(17 - (index % 6)).padStart(2, '0')
      const hour = String(8 + index).padStart(2, '0')
      const conversions = Math.max(0, Math.round(item.conversions / 8) + (index % 4) - 1)
      return {
        id: `${item.campaign_id}-${index + 1}`,
        name: index % 2 === 0 ? 'Purchase' : 'Lead',
        conversions,
        revenue: Number((conversions * (2.35 + (index % 3))).toFixed(2)),
        postback_timestamp: `2026-08-${day} ${hour}:24:16`,
        visit_timestamp: `2026-08-${day} ${String(Math.max(0, 7 + index)).padStart(2, '0')}:11:42`,
        campaign_id: item.campaign_id,
        campaign_name: item.campaign_name,
      }
    }),
  )
}

function makeOfferRows(campaign?: CampaignRow): OfferRow[] {
  const source = campaign ? [campaign] : CAMPAIGNS
  return source.flatMap((item) =>
    ['PrePop Landing Offer', 'Direct Conversion Offer'].map((offerName, index) => ({
      id: `${item.campaign_id}-offer-${index + 1}`,
      offer_name: offerName,
      offer_id: `offer-${item.external_campaign_id ?? item.campaign_id.slice(0, 8)}-${index + 1}`,
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      conversions: Math.max(0, Math.round(item.conversions / (index + 2))),
      revenue: Number((item.revenue / (index + 2)).toFixed(2)),
    })),
  )
}

function inDateRange(timestamp: string | null, from: string | null, to: string | null): boolean {
  if (!timestamp) return true
  const date = timestamp.slice(0, 10)
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

function makeChartData(campaign?: CampaignRow): ClickIdChartPoint[] {
  const conversionBase = Math.max(1, Math.round((campaign?.conversions ?? 40) / 7))
  const revenueBase = campaign?.revenue ?? 95.39
  return Array.from({ length: 24 }, (_, hour) => {
    const active = hour < 8
    const visits = active ? 14 + ((hour * 9 + 12) % 43) : 0
    const clicks = active ? 5 + ((hour * 7 + 6) % 16) : 0
    const conversions = active ? Math.max(1, conversionBase + ((hour % 3) - 1)) : 0
    return {
      label: `${String(hour).padStart(2, '0')}:00`,
      visits,
      clicks,
      conversions,
      impressions: active ? visits * 8 + hour * 11 : 0,
      revenue: active ? Number(((revenueBase / 8) * (0.5 + ((hour % 4) + 1) / 3)).toFixed(2)) : 0,
    }
  })
}

export const mockNewCampaignApi = {
  async getCampaignsByIds(ids: string[]): Promise<CampaignRow[]> {
    await wait()
    const campaignsById = new Map(CAMPAIGNS.map((campaign) => [campaign.campaign_id, campaign]))
    return ids.flatMap((id) => {
      const campaign = campaignsById.get(id)
      return campaign ? [campaign] : []
    })
  },

  async listCampaigns(filters: CampaignListFilters): Promise<CampaignListResponse> {
    await wait()
    const search = filters.search.trim().toLowerCase()
    const matchingRows = !search
      ? CAMPAIGNS
      : CAMPAIGNS.filter(
          (row) =>
            row.campaign_name.toLowerCase().includes(search) ||
            row.campaign_id.toLowerCase().includes(search) ||
            row.external_campaign_id?.toLowerCase().includes(search),
        )
    const sortedRows = sortRows(matchingRows, filters.order_by, filters.order)
    const { data, total } = paginate(sortedRows, filters.page, filters.per_page)
    return {
      data,
      pagination: {
        page: filters.page,
        per_page: filters.per_page,
        total,
        last_page: Math.max(1, Math.ceil(total / filters.per_page)),
      },
    }
  },

  async listCampaignReport(
    campaign: CampaignRow | undefined,
    filters: CampaignReportFilters,
  ): Promise<CampaignReportResponse> {
    await wait()
    const search = filters.search.trim().toLowerCase()
    const matchingRows = makeReportRows(campaign).filter(
      (row) =>
        inDateRange(row.visit_timestamp, filters.date_from, filters.date_to) &&
        (!search ||
          row.name.toLowerCase().includes(search) ||
          row.campaign_id.toLowerCase().includes(search) ||
          row.campaign_name.toLowerCase().includes(search)),
    )
    const sortedRows = sortRows(matchingRows, filters.order_by, filters.order)
    const { data, total } = paginate(sortedRows, filters.page, filters.per_page)
    return {
      data,
      pagination: {
        page: filters.page,
        per_page: filters.per_page,
        total,
        last_page: Math.max(1, Math.ceil(total / filters.per_page)),
      },
    }
  },

  async listClickIdChart(
    campaign?: CampaignRow,
    filters?: Pick<CampaignReportFilters, 'date_from' | 'date_to'>,
  ): Promise<ClickIdChartPoint[]> {
    await wait()
    const days =
      filters?.date_from && filters.date_to
        ? Math.max(
            1,
            Math.round(
              (new Date(filters.date_to).getTime() - new Date(filters.date_from).getTime()) /
                86_400_000,
            ) + 1,
          )
        : 1
    return makeChartData(campaign).map((point) => ({
      ...point,
      visits: point.visits * days,
      clicks: point.clicks * days,
      conversions: point.conversions * days,
      impressions: point.impressions * days,
      revenue: Number((point.revenue * days).toFixed(2)),
    }))
  },

  async listOffers(filters: OfferListFilters, campaign?: CampaignRow): Promise<OfferListResponse> {
    await wait()
    const search = filters.search.trim().toLowerCase()
    const matchingRows = makeOfferRows(campaign).filter(
      (row) =>
        !search ||
        row.offer_name.toLowerCase().includes(search) ||
        row.offer_id.toLowerCase().includes(search) ||
        row.campaign_name.toLowerCase().includes(search),
    )
    const { data, total } = paginate(matchingRows, filters.page, filters.per_page)
    return {
      data,
      pagination: {
        page: filters.page,
        per_page: filters.per_page,
        total,
        last_page: Math.max(1, Math.ceil(total / filters.per_page)),
      },
    }
  },
}
