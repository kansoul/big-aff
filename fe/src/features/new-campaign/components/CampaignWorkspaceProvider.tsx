import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { useSearchParams } from 'react-router-dom'

import { newCampaignApi } from '@/features/new-campaign/api'
import type {
  CampaignRow,
  CampaignWorkspaceTab,
  WorkspaceView,
} from '@/features/new-campaign/types'

type CampaignWorkspaceState = {
  activeTabId: string
  homeView: WorkspaceView
  isReady: boolean
  tabs: CampaignWorkspaceTab[]
}

type CampaignWorkspaceActions = {
  activateTab: (tabId: string) => void
  closeTab: (tabId: string) => void
  openCampaign: (campaign: CampaignRow) => void
  openCampaigns: (campaigns: CampaignRow[]) => void
  setCampaignView: (tabId: string, view: Exclude<WorkspaceView, 'campaigns'>) => void
  setHomeView: (view: WorkspaceView) => void
}

type Action =
  | { type: 'activate'; tabId: string }
  | { type: 'close'; tabId: string }
  | { type: 'open'; campaigns: CampaignRow[] }
  | { type: 'set-campaign-view'; tabId: string; view: Exclude<WorkspaceView, 'campaigns'> }
  | { type: 'set-home-view'; view: WorkspaceView }
  | { type: 'restore'; activeTabId: string; homeView: WorkspaceView; tabs: CampaignWorkspaceTab[] }

const INITIAL_STATE: CampaignWorkspaceState = {
  activeTabId: 'home',
  homeView: 'campaigns',
  isReady: false,
  tabs: [],
}

const CampaignWorkspaceStateContext = createContext<CampaignWorkspaceState | null>(null)
const CampaignWorkspaceActionsContext = createContext<CampaignWorkspaceActions | null>(null)

function reducer(state: CampaignWorkspaceState, action: Action): CampaignWorkspaceState {
  if (action.type === 'restore') {
    return {
      activeTabId: action.tabs.some((tab) => tab.id === action.activeTabId)
        ? action.activeTabId
        : 'home',
      homeView: action.homeView,
      isReady: true,
      tabs: action.tabs,
    }
  }

  if (action.type === 'activate') {
    return { ...state, activeTabId: action.tabId }
  }

  if (action.type === 'set-home-view') return { ...state, homeView: action.view }

  if (action.type === 'set-campaign-view') {
    return {
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.id === action.tabId ? { ...tab, view: action.view } : tab,
      ),
    }
  }

  if (action.type === 'open') {
    if (!action.campaigns.length) return state
    const existingTabIds = new Set(state.tabs.map((tab) => tab.id))
    const newTabs = action.campaigns
      .filter((campaign) => !existingTabIds.has(campaign.campaign_id))
      .map((campaign) => ({ id: campaign.campaign_id, campaign, view: 'offers' as const }))
    const activeCampaign = action.campaigns.at(-1)
    return {
      ...state,
      tabs: [...state.tabs, ...newTabs],
      activeTabId: activeCampaign?.campaign_id ?? state.activeTabId,
    }
  }

  if (action.tabId === 'home') return state
  const closedIndex = state.tabs.findIndex((tab) => tab.id === action.tabId)
  if (closedIndex === -1) return state
  const tabs = state.tabs.filter((tab) => tab.id !== action.tabId)
  const activeTabId =
    state.activeTabId === action.tabId
      ? (tabs[closedIndex - 1]?.id ?? tabs[0]?.id ?? 'home')
      : state.activeTabId
  return { ...state, tabs, activeTabId }
}

export function CampaignWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [searchParams, setSearchParams] = useSearchParams()
  const initialParams = useRef(new URLSearchParams(searchParams))

  useEffect(() => {
    const params = initialParams.current
    const ids = (params.get('nc_tabs') ?? '').split(',').filter(Boolean)
    const homeView = params.get('nc_home_view')
    const nextHomeView: WorkspaceView =
      homeView === 'offers' || homeView === 'click-ids' ? homeView : 'campaigns'
    const activeTabId = params.get('nc_active') ?? 'home'

    void newCampaignApi.getCampaignsByIds(ids).then((campaigns) => {
      const tabs = campaigns.map((campaign) => {
        const view = params.get(`nc_tab_${campaign.campaign_id}_view`)
        return {
          id: campaign.campaign_id,
          campaign,
          view: view === 'click-ids' ? 'click-ids' : 'offers',
        } satisfies CampaignWorkspaceTab
      })
      dispatch({ type: 'restore', activeTabId, homeView: nextHomeView, tabs })
    })
  }, [])

  useEffect(() => {
    if (!state.isReady) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        const tabIds = state.tabs.map((tab) => tab.id)
        if (tabIds.length) next.set('nc_tabs', tabIds.join(','))
        else next.delete('nc_tabs')
        if (state.activeTabId !== 'home') next.set('nc_active', state.activeTabId)
        else next.delete('nc_active')
        if (state.homeView !== 'campaigns') next.set('nc_home_view', state.homeView)
        else next.delete('nc_home_view')

        Array.from(next.keys()).forEach((key) => {
          if (!key.startsWith('nc_tab_')) return
          if (!tabIds.some((id) => key.startsWith(`nc_tab_${id}_`))) next.delete(key)
        })
        state.tabs.forEach((tab) => next.set(`nc_tab_${tab.id}_view`, tab.view))
        return next.toString() === current.toString() ? current : next
      },
      { replace: true },
    )
  }, [setSearchParams, state.activeTabId, state.homeView, state.isReady, state.tabs])

  const activateTab = useCallback((tabId: string) => dispatch({ type: 'activate', tabId }), [])
  const closeTab = useCallback((tabId: string) => dispatch({ type: 'close', tabId }), [])
  const openCampaign = useCallback((campaign: CampaignRow) => {
    dispatch({ type: 'open', campaigns: [campaign] })
  }, [])
  const openCampaigns = useCallback((campaigns: CampaignRow[]) => {
    dispatch({ type: 'open', campaigns })
  }, [])
  const setHomeView = useCallback((view: WorkspaceView) => {
    dispatch({ type: 'set-home-view', view })
  }, [])
  const setCampaignView = useCallback(
    (tabId: string, view: Exclude<WorkspaceView, 'campaigns'>) => {
      dispatch({ type: 'set-campaign-view', tabId, view })
    },
    [],
  )

  const actions = useMemo<CampaignWorkspaceActions>(
    () => ({ activateTab, closeTab, openCampaign, openCampaigns, setCampaignView, setHomeView }),
    [activateTab, closeTab, openCampaign, openCampaigns, setCampaignView, setHomeView],
  )

  return (
    <CampaignWorkspaceStateContext value={state}>
      <CampaignWorkspaceActionsContext value={actions}>{children}</CampaignWorkspaceActionsContext>
    </CampaignWorkspaceStateContext>
  )
}

export function useCampaignWorkspaceState(): CampaignWorkspaceState {
  const context = use(CampaignWorkspaceStateContext)
  if (!context)
    throw new Error('useCampaignWorkspaceState must be used within CampaignWorkspaceProvider')
  return context
}

export function useCampaignWorkspaceActions(): CampaignWorkspaceActions {
  const context = use(CampaignWorkspaceActionsContext)
  if (!context)
    throw new Error('useCampaignWorkspaceActions must be used within CampaignWorkspaceProvider')
  return context
}
