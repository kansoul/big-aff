import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Save, UsersRound } from 'lucide-react'
import { toast } from 'sonner'

import { teamsApi } from '@/features/teams/api'
import type { Team } from '@/features/teams/types'
import {
  AssignUsersChildrenPicker,
  type AssignChildOption,
} from '@/features/users/components/AssignUsersChildrenPicker'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function AssignTeamUsersPage() {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canAssign = hasPermission(perms, PermissionSlugs.TeamsAssign)

  const [teams, setTeams] = useState<Team[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [teamOptions, setTeamOptions] = useState<Record<number, AssignChildOption[]>>({})
  const [teamOptionsLoading, setTeamOptionsLoading] = useState<Record<number, boolean>>({})
  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [savedDrafts, setSavedDrafts] = useState<Record<number, number[]>>({})

  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const fetchTeams = async () => {
      try {
        setPageLoading(true)
        const { data } = await teamsApi.list({ page: 1, per_page: 100 })
        if (!ignore) {
          setTeams(data.data)
        }
      } catch (err) {
        if (!ignore) {
          setPageError(formatApiError(err))
        }
      } finally {
        if (!ignore) {
          setPageLoading(false)
        }
      }
    }

    void fetchTeams()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (teams.length === 0) return

    const loadOptionsForTeam = async (teamId: number) => {
      setTeamOptionsLoading((prev) => ({ ...prev, [teamId]: true }))
      try {
        const { data } = await teamsApi.userOptions(teamId)
        const options: AssignChildOption[] = data.data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))
        const selectedIds: number[] = data.selected_ids ?? []
        setTeamOptions((prev) => ({ ...prev, [teamId]: options }))
        setDrafts((prev) => ({ ...prev, [teamId]: selectedIds }))
        setSavedDrafts((prev) => ({ ...prev, [teamId]: selectedIds }))
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        setTeamOptionsLoading((prev) => ({ ...prev, [teamId]: false }))
      }
    }

    teams.forEach((team) => {
      void loadOptionsForTeam(team.id)
    })
  }, [teams])

  const onDraftChange = useCallback((teamId: number, userIds: number[]) => {
    setDrafts((prev) => ({ ...prev, [teamId]: userIds }))
  }, [])

  const saveRowAsync = useCallback(
    async (teamId: number) => {
      const userIds = drafts[teamId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(teamId)
        await teamsApi.assignUsers(teamId, userIds)
        setSavedDrafts((prev) => ({ ...prev, [teamId]: userIds }))
        toast.success('Saved successfully')
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [drafts],
  )

  const onSaveRow = useCallback(
    (teamId: number) => {
      void saveRowAsync(teamId)
    },
    [saveRowAsync],
  )

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading…</span>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p>{pageError}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Assign users to each team. Press <span className="font-medium text-foreground">Save</span>{' '}
        on a row to apply changes.
      </p>

      {flashError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{flashError}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-center">
            <UsersRound className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No teams found</p>
          </div>
        ) : (
          teams.map((team) => {
            const draft = drafts[team.id] ?? []
            const saved = savedDrafts[team.id] ?? []
            const dirty =
              draft.length !== saved.length ||
              draft.some((id) => !saved.includes(id)) ||
              saved.some((id) => !draft.includes(id))
            const options = teamOptions[team.id] ?? []
            const optionsLoading = teamOptionsLoading[team.id] ?? false
            const isSaving = savingRowId === team.id

            return (
              <div
                key={team.id}
                className={cn(
                  'rounded-xl border bg-card px-4 py-4 shadow-sm transition-[border-color] sm:px-5 sm:py-5',
                  dirty ? 'border-primary/40' : 'border-border',
                )}
              >
                <div className="grid gap-5 sm:grid-cols-[1fr_2fr] sm:gap-8">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Team
                    </p>
                    <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                      {team.name}
                    </p>
                    {team.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {team.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Users
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
                      {optionsLoading ? (
                        <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Loading users…</span>
                        </div>
                      ) : (
                        <AssignUsersChildrenPicker
                          disabled={!canAssign}
                          value={draft}
                          onChange={(next) => onDraftChange(team.id, next)}
                          options={options}
                        />
                      )}
                      {canAssign ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant={dirty ? 'default' : 'secondary'}
                            className="gap-1.5 font-medium"
                            disabled={!dirty || savingRowId !== null}
                            onClick={() => onSaveRow(team.id)}
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
    </div>
  )
}
