import { memo } from 'react'
import { AlertCircle } from 'lucide-react'

import { AssignUsersChildrenPicker, type AssignChildOption } from './AssignUsersChildrenPicker'
import type { UserOptionForAssign, UserParentAssignmentRow } from '@/features/users/types'
import { Button } from '@/components/ui/button'

type AssignUsersTableCardProps = {
  listError: string | null
  loading: boolean
  assignments: UserParentAssignmentRow[]
  userOptions: UserOptionForAssign[]
  drafts: Record<number, number[]>
  onDraftChange: (parentId: number, childIds: number[]) => void
  onSaveRow: (parentId: number) => void
  savingRowId: number | null
  canUpdate: boolean
}

function childOptionsForRow(
  row: UserParentAssignmentRow,
  userOptions: UserOptionForAssign[],
  draftChildIds: number[],
): AssignChildOption[] {
  return userOptions
    .filter((u) => u.id !== row.id && (!u.is_assigned_child || draftChildIds.includes(u.id)))
    .map((u) => ({ id: u.id, name: u.name, email: u.email }))
}

function AssignUsersTableCardInner({
  listError,
  loading,
  assignments,
  userOptions,
  drafts,
  onDraftChange,
  onSaveRow,
  savingRowId,
  canUpdate,
}: AssignUsersTableCardProps) {
  return (
    <>
      {listError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{listError}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="rounded-xl border border-border/80 bg-muted/30 px-5 py-12 text-center text-muted-foreground text-sm dark:bg-[#1e1e1e]/90">
            Loading…
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-xl border border-border/80 bg-muted/30 px-5 py-12 text-center text-muted-foreground text-sm dark:bg-[#1e1e1e]/90">
            No users
          </div>
        ) : (
          assignments.map((row) => {
            const draft = drafts[row.id] ?? row.child_user_ids
            const dirty =
              draft.length !== row.child_user_ids.length ||
              draft.some((id) => !row.child_user_ids.includes(id)) ||
              row.child_user_ids.some((id) => !draft.includes(id))
            const options = childOptionsForRow(row, userOptions, draft)
            const canEditRow = canUpdate

            return (
              <div
                key={row.id}
                className="rounded-xl border border-border/80 bg-muted/30 px-4 py-4 shadow-sm sm:px-5 sm:py-5 dark:border-white/10 dark:bg-[#1e1e1e]/90"
              >
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                      Email
                    </p>
                    <p className="mt-1 break-all text-foreground text-sm sm:text-[15px]">
                      {row.email}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                      Child Users
                    </p>
                    <div className="mt-1 space-y-3">
                      <AssignUsersChildrenPicker
                        disabled={!canEditRow}
                        value={draft}
                        onChange={(next) => onDraftChange(row.id, next)}
                        options={options}
                      />
                      {canEditRow ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="font-medium"
                            disabled={!dirty || savingRowId !== null}
                            onClick={() => onSaveRow(row.id)}
                          >
                            {savingRowId === row.id ? 'Saving…' : 'Save'}
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

export const AssignUsersTableCard = memo(AssignUsersTableCardInner)
