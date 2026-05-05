import { AlertCircle, Loader2, UsersRound } from 'lucide-react'

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
import type { Team, TeamLeaderOption } from '@/features/teams/types'

type AssignToLeadersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team | null
  leaders: TeamLeaderOption[]
  leadersLoading: boolean
  parentChildOptionsLoading: boolean
  canAssign: boolean
  leaderModalChildIds: Record<number, number[]>
  onLeaderChildIdsChange: (leaderId: number, ids: number[]) => void
  pickerOptions: AssignChildOption[]
  saving: boolean
  flashError: string | null
  onSave: () => void
}

export function AssignToLeadersDialog({
  open,
  onOpenChange,
  team,
  leaders,
  leadersLoading,
  parentChildOptionsLoading,
  canAssign,
  leaderModalChildIds,
  onLeaderChildIdsChange,
  pickerOptions,
  saving,
  flashError,
  onSave,
}: AssignToLeadersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onOpenChange(false)}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {team ? `Assign to Leaders · ${team.name}` : 'Assign to Leaders'}
          </DialogTitle>
          <DialogDescription>Select members to assign under each leader.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {leadersLoading ? (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <UsersRound className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No leaders in this team</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader) => (
                <div
                  key={leader.id}
                  className="rounded-lg border border-border border-l-2 border-l-amber-300 p-3 dark:border-l-amber-700"
                >
                  <div className="mb-2">
                    <p className="text-sm font-medium text-foreground">{leader.name}</p>
                    <p className="text-xs text-muted-foreground">{leader.email}</p>
                  </div>
                  {parentChildOptionsLoading ? (
                    <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Loading members…</span>
                    </div>
                  ) : (
                    <AssignUsersChildrenPicker
                      disabled={!canAssign || saving}
                      value={leaderModalChildIds[leader.id] ?? []}
                      onChange={(ids) => onLeaderChildIdsChange(leader.id, ids)}
                      options={pickerOptions}
                      placeholder="Select members…"
                      tagClassName="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
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
            disabled={!canAssign || saving || leadersLoading || parentChildOptionsLoading}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
