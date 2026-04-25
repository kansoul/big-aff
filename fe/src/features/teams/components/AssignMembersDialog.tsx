import { AlertCircle, Loader2 } from 'lucide-react'

import {
  AssignUsersChildrenPicker,
  type AssignChildOption,
} from '@/features/users/components/AssignUsersChildrenPicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Team } from '@/features/teams/types'

type AssignMembersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team | null
  options: AssignChildOption[]
  optionsLoading: boolean
  canAssign: boolean
  managerIds: number[]
  onManagerIdsChange: (ids: number[]) => void
  leaderIds: number[]
  onLeaderIdsChange: (ids: number[]) => void
  memberIds: number[]
  onMemberIdsChange: (ids: number[]) => void
  saving: boolean
  flashError: string | null
  onSave: () => void
}

export function AssignMembersDialog({
  open,
  onOpenChange,
  team,
  options,
  optionsLoading,
  canAssign,
  managerIds,
  onManagerIdsChange,
  leaderIds,
  onLeaderIdsChange,
  memberIds,
  onMemberIdsChange,
  saving,
  flashError,
  onSave,
}: AssignMembersDialogProps) {
  const managerPickerOptions = options.filter(
    (o) => !leaderIds.includes(o.id) && !memberIds.includes(o.id),
  )
  const leaderPickerOptions = options.filter(
    (o) => !managerIds.includes(o.id) && !memberIds.includes(o.id),
  )
  const memberPickerOptions = options.filter(
    (o) => !managerIds.includes(o.id) && !leaderIds.includes(o.id),
  )
  const totalCount = managerIds.length + leaderIds.length + memberIds.length

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onOpenChange(false)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{team ? `Manage Members · ${team.name}` : 'Manage Members'}</DialogTitle>
          <DialogDescription>
            Assign users to each role. A user can only belong to one role at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border border-l-2 border-l-blue-300 p-3 dark:border-l-blue-700">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                Managers
              </p>
              {managerIds.length > 0 ? (
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  {managerIds.length}
                </span>
              ) : null}
            </div>
            {optionsLoading ? (
              <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading users…</span>
              </div>
            ) : (
              <AssignUsersChildrenPicker
                disabled={!canAssign || saving}
                value={managerIds}
                onChange={onManagerIdsChange}
                options={managerPickerOptions}
                placeholder="Select managers…"
                tagClassName="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
              />
            )}
          </div>

          <div className="rounded-lg border border-border border-l-2 border-l-amber-300 p-3 dark:border-l-amber-700">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Leaders
              </p>
              {leaderIds.length > 0 ? (
                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  {leaderIds.length}
                </span>
              ) : null}
            </div>
            {optionsLoading ? (
              <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading users…</span>
              </div>
            ) : (
              <AssignUsersChildrenPicker
                disabled={!canAssign || saving}
                value={leaderIds}
                onChange={onLeaderIdsChange}
                options={leaderPickerOptions}
                placeholder="Select leaders…"
                tagClassName="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              />
            )}
          </div>

          <div className="rounded-lg border border-border border-l-2 border-l-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Members
              </p>
              {memberIds.length > 0 ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {memberIds.length}
                </span>
              ) : null}
            </div>
            {optionsLoading ? (
              <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading users…</span>
              </div>
            ) : (
              <AssignUsersChildrenPicker
                disabled={!canAssign || saving}
                value={memberIds}
                onChange={onMemberIdsChange}
                options={memberPickerOptions}
                placeholder="Select members…"
                tagClassName="bg-muted text-muted-foreground"
              />
            )}
          </div>
        </div>

        {flashError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{flashError}</p>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={!canAssign || saving || optionsLoading || totalCount === 0}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save members'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
