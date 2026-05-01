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
import type { Site } from '@/features/sites/types'

type AssignSiteUsersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: Site | null
  options: AssignChildOption[]
  optionsLoading: boolean
  canAssign: boolean
  userIds: number[]
  onUserIdsChange: (ids: number[]) => void
  saving: boolean
  flashError: string | null
  onSave: () => void
}

export function AssignSiteUsersDialog({
  open,
  onOpenChange,
  site,
  options,
  optionsLoading,
  canAssign,
  userIds,
  onUserIdsChange,
  saving,
  flashError,
  onSave,
}: AssignSiteUsersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onOpenChange(false)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{site ? `Assign Users · ${site.name}` : 'Assign Users'}</DialogTitle>
          <DialogDescription>Select users to assign to this site.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Users
              </p>
              {userIds.length > 0 ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {userIds.length}
                </span>
              ) : null}
              {!optionsLoading && options.length > 0 && (
                <button
                  type="button"
                  disabled={!canAssign || saving}
                  onClick={() =>
                    userIds.length === options.length
                      ? onUserIdsChange([])
                      : onUserIdsChange(options.map((o) => o.id))
                  }
                  className="ml-auto text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
                >
                  {userIds.length === options.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            {optionsLoading ? (
              <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading users…</span>
              </div>
            ) : (
              <AssignUsersChildrenPicker
                disabled={!canAssign || saving}
                value={userIds}
                onChange={onUserIdsChange}
                options={options}
                placeholder="Select users…"
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
            disabled={!canAssign || saving || optionsLoading || userIds.length === 0}
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
