import { memo } from 'react'
import { AlertCircle, Loader2, Save, Users } from 'lucide-react'

import { AssignUsersChildrenPicker, type AssignChildOption } from './AssignUsersChildrenPicker'
import type { UserOptionForAssign, UserParentAssignmentRow } from '@/features/users/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-center">
            <Users className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No users to assign</p>
          </div>
        ) : (
          assignments.map((row) => {
            const draft = drafts[row.id] ?? row.child_user_ids
            const dirty =
              draft.length !== row.child_user_ids.length ||
              draft.some((id) => !row.child_user_ids.includes(id)) ||
              row.child_user_ids.some((id) => !draft.includes(id))
            const options = childOptionsForRow(row, userOptions, draft)
            const isSaving = savingRowId === row.id

            return (
              <div
                key={row.id}
                className={cn(
                  'rounded-xl border bg-card px-4 py-4 shadow-sm transition-[border-color] sm:px-5 sm:py-5',
                  dirty ? 'border-primary/40' : 'border-border',
                )}
              >
                <div className="grid gap-5 sm:grid-cols-[1fr_2fr] sm:gap-8">
                  {/* Parent user info */}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Parent User
                    </p>
                    <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                      {row.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  </div>

                  {/* Child picker */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Child Users
                      </p>
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
                      <AssignUsersChildrenPicker
                        disabled={!canUpdate}
                        value={draft}
                        onChange={(next) => onDraftChange(row.id, next)}
                        options={options}
                      />
                      {canUpdate ? (
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

export const AssignUsersTableCard = memo(AssignUsersTableCardInner)
