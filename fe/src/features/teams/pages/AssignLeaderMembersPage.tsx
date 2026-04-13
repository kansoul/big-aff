import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Pencil, UserPlus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'

import { teamsApi } from '@/features/teams/api'
import type { Team, TeamLeaderOption } from '@/features/teams/types'
import {
  AssignUsersChildrenPicker,
  type AssignChildOption,
} from '@/features/users/components/AssignUsersChildrenPicker'
import { usersApi } from '@/features/users/api/users'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function AssignLeaderMembersPage() {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canAssign = hasPermission(perms, PermissionSlugs.TeamsAssign)

  const [teams, setTeams] = useState<Team[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  // Leaders per team
  const [teamLeaders, setTeamLeaders] = useState<Record<number, TeamLeaderOption[]>>({})
  const [teamLeadersLoading, setTeamLeadersLoading] = useState<Record<number, boolean>>({})

  // Current children per leader (from parent-child-assignments, then updated on save)
  const [savedChildrenByLeader, setSavedChildrenByLeader] = useState<Record<number, number[]>>({})

  // Dialog state
  const [editingLeader, setEditingLeader] = useState<{
    team: Team
    leader: TeamLeaderOption
  } | null>(null)
  const [dialogOptions, setDialogOptions] = useState<AssignChildOption[]>([])
  const [dialogOptionsLoading, setDialogOptionsLoading] = useState(false)
  const [modalChildIds, setModalChildIds] = useState<number[]>([])
  const [savingLeaderId, setSavingLeaderId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)

  // Load teams + current parent-child assignments
  useEffect(() => {
    let ignore = false

    const fetchInitialData = async () => {
      try {
        setPageLoading(true)
        const [teamsRes, assignmentsRes] = await Promise.all([
          teamsApi.list({ page: 1, per_page: 100 }),
          usersApi.listParentChildAssignments(),
        ])
        if (!ignore) {
          setTeams(teamsRes.data.data)
          const childrenMap: Record<number, number[]> = {}
          for (const row of assignmentsRes.assignments) {
            childrenMap[row.id] = row.child_user_ids
          }
          setSavedChildrenByLeader(childrenMap)
        }
      } catch (err) {
        if (!ignore) setPageError(formatApiError(err))
      } finally {
        if (!ignore) setPageLoading(false)
      }
    }

    void fetchInitialData()
    return () => {
      ignore = true
    }
  }, [])

  // Load leaders for each team
  const fetchLeadersForTeam = useCallback(async (team: Team) => {
    const teamId = team.id
    setTeamLeadersLoading((prev) => ({ ...prev, [teamId]: true }))
    try {
      const { data } = await teamsApi.leaders(teamId)
      setTeamLeaders((prev) => ({ ...prev, [teamId]: data.data }))
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setTeamLeadersLoading((prev) => ({ ...prev, [teamId]: false }))
    }
  }, [])

  useEffect(() => {
    if (teams.length === 0) return
    teams.forEach((team) => {
      if (teamLeaders[team.id] || teamLeadersLoading[team.id]) return
      void fetchLeadersForTeam(team)
    })
  }, [teams, teamLeaders, teamLeadersLoading, fetchLeadersForTeam])

  const openEditor = useCallback(async (team: Team, leader: TeamLeaderOption) => {
    setFlashError(null)
    setEditingLeader({ team, leader })
    setModalChildIds([])
    setDialogOptions([])
    setDialogOptionsLoading(true)
    try {
      const { data } = await teamsApi.parentChildOptions(team.id)
      const managerIds = new Set(
        (team.users ?? []).filter((u) => u.team_role === 'manager').map((u) => u.id),
      )
      const eligible = data.data.filter((u) => u.id !== leader.id && !managerIds.has(u.id))
      setDialogOptions(eligible.map((u) => ({ id: u.id, name: u.name, email: u.email })))
      setModalChildIds(eligible.filter((u) => u.is_assigned_child).map((u) => u.id))
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDialogOptionsLoading(false)
    }
  }, [])

  const closeEditor = useCallback(() => {
    if (savingLeaderId !== null) return
    setEditingLeader(null)
    setModalChildIds([])
    setDialogOptions([])
    setFlashError(null)
  }, [savingLeaderId])

  const saveEditorAsync = useCallback(async () => {
    if (!editingLeader) return

    const savedIds = savedChildrenByLeader[editingLeader.leader.id] ?? []
    const setsEqual = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false
      const setB = new Set(b)
      return a.every((id) => setB.has(id))
    }
    if (setsEqual(modalChildIds, savedIds)) {
      setFlashError('No changes detected.')
      return
    }

    try {
      setFlashError(null)
      setSavingLeaderId(editingLeader.leader.id)
      await usersApi.syncParentChildren(editingLeader.leader.id, modalChildIds)
      setSavedChildrenByLeader((prev) => ({
        ...prev,
        [editingLeader.leader.id]: modalChildIds,
      }))
      toast.success('Saved successfully')
      closeEditor()
    } catch (err) {
      setFlashError(formatApiError(err))
    } finally {
      setSavingLeaderId(null)
    }
  }, [editingLeader, modalChildIds, savedChildrenByLeader, closeEditor])

  const isSavingEditor = editingLeader ? savingLeaderId === editingLeader.leader.id : false

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
        Assign members to each leader. Click{' '}
        <span className="font-medium text-foreground">Assign members</span> or{' '}
        <span className="font-medium text-foreground">Edit members</span> to open the popup editor.
      </p>

      <div className="flex flex-col gap-3">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-center">
            <UsersRound className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No teams found</p>
          </div>
        ) : (
          teams.map((team) => {
            const leaders = teamLeaders[team.id] ?? []
            const leadersLoading = teamLeadersLoading[team.id] ?? false

            return (
              <div
                key={team.id}
                className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5"
              >
                <div className="grid gap-5 sm:grid-cols-[1fr_2fr] sm:gap-8">
                  {/* Team info */}
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

                  {/* Leaders list */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Leaders
                      </p>
                      {leaders.length > 0 ? (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          {leaders.length}
                        </span>
                      ) : null}
                    </div>

                    {leadersLoading ? (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        <span>Loading leaders…</span>
                      </div>
                    ) : leaders.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">No leaders in this team</p>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        {leaders.map((leader) => {
                          const childCount = savedChildrenByLeader[leader.id]?.length ?? 0
                          const isEmpty = childCount === 0

                          return (
                            <div
                              key={leader.id}
                              className="flex flex-col gap-2 rounded-lg border border-border/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {leader.name}
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <p className="truncate text-xs text-muted-foreground">
                                    {leader.email}
                                  </p>
                                  {childCount > 0 ? (
                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                                      {childCount} member{childCount > 1 ? 's' : ''}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {canAssign ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isEmpty ? 'default' : 'secondary'}
                                  className="shrink-0 gap-1.5 font-medium"
                                  onClick={() => void openEditor(team, leader)}
                                >
                                  {isEmpty ? (
                                    <UserPlus className="size-3.5" />
                                  ) : (
                                    <Pencil className="size-3.5" />
                                  )}
                                  {isEmpty ? 'Assign members' : 'Edit members'}
                                </Button>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Dialog
        open={editingLeader !== null}
        onOpenChange={(open) => (!open ? closeEditor() : undefined)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingLeader ? `Assign Members · ${editingLeader.leader.name}` : 'Assign Members'}
            </DialogTitle>
            <DialogDescription>
              {editingLeader
                ? `Team: ${editingLeader.team.name}`
                : 'Select members to assign to this leader.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Members
            </p>
            {dialogOptionsLoading ? (
              <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading users…</span>
              </div>
            ) : (
              <AssignUsersChildrenPicker
                disabled={!canAssign || isSavingEditor}
                value={modalChildIds}
                onChange={setModalChildIds}
                options={dialogOptions}
                placeholder="Select members…"
              />
            )}
          </div>

          {flashError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{flashError}</p>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeEditor} disabled={isSavingEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditorAsync()}
              disabled={!canAssign || isSavingEditor || dialogOptionsLoading}
              className="gap-1.5"
            >
              {isSavingEditor ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {isSavingEditor ? 'Saving…' : 'Save members'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
