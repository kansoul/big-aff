import { memo } from 'react'
import { Loader2, Save, Users } from 'lucide-react'

import { AssignUserAccountsPicker, type AssignAccountOption } from './AssignUserAccountsPicker'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  AccountOptionForAssign,
  UserAccountAssignmentRow,
} from '../types/userAccountAssignments'

type AssignUserAccountsTableCardProps = {
  loading: boolean
  users: UserAccountAssignmentRow[]
  accountOptionsByUser: Record<number, AccountOptionForAssign[]>
  drafts: Record<number, number[]>
  savedByUserId: Record<number, number[]>
  onDraftChange: (userId: number, accountIds: number[]) => void
  onSaveRow: (userId: number) => void
  savingRowId: number | null
  canAssign: boolean
  authUserId: number
  emptyMessage?: string
}

function accountOptionsForRow(
  row: UserAccountAssignmentRow,
  options: AccountOptionForAssign[],
): AssignAccountOption[] {
  const merged = new Map<number, AssignAccountOption>()

  options.forEach((option) => {
    merged.set(option.id, {
      id: option.id,
      account_id: option.account_id,
      account_name: option.account_name,
    })
  })

  row.accounts.forEach((account) => {
    merged.set(account.id, {
      id: account.id,
      account_id: account.account_id,
      account_name: account.account_name,
    })
  })

  return Array.from(merged.values())
}

function hasSelectionDiff(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return true
  return left.some((id) => !right.includes(id)) || right.some((id) => !left.includes(id))
}

function AssignUserAccountsTableCardInner({
  loading,
  users,
  accountOptionsByUser,
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
    <>
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
            const pickerOptions = accountOptionsForRow(row, accountOptionsByUser[row.id] ?? [])
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
                <div className="grid gap-5 sm:grid-cols-[1fr_2fr] sm:gap-8">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold  text-muted-foreground">Email</p>
                    <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                      {row.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[11px] font-semibold  text-muted-foreground">Accounts</p>
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
                        options={pickerOptions}
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
    </>
  )
}

export const AssignUserAccountsTableCard = memo(AssignUserAccountsTableCardInner)
