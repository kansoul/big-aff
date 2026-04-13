import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { teamsApi } from '@/features/teams/api'
import {
  teamCreateSchema,
  teamUpdateSchema,
  type Team,
  type TeamCreateFormValues,
  type TeamUpdateFormValues,
} from '@/features/teams/types'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type TeamFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: Team | null
  onSuccess: () => void
}

const TEAM_CREATE_DEFAULT_VALUES: TeamCreateFormValues = {
  name: '',
  description: null,
}

export function TeamFormDialog({ open, onOpenChange, team, onSuccess }: TeamFormDialogProps) {
  const isEdit = !!team
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TeamCreateFormValues>({
    resolver: zodResolver(isEdit ? teamUpdateSchema : teamCreateSchema),
    defaultValues: TEAM_CREATE_DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      setFormError(null)
      if (team) {
        form.reset({
          name: team.name,
          description: team.description ?? null,
        })
      } else {
        form.reset(TEAM_CREATE_DEFAULT_VALUES)
      }
    }
  }, [open, team, form])

  const onSubmit = async (
    values: TeamCreateFormValues | TeamUpdateFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => {
    try {
      setFormError(null)
      setSubmitting(true)

      if (isEdit && team) {
        await teamsApi.update(team.id, {
          name: values.name,
          description: values.description,
        })
        toast.success('Team updated successfully')
      } else {
        await teamsApi.create({
          name: values.name,
          description: values.description,
        })
        toast.success('Team created successfully')
      }

      if (!isEdit && options?.createAnother) {
        form.reset(TEAM_CREATE_DEFAULT_VALUES)
      } else {
        onOpenChange(false)
      }
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Team' : 'Add Team'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit((values) => onSubmit(values, { createAnother: false }))(e)
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Team name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {!isEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => {
                    void form.handleSubmit((values) => onSubmit(values, { createAnother: true }))()
                  }}
                >
                  Create & Create Another
                </Button>
              ) : null}
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {isEdit ? 'Save Changes' : 'Create Team'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
