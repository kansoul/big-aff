import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { teamsApi } from '@/features/teams/api'
import { formatApiError } from '@/features/settings/components'
import type { Team } from '@/features/teams/types'
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

type DeleteTeamDialogProps = {
  team: Team | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteTeamDialog({ team, onOpenChange, onSuccess }: DeleteTeamDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const onConfirm = async () => {
    if (!team) return
    try {
      setDeleting(true)
      await teamsApi.remove(team.id)
      toast.success('Team deleted successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!team} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{team?.name}</span>? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={() => void onConfirm()}>
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
