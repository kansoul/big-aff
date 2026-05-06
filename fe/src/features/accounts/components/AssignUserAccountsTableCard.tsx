import { memo } from 'react'
import { Loader2, Save, Users } from 'lucide-react'

import { AssignUserAccountsPicker } from './AssignUserAccountsPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  AssignedAccountSummary,
  UserAccountAssignmentRow,
} from '../types/userAccountAssignments'

type AssignUserAccountsTableCardProps = {
  loading: boolean
  users: UserAccountAssignmentRow[]
  drafts: Record<number, string[]>
  savedByUserId: Record<number, string[]>
  onDraftChange: (userId: number, accountIds: string[]) => void
  onSaveRow: (userId: number) => void
  savingRowId: number | null
  canAssign: boolean
  authUserId: number
  emptyMessage?: string
}

function hasSelectionDiff(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return true
  return left.some((id) => !right.includes(id)) || right.some((id) => !left.includes(id))
}

function accountLabel(account: AssignedAccountSummary): string {
  return account.account_name
    ? `${account.account_name} (${account.account_id})`
    : account.account_id
}

function AssignUserAccountsTableCardInner({
  loading,
  users,
  drafts,
  savedByUserId,
  onDraftChange,
  onSaveRow,
  savingRowId,
  canAssign,
  authUserId,
  emptyMessage = 'No users to assign',
}: AssignUserAccountsTableCardProps) {
  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-center">
          <Users className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        users.map((row) => {
          const isAuthUser = row.id === authUserId
          const saved = savedByUserId[row.id] ?? []
          const draft = drafts[row.id] ?? saved
          const dirty = hasSelectionDiff(draft, saved)
          const isSaving = savingRowId === row.id
          const rowDisabled = !canAssign || isAuthUser

          return (
            <div
              key={row.id}
              className={cn(
                'rounded-xl border bg-card px-4 py-4 shadow-sm transition-[border-color] sm:px-5 sm:py-5',
                dirty ? 'border-primary/40' : 'border-border',
                isAuthUser && 'opacity-60',
              )}
            >
              <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(180px,1.1fr)_minmax(260px,1.8fr)_minmax(360px,2.2fr)] lg:gap-8">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-muted-foreground">User</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Owned Accounts
                    </p>
                    {row.accounts.length > 0 ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {row.accounts.length}
                      </span>
                    ) : null}
                  </div>
                  {row.accounts.length > 0 ? (
                    <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {row.accounts.map((account) => {
                        const label = accountLabel(account)
                        return (
                          <Badge
                            key={account.account_id}
                            variant="outline"
                            className="h-auto max-w-full justify-start rounded-md px-2 py-1 text-[11px] leading-tight"
                            title={label}
                          >
                            <span className="max-w-[240px] truncate">{label}</span>
                          </Badge>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No owned accounts</p>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">Edit</p>
                    {draft.length > 0 ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {draft.length}
                      </span>
                    ) : null}
                    {dirty ? (
                      <span className="ml-auto text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        Unsaved changes
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 space-y-2.5">
                    <AssignUserAccountsPicker
                      disabled={rowDisabled}
                      value={draft}
                      onChange={(next) => onDraftChange(row.id, next)}
                    />
                    {canAssign && !isAuthUser ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant={dirty ? 'default' : 'secondary'}
                          className="gap-1.5 font-medium"
                          disabled={!dirty || savingRowId !== null}
                          onClick={() => onSaveRow(row.id)}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <Save className="size-3.5" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

export const AssignUserAccountsTableCard = memo(AssignUserAccountsTableCardInner)
