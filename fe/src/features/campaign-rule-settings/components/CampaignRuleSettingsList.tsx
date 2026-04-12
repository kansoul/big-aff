import { memo, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type {
  CampaignRuleActionMode,
  CampaignRuleOrder,
  CampaignRuleOrderBy,
  CampaignRuleSettingsFilterParams,
  CampaignRuleSettingsUser,
  SaveCampaignRuleSettingPayload,
} from '@/features/campaign-rule-settings/types'

const ACTION_MODE_OPTIONS: Array<{
  value: CampaignRuleActionMode
  label: string
  helpText: string
}> = [
  {
    value: 'warning',
    label: 'Warning Only (Telegram)',
    helpText:
      'Warning only: send Telegram notification when rule condition is met, without pausing campaign.',
  },
  {
    value: 'pause',
    label: 'Pause Campaign',
    helpText: 'Automatically pause campaign when rule condition is met.',
  },
]

const ORDERABLE_COLUMNS: Array<{ value: CampaignRuleOrderBy; label: string }> = [
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'created_at', label: 'Created At' },
]

const PER_PAGE_OPTIONS = [10, 20, 30, 50, 100]

const DEFAULT_ACTION_MODE: CampaignRuleActionMode = 'warning'

type CampaignRuleSettingsListProps = {
  users: CampaignRuleSettingsUser[]
  loading: boolean
  rowCount: number
  filters: CampaignRuleSettingsFilterParams
  canUpdate: boolean
  updatingUserIds: Set<number>
  onFilterChange: (patch: Partial<CampaignRuleSettingsFilterParams>) => void
  onSaveRow: (userId: number, payload: SaveCampaignRuleSettingPayload) => Promise<void>
}

function normalizeUserSetting(user: CampaignRuleSettingsUser): SaveCampaignRuleSettingPayload {
  return {
    campaign_rule_auto_enabled: user.campaign_rule_setting?.campaign_rule_auto_enabled ?? false,
    action_mode: user.campaign_rule_setting?.action_mode ?? DEFAULT_ACTION_MODE,
    telegram_chat_id: user.campaign_rule_setting?.telegram_chat_id ?? null,
  }
}

function modeHelpText(mode: CampaignRuleActionMode): string {
  return ACTION_MODE_OPTIONS.find((item) => item.value === mode)?.helpText ?? ''
}

type CampaignRuleSettingRowProps = {
  user: CampaignRuleSettingsUser
  canUpdate: boolean
  isUpdating: boolean
  onSaveRow: (userId: number, payload: SaveCampaignRuleSettingPayload) => Promise<void>
}

function CampaignRuleSettingRow({
  user,
  canUpdate,
  isUpdating,
  onSaveRow,
}: CampaignRuleSettingRowProps) {
  const current = useMemo(() => normalizeUserSetting(user), [user])
  const [telegramDraft, setTelegramDraft] = useState(current.telegram_chat_id ?? '')

  const disabled = !canUpdate || isUpdating

  const onToggleAuto = (checked: boolean) => {
    void onSaveRow(user.id, {
      ...current,
      campaign_rule_auto_enabled: checked,
      telegram_chat_id: telegramDraft.trim() ? telegramDraft.trim() : null,
    })
  }

  const onActionModeChange = (value: string) => {
    const nextMode = value as CampaignRuleActionMode
    void onSaveRow(user.id, {
      ...current,
      action_mode: nextMode,
      telegram_chat_id: telegramDraft.trim() ? telegramDraft.trim() : null,
    })
  }

  const onTelegramBlur = () => {
    const normalizedDraft = telegramDraft.trim() ? telegramDraft.trim() : null
    if (normalizedDraft === current.telegram_chat_id) {
      return
    }

    void onSaveRow(user.id, {
      ...current,
      telegram_chat_id: normalizedDraft,
    })
  }

  return (
    <Card className="bg-card/90">
      <CardContent className="pt-4 md:pt-5">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_minmax(280px,1.25fr)_minmax(260px,1.2fr)]">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Email</p>
            <p className="break-all font-medium text-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">{user.name}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">
              Campaign Rule Auto
            </p>
            <div className="flex min-h-8 items-center gap-2">
              <Switch
                checked={current.campaign_rule_auto_enabled}
                disabled={disabled}
                onCheckedChange={onToggleAuto}
                aria-label={`Toggle campaign rule auto for ${user.email}`}
              />
              <span className="text-sm text-foreground">
                {current.campaign_rule_auto_enabled ? 'Enabled' : 'Disabled'}
              </span>
              {isUpdating ? (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Action Mode</p>
            <Select
              value={current.action_mode}
              onValueChange={onActionModeChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {modeHelpText(current.action_mode)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">
              Telegram Chat ID
            </p>
            <Input
              value={telegramDraft}
              disabled={disabled}
              placeholder="Optional: Custom Telegram chat"
              onChange={(event) => setTelegramDraft(event.target.value)}
              onBlur={onTelegramBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              If provided, notifications are sent to this chat ID instead of default channel.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const MemoCampaignRuleSettingRow = memo(CampaignRuleSettingRow)

export function CampaignRuleSettingsList({
  users,
  loading,
  rowCount,
  filters,
  canUpdate,
  updatingUserIds,
  onFilterChange,
  onSaveRow,
}: CampaignRuleSettingsListProps) {
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 10
  const orderBy = filters.order_by ?? 'created_at'
  const order = filters.order ?? 'desc'

  const totalPages = Math.max(1, Math.ceil(rowCount / perPage))

  const showEmptyState = !loading && users.length === 0

  return (
    <section className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader className="pb-1">
          <CardTitle>Users & Campaign Rule Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Sort by</span>
              <Select
                value={orderBy}
                onValueChange={(value) =>
                  onFilterChange({
                    order_by: value as CampaignRuleOrderBy,
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDERABLE_COLUMNS.map((column) => (
                    <SelectItem key={column.value} value={column.value}>
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Order</span>
              <Select
                value={order}
                onValueChange={(value) =>
                  onFilterChange({
                    order: value as CampaignRuleOrder,
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Per page</span>
              <Select
                value={String(perPage)}
                onValueChange={(value) => {
                  const parsed = Number(value)
                  onFilterChange({
                    per_page: Number.isNaN(parsed) ? perPage : parsed,
                    page: 1,
                  })
                }}
              >
                <SelectTrigger className="h-8 w-[96px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {rowCount} user{rowCount === 1 ? '' : 's'}
          </div>
        </CardContent>
      </Card>

      <div className={cn('space-y-3', loading && 'opacity-70')}>
        {users.map((user) => (
          <MemoCampaignRuleSettingRow
            key={`${user.id}:${user.campaign_rule_setting?.updated_at ?? 'none'}`}
            user={user}
            canUpdate={canUpdate}
            isUpdating={updatingUserIds.has(user.id)}
            onSaveRow={onSaveRow}
          />
        ))}
      </div>

      {showEmptyState ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No users found for current filters.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="text-xs text-muted-foreground">
            Page {page} / {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => onFilterChange({ page: page - 1 })}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages}
              onClick={() => onFilterChange({ page: page + 1 })}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
