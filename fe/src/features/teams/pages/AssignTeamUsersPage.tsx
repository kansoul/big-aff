import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, Pencil, UserPlus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'

import { teamsApi } from '@/features/teams/api'
import type { Team, TeamRole } from '@/features/teams/types'
import {
  AssignUsersChildrenPicker,
  type AssignChildOption,
} from '@/features/users/components/AssignUsersChildrenPicker'
import { SearchableSelect, type SearchableSelectOption } from '@/components/common/SearchableSelect'
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

const USER_ROLE_OPTIONS: SearchableSelectOption[] = [
  { label: 'Manager', value: 'manager' },
  { label: 'Leader', value: 'leader' },
  { label: 'Member', value: 'member' },
]

export function AssignTeamUsersPage() {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canAssign = hasPermission(perms, PermissionSlugs.TeamsAssign)

  const [teams, setTeams] = useState<Team[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [teamOptions, setTeamOptions] = useState<Record<number, AssignChildOption[]>>({})
  const [teamOptionsLoading, setTeamOptionsLoading] = useState<Record<number, boolean>>({})
  const [savedUserIdsByTeam, setSavedUserIdsByTeam] = useState<Record<number, number[]>>({})
  const [savedUserRolesByTeam, setSavedUserRolesByTeam] = useState<
    Record<number, Record<number, TeamRole>>
  >({})

  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)
  const [modalUserIds, setModalUserIds] = useState<number[]>([])
  const [modalUserRoles, setModalUserRoles] = useState<Record<number, TeamRole>>({})

  const [savingTeamId, setSavingTeamId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const fetchTeams = async () => {
      try {
        setPageLoading(true)
        const { data } = await teamsApi.list({ page: 1, per_page: 100 })
        if (!ignore) {
          const nextTeams = data.data
          const initialUserIdsByTeam = Object.fromEntries(
            nextTeams.map((team) => [team.id, (team.users ?? []).map((u) => u.id)]),
          )
          const initialUserRolesByTeam = Object.fromEntries(
            nextTeams.map((team) => [
              team.id,
              (team.users ?? []).reduce<Record<number, TeamRole>>((acc, u) => {
                acc[u.id] = 'member'
                return acc
              }, {}),
            ]),
          )
          setTeams(nextTeams)
          setSavedUserIdsByTeam(initialUserIdsByTeam)
          setSavedUserRolesByTeam(initialUserRolesByTeam)
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

    const loadOptionsForTeam = async (team: Team) => {
      const teamId = team.id
      if (teamOptions[teamId]) return
      setTeamOptionsLoading((prev) => ({ ...prev, [teamId]: true }))
      try {
        const { data } = await teamsApi.userOptions(teamId)
        const existingMembers: AssignChildOption[] = (team.users ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))
        const candidateUsers: AssignChildOption[] = data.data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))
        const merged = new Map<number, AssignChildOption>()
        ;[...existingMembers, ...candidateUsers].forEach((option) => {
          merged.set(option.id, option)
        })
        setTeamOptions((prev) => ({ ...prev, [teamId]: Array.from(merged.values()) }))
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        setTeamOptionsLoading((prev) => ({ ...prev, [teamId]: false }))
      }
    }

    teams.forEach((team) => {
      void loadOptionsForTeam(team)
    })
  }, [teams, teamOptions])

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === editingTeamId) ?? null,
    [teams, editingTeamId],
  )

  const openEditor = useCallback(
    (team: Team) => {
      const initialUserIds = savedUserIdsByTeam[team.id] ?? (team.users ?? []).map((u) => u.id)
      const existingRoles = savedUserRolesByTeam[team.id] ?? {}
      const initialUserRoles = Object.fromEntries(
        initialUserIds.map((userId) => [userId, existingRoles[userId] ?? 'member']),
      ) as Record<number, TeamRole>
      setFlashError(null)
      setEditingTeamId(team.id)
      setModalUserIds(initialUserIds)
      setModalUserRoles(initialUserRoles)
    },
    [savedUserIdsByTeam, savedUserRolesByTeam],
  )

  const closeEditor = useCallback(() => {
    if (savingTeamId !== null) return
    setEditingTeamId(null)
    setModalUserIds([])
    setModalUserRoles({})
  }, [savingTeamId])

  const onModalUsersChange = useCallback(
    (nextIds: number[]) => {
      setModalUserIds(nextIds)
      setModalUserRoles((prev) => {
        const savedTeamRoles = activeTeam ? (savedUserRolesByTeam[activeTeam.id] ?? {}) : {}
        const nextRoles: Record<number, TeamRole> = {}
        nextIds.forEach((id) => {
          nextRoles[id] = prev[id] ?? savedTeamRoles[id] ?? 'member'
        })
        return nextRoles
      })
    },
    [activeTeam, savedUserRolesByTeam],
  )

  const onModalUserRoleChange = useCallback((userId: number, role: TeamRole) => {
    setModalUserRoles((prev) => ({ ...prev, [userId]: role }))
  }, [])

  const saveEditorAsync = useCallback(async () => {
    if (!activeTeam) return
    if (modalUserIds.length === 0) {
      setFlashError('Please select at least one user before saving.')
      return
    }
    const groupedByRole: Record<TeamRole, number[]> = {
      manager: [],
      leader: [],
      member: [],
    }
    modalUserIds.forEach((userId) => {
      const role = modalUserRoles[userId] ?? 'member'
      groupedByRole[role].push(userId)
    })

    try {
      setFlashError(null)
      setSavingTeamId(activeTeam.id)
      const tasks = (Object.keys(groupedByRole) as TeamRole[])
        .map((role) => ({ role, ids: groupedByRole[role] }))
        .filter((group) => group.ids.length > 0)
      for (const task of tasks) {
        await teamsApi.assignUsers(activeTeam.id, {
          user_ids: task.ids,
          team_role: task.role,
        })
      }

      setSavedUserIdsByTeam((prev) => ({ ...prev, [activeTeam.id]: modalUserIds }))
      const normalizedRoles = Object.fromEntries(
        modalUserIds.map((userId) => [userId, modalUserRoles[userId] ?? 'member']),
      ) as Record<number, TeamRole>
      setSavedUserRolesByTeam((prev) => ({ ...prev, [activeTeam.id]: normalizedRoles }))
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== activeTeam.id) return team
          const options = teamOptions[activeTeam.id] ?? []
          const selectedUsers = options.filter((opt) => modalUserIds.includes(opt.id))
          return {
            ...team,
            users_count: modalUserIds.length,
            users: selectedUsers,
          }
        }),
      )
      toast.success('Saved successfully')
      closeEditor()
    } catch (err) {
      setFlashError(formatApiError(err))
    } finally {
      setSavingTeamId(null)
    }
  }, [activeTeam, closeEditor, modalUserIds, modalUserRoles, teamOptions])

  const activeTeamOptions = useMemo(
    () => (activeTeam ? (teamOptions[activeTeam.id] ?? []) : []),
    [activeTeam, teamOptions],
  )
  const activeTeamOptionsLoading = activeTeam ? (teamOptionsLoading[activeTeam.id] ?? false) : false
  const activeTeamOptionById = useMemo(
    () => new Map(activeTeamOptions.map((option) => [option.id, option])),
    [activeTeamOptions],
  )
  const isSavingEditor = activeTeam ? savingTeamId === activeTeam.id : false

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
        Manage members for each team. Click{' '}
        <span className="font-medium text-foreground">Add members</span> or{' '}
        <span className="font-medium text-foreground">Edit members</span> to open the popup editor.
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
            const savedUserIds = savedUserIdsByTeam[team.id] ?? (team.users ?? []).map((u) => u.id)
            const savedRoles = savedUserRolesByTeam[team.id] ?? {}
            const roleCounts = savedUserIds.reduce(
              (acc, userId) => {
                const role = savedRoles[userId] ?? 'member'
                acc[role] += 1
                return acc
              },
              { manager: 0, leader: 0, member: 0 },
            )
            const isEmpty = savedUserIds.length === 0
            const optionsLoading = teamOptionsLoading[team.id] ?? false

            return (
              <div
                key={team.id}
                className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5"
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
                      {(team.users_count ?? savedUserIds.length) > 0 ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {team.users_count ?? savedUserIds.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {roleCounts.manager > 0 ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            Manager {roleCounts.manager}
                          </span>
                        ) : null}
                        {roleCounts.leader > 0 ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Leader {roleCounts.leader}
                          </span>
                        ) : null}
                        {roleCounts.member > 0 ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Member {roleCounts.member}
                          </span>
                        ) : null}
                        {optionsLoading ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Loading users...
                          </span>
                        ) : null}
                      </div>
                      {canAssign ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant={isEmpty ? 'default' : 'secondary'}
                            className="gap-1.5 font-medium"
                            onClick={() => openEditor(team)}
                          >
                            {isEmpty ? (
                              <UserPlus className="size-3.5" />
                            ) : (
                              <Pencil className="size-3.5" />
                            )}
                            {isEmpty ? 'Add members' : 'Edit members'}
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

      <Dialog
        open={editingTeamId !== null}
        onOpenChange={(open) => (!open ? closeEditor() : undefined)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {activeTeam ? `Manage Members · ${activeTeam.name}` : 'Manage Members'}
            </DialogTitle>
            <DialogDescription>
              Select users, then set role for each selected member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Users
              </p>
              {activeTeamOptionsLoading ? (
                <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Loading users…</span>
                </div>
              ) : (
                <AssignUsersChildrenPicker
                  disabled={!canAssign || isSavingEditor}
                  value={modalUserIds}
                  onChange={onModalUsersChange}
                  options={activeTeamOptions}
                />
              )}
            </div>

            {modalUserIds.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Member Roles
                </p>
                <div className="space-y-2">
                  {modalUserIds.map((userId) => {
                    const user = activeTeamOptionById.get(userId)
                    return (
                      <div
                        key={userId}
                        className="flex flex-col gap-2 rounded-md border border-border/70 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user?.name ?? `User #${userId}`}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user?.email ?? `ID: ${userId}`}
                          </p>
                        </div>
                        <div className="w-full sm:w-[170px]">
                          <SearchableSelect
                            disabled={!canAssign || isSavingEditor}
                            value={modalUserRoles[userId] ?? 'member'}
                            onValueChange={(value) =>
                              onModalUserRoleChange(userId, value as TeamRole)
                            }
                            options={USER_ROLE_OPTIONS}
                            placeholder="Select role"
                            searchPlaceholder="Search role..."
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeEditor} disabled={isSavingEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditorAsync()}
              disabled={
                !canAssign ||
                isSavingEditor ||
                activeTeamOptionsLoading ||
                modalUserIds.length === 0
              }
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
