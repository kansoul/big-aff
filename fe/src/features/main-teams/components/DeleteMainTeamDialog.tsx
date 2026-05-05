import { Loader2, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { MainTeam } from '@/features/main-teams/types'

type DeleteMainTeamDialogProps = {
  mainTeam: MainTeam | null
  deleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: () => void | Promise<void>
}

export function DeleteMainTeamDialog({
  mainTeam,
  deleting,
  onOpenChange,
  onConfirmDelete,
}: DeleteMainTeamDialogProps) {
  return (
    <AlertDialog open={!!mainTeam} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete main team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{mainTeam?.name}</span>? Account and
            channel mappings will be cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void onConfirmDelete()}
          >
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                Delete
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
