import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, Network, Pencil, UserPlus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'

import { teamsApi } from '@/features/teams/api'
import type {
  Team,
  TeamLeaderOption,
  TeamParentChildOption,
  TeamRole,
} from '@/features/teams/types'
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
  const [modalManagerIds, setModalManagerIds] = useState<number[]>([])
  const [modalLeaderIds, setModalLeaderIds] = useState<number[]>([])
  const [modalMemberIds, setModalMemberIds] = useState<number[]>([])

  const [savingTeamId, setSavingTeamId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)

  // ── Leader-assignment dialog ──────────────────────────────────────────────
  const [leaderAssignTeamId, setLeaderAssignTeamId] = useState<number | null>(null)
  const [leadersForTeam, setLeadersForTeam] = useState<Record<number, TeamLeaderOption[]>>({})
  const [leadersForTeamLoading, setLeadersForTeamLoading] = useState<Record<number, boolean>>({})
  const [leaderModalChildIds, setLeaderModalChildIds] = useState<Record<number, number[]>>({})
  const [savingLeaderAssign, setSavingLeaderAssign] = useState(false)
  const [leaderFlashError, setLeaderFlashError] = useState<string | null>(null)
  const [parentChildOptionsForTeam, setParentChildOptionsForTeam] = useState<
    Record<number, TeamParentChildOption[]>
  >({})
  const [parentChildOptionsLoading, setParentChildOptionsLoading] = useState<
    Record<number, boolean>
  >({})

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
                acc[u.id] = u.team_role ?? 'member'
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

  const fetchOptionsForTeam = useCallback(async (team: Team) => {
    const teamId = team.id
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
  }, [])

  useEffect(() => {
    if (teams.length === 0) return
    teams.forEach((team) => {
      if (teamOptions[team.id] || teamOptionsLoading[team.id]) return
      void fetchOptionsForTeam(team)
    })
  }, [teams, teamOptions, teamOptionsLoading, fetchOptionsForTeam])

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === editingTeamId) ?? null,
    [teams, editingTeamId],
  )

  const openEditor = useCallback(
    (team: Team) => {
      const savedIds = savedUserIdsByTeam[team.id] ?? (team.users ?? []).map((u) => u.id)
      const savedRoles = savedUserRolesByTeam[team.id] ?? {}
      setFlashError(null)
      setEditingTeamId(team.id)
      setModalManagerIds(savedIds.filter((id) => savedRoles[id] === 'manager'))
      setModalLeaderIds(savedIds.filter((id) => savedRoles[id] === 'leader'))
      setModalMemberIds(savedIds.filter((id) => !savedRoles[id] || savedRoles[id] === 'member'))
      void fetchOptionsForTeam(team)
    },
    [savedUserIdsByTeam, savedUserRolesByTeam, fetchOptionsForTeam],
  )

  const closeEditor = useCallback(() => {
    if (savingTeamId !== null) return
    setEditingTeamId(null)
    setModalManagerIds([])
    setModalLeaderIds([])
    setModalMemberIds([])
  }, [savingTeamId])

  const saveEditorAsync = useCallback(async () => {
    if (!activeTeam) return
    const totalIds = [...modalManagerIds, ...modalLeaderIds, ...modalMemberIds]
    if (totalIds.length === 0) {
      setFlashError('Please select at least one user before saving.')
      return
    }

    const savedRoles = savedUserRolesByTeam[activeTeam.id] ?? {}
    const savedIds = savedUserIdsByTeam[activeTeam.id] ?? []
    const setsEqual = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false
      const setB = new Set(b)
      return a.every((id) => setB.has(id))
    }
    const savedManagerIds = savedIds.filter((id) => savedRoles[id] === 'manager')
    const savedLeaderIds = savedIds.filter((id) => savedRoles[id] === 'leader')
    const savedMemberIds = savedIds.filter((id) => !savedRoles[id] || savedRoles[id] === 'member')

    const tasks = (
      [
        { role: 'manager' as TeamRole, ids: modalManagerIds, saved: savedManagerIds },
        { role: 'leader' as TeamRole, ids: modalLeaderIds, saved: savedLeaderIds },
        { role: 'member' as TeamRole, ids: modalMemberIds, saved: savedMemberIds },
      ] as const
    ).filter((t) => t.ids.length >= 1 && !setsEqual(t.ids, t.saved))

    if (tasks.length === 0) {
      setFlashError('Minimum one user must be selected for each role.')
      return
    }

    try {
      setFlashError(null)
      setSavingTeamId(activeTeam.id)
      for (const task of tasks) {
        await teamsApi.assignUsers(activeTeam.id, {
          user_ids: task.ids,
          team_role: task.role,
        })
      }

      setSavedUserIdsByTeam((prev) => ({ ...prev, [activeTeam.id]: totalIds }))
      const normalizedRoles = Object.fromEntries([
        ...modalManagerIds.map((id) => [id, 'manager' as TeamRole]),
        ...modalLeaderIds.map((id) => [id, 'leader' as TeamRole]),
        ...modalMemberIds.map((id) => [id, 'member' as TeamRole]),
      ]) as Record<number, TeamRole>
      setSavedUserRolesByTeam((prev) => ({ ...prev, [activeTeam.id]: normalizedRoles }))
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== activeTeam.id) return team
          const options = teamOptions[activeTeam.id] ?? []
          const selectedUsers = options.filter((opt) => totalIds.includes(opt.id))
          return {
            ...team,
            users_count: totalIds.length,
            users: selectedUsers,
          }
        }),
      )
      // Invalidate leader-assignment caches — roles may have changed (e.g. a leader was removed)
      setLeadersForTeam((prev) => {
        const next = { ...prev }
        delete next[activeTeam.id]
        return next
      })
      setParentChildOptionsForTeam((prev) => {
        const next = { ...prev }
        delete next[activeTeam.id]
        return next
      })

      toast.success('Saved successfully')
      closeEditor()
    } catch (err) {
      setFlashError(formatApiError(err))
    } finally {
      setSavingTeamId(null)
    }
  }, [
    activeTeam,
    closeEditor,
    modalManagerIds,
    modalLeaderIds,
    modalMemberIds,
    teamOptions,
    savedUserIdsByTeam,
    savedUserRolesByTeam,
  ])

  const activeTeamOptions = useMemo(
    () => (activeTeam ? (teamOptions[activeTeam.id] ?? []) : []),
    [activeTeam, teamOptions],
  )
  const activeTeamOptionsLoading = activeTeam ? (teamOptionsLoading[activeTeam.id] ?? false) : false
  const isSavingEditor = activeTeam ? savingTeamId === activeTeam.id : false

  // Each picker only shows users not already selected in the other two pickers
  const managerPickerOptions = useMemo(
    () =>
      activeTeamOptions.filter(
        (o) => !modalLeaderIds.includes(o.id) && !modalMemberIds.includes(o.id),
      ),
    [activeTeamOptions, modalLeaderIds, modalMemberIds],
  )
  const leaderPickerOptions = useMemo(
    () =>
      activeTeamOptions.filter(
        (o) => !modalManagerIds.includes(o.id) && !modalMemberIds.includes(o.id),
      ),
    [activeTeamOptions, modalManagerIds, modalMemberIds],
  )
  const memberPickerOptions = useMemo(
    () =>
      activeTeamOptions.filter(
        (o) => !modalManagerIds.includes(o.id) && !modalLeaderIds.includes(o.id),
      ),
    [activeTeamOptions, modalManagerIds, modalLeaderIds],
  )

  const modalTotalCount = modalManagerIds.length + modalLeaderIds.length + modalMemberIds.length

  // ── Leader-assignment dialog helpers ─────────────────────────────────────
  const leaderAssignTeam = useMemo(
    () => teams.find((t) => t.id === leaderAssignTeamId) ?? null,
    [teams, leaderAssignTeamId],
  )

  const leaderAssignLeaders = useMemo(
    () => (leaderAssignTeam ? (leadersForTeam[leaderAssignTeam.id] ?? []) : []),
    [leaderAssignTeam, leadersForTeam],
  )

  const isLeadersLoading = leaderAssignTeam
    ? (leadersForTeamLoading[leaderAssignTeam.id] ?? false)
    : false

  const isParentChildOptionsLoading = leaderAssignTeam
    ? (parentChildOptionsLoading[leaderAssignTeam.id] ?? false)
    : false

  const getPickerOptionsForLeader = useCallback(
    (leader: TeamLeaderOption): AssignChildOption[] => {
      if (!leaderAssignTeam) return []
      const options = parentChildOptionsForTeam[leaderAssignTeam.id] ?? []

      // IDs currently selected by OTHER leaders in this dialog session
      const selectedByOtherLeaders = new Set(
        Object.entries(leaderModalChildIds)
          .filter(([leaderId]) => Number(leaderId) !== leader.id)
          .flatMap(([, ids]) => ids),
      )

      // IDs originally assigned to ANY leader in this team (within-team assignments)
      // These are safe to reassign within the dialog even if is_assigned_child = true
      const managedByThisDialog = new Set(
        (leadersForTeam[leaderAssignTeam.id] ?? []).flatMap((l) =>
          (l.assigned_users ?? []).map((u) => u.id),
        ),
      )

      return options
        .filter(
          (u) =>
            u.team_role === 'member' &&
            !selectedByOtherLeaders.has(u.id) &&
            (!u.is_assigned_child || managedByThisDialog.has(u.id)),
        )
        .map((u) => ({ id: u.id, name: u.name, email: u.email }))
    },
    [leaderAssignTeam, parentChildOptionsForTeam, leaderModalChildIds, leadersForTeam],
  )

  const openLeaderAssignDialog = useCallback(
    async (team: Team) => {
      setLeaderFlashError(null)
      setLeaderModalChildIds({})
      setLeaderAssignTeamId(team.id)

      const needsLeaders = !leadersForTeam[team.id] && !leadersForTeamLoading[team.id]
      const needsOptions =
        !parentChildOptionsForTeam[team.id] && !parentChildOptionsLoading[team.id]

      if (needsLeaders) setLeadersForTeamLoading((prev) => ({ ...prev, [team.id]: true }))
      if (needsOptions) setParentChildOptionsLoading((prev) => ({ ...prev, [team.id]: true }))

      try {
        const [leadersRes, optionsRes] = await Promise.all([
          needsLeaders ? teamsApi.leaders(team.id) : null,
          needsOptions ? teamsApi.parentChildOptions(team.id) : null,
        ])

        if (leadersRes) {
          const leaders = leadersRes.data.data
          setLeadersForTeam((prev) => ({ ...prev, [team.id]: leaders }))
          const initial: Record<number, number[]> = {}
          for (const l of leaders) {
            initial[l.id] = (l.assigned_users ?? []).map((u) => u.id)
          }
          setLeaderModalChildIds(initial)
        } else if (leadersForTeam[team.id]) {
          const initial: Record<number, number[]> = {}
          for (const l of leadersForTeam[team.id]) {
            initial[l.id] = (l.assigned_users ?? []).map((u) => u.id)
          }
          setLeaderModalChildIds(initial)
        }

        if (optionsRes) {
          setParentChildOptionsForTeam((prev) => ({ ...prev, [team.id]: optionsRes.data.data }))
        }
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        if (needsLeaders) setLeadersForTeamLoading((prev) => ({ ...prev, [team.id]: false }))
        if (needsOptions) setParentChildOptionsLoading((prev) => ({ ...prev, [team.id]: false }))
      }
    },
    [leadersForTeam, leadersForTeamLoading, parentChildOptionsForTeam, parentChildOptionsLoading],
  )

  const closeLeaderAssignDialog = useCallback(() => {
    if (savingLeaderAssign) return
    setLeaderAssignTeamId(null)
    setLeaderModalChildIds({})
    setLeaderFlashError(null)
  }, [savingLeaderAssign])

  const setLeaderChildIds = useCallback((leaderId: number, ids: number[]) => {
    setLeaderModalChildIds((prev) => ({ ...prev, [leaderId]: ids }))
  }, [])

  const saveLeaderAssignAsync = useCallback(async () => {
    if (!leaderAssignTeam) return
    const leaders = leadersForTeam[leaderAssignTeam.id] ?? []

    const setsEqual = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false
      const setB = new Set(b)
      return a.every((id) => setB.has(id))
    }

    const changed = leaders.filter((leader) => {
      const savedIds = (leader.assigned_users ?? []).map((u) => u.id)
      const modalIds = leaderModalChildIds[leader.id] ?? []
      return !setsEqual(savedIds, modalIds)
    })

    if (changed.length === 0) {
      setLeaderFlashError('No changes detected.')
      return
    }

    try {
      setLeaderFlashError(null)
      setSavingLeaderAssign(true)
      for (const leader of changed) {
        await usersApi.syncParentChildren(leader.id, leaderModalChildIds[leader.id] ?? [])
      }

      const currentOptions = parentChildOptionsForTeam[leaderAssignTeam.id] ?? []
      const updatedLeaders = leaders.map((leader) => {
        if (!changed.find((c) => c.id === leader.id)) return leader
        const newIds = leaderModalChildIds[leader.id] ?? []
        const assigned = currentOptions
          .filter((u) => newIds.includes(u.id))
          .map((u) => ({ id: u.id, name: u.name, email: u.email }))
        return { ...leader, assigned_users: assigned }
      })
      setLeadersForTeam((prev) => ({ ...prev, [leaderAssignTeam.id]: updatedLeaders }))
      // Invalidate parent-child options cache so next open fetches fresh is_assigned_child state
      setParentChildOptionsForTeam((prev) => {
        const next = { ...prev }
        delete next[leaderAssignTeam.id]
        return next
      })

      toast.success('Saved successfully')
      closeLeaderAssignDialog()
    } catch (err) {
      setLeaderFlashError(formatApiError(err))
    } finally {
      setSavingLeaderAssign(false)
    }
  }, [
    leaderAssignTeam,
    leadersForTeam,
    leaderModalChildIds,
    parentChildOptionsForTeam,
    closeLeaderAssignDialog,
  ])

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
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            Manager {roleCounts.manager}
                          </span>
                        ) : null}
                        {roleCounts.leader > 0 ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
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
                        <div className="flex flex-wrap justify-end gap-2">
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
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 font-medium"
                            onClick={() => void openLeaderAssignDialog(team)}
                          >
                            <Network className="size-3.5" />
                            Assign to leaders
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
              Assign users to each role. A user can only belong to one role at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Manager picker */}
            <div className="rounded-lg border border-border border-l-2 border-l-blue-300 p-3 dark:border-l-blue-700">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                  Managers
                </p>
                {modalManagerIds.length > 0 ? (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                    {modalManagerIds.length}
                  </span>
                ) : null}
              </div>
              {activeTeamOptionsLoading ? (
                <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Loading users…</span>
                </div>
              ) : (
                <AssignUsersChildrenPicker
                  disabled={!canAssign || isSavingEditor}
                  value={modalManagerIds}
                  onChange={setModalManagerIds}
                  options={managerPickerOptions}
                  placeholder="Select managers…"
                  tagClassName="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                />
              )}
            </div>

            {/* Leader picker */}
            <div className="rounded-lg border border-border border-l-2 border-l-amber-300 p-3 dark:border-l-amber-700">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Leaders
                </p>
                {modalLeaderIds.length > 0 ? (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    {modalLeaderIds.length}
                  </span>
                ) : null}
              </div>
              {activeTeamOptionsLoading ? (
                <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Loading users…</span>
                </div>
              ) : (
                <AssignUsersChildrenPicker
                  disabled={!canAssign || isSavingEditor}
                  value={modalLeaderIds}
                  onChange={setModalLeaderIds}
                  options={leaderPickerOptions}
                  placeholder="Select leaders…"
                  tagClassName="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                />
              )}
            </div>

            {/* Member picker */}
            <div className="rounded-lg border border-border border-l-2 border-l-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Members
                </p>
                {modalMemberIds.length > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {modalMemberIds.length}
                  </span>
                ) : null}
              </div>
              {activeTeamOptionsLoading ? (
                <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Loading users…</span>
                </div>
              ) : (
                <AssignUsersChildrenPicker
                  disabled={!canAssign || isSavingEditor}
                  value={modalMemberIds}
                  onChange={setModalMemberIds}
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
            <Button type="button" variant="outline" onClick={closeEditor} disabled={isSavingEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditorAsync()}
              disabled={
                !canAssign || isSavingEditor || activeTeamOptionsLoading || modalTotalCount === 0
              }
              className="gap-1.5"
            >
              {isSavingEditor ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {isSavingEditor ? 'Saving…' : 'Save members'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Leader-assignment dialog */}
      <Dialog
        open={leaderAssignTeamId !== null}
        onOpenChange={(open) => (!open ? closeLeaderAssignDialog() : undefined)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {leaderAssignTeam
                ? `Assign to Leaders · ${leaderAssignTeam.name}`
                : 'Assign to Leaders'}
            </DialogTitle>
            <DialogDescription>Select members to assign under each leader.</DialogDescription>
          </DialogHeader>

          {isLeadersLoading ? (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : leaderAssignLeaders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <UsersRound className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No leaders in this team</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderAssignLeaders.map((leader) => (
                <div
                  key={leader.id}
                  className="rounded-lg border border-border border-l-2 border-l-amber-300 p-3 dark:border-l-amber-700"
                >
                  <div className="mb-2">
                    <p className="text-sm font-medium text-foreground">{leader.name}</p>
                    <p className="text-xs text-muted-foreground">{leader.email}</p>
                  </div>
                  {isParentChildOptionsLoading ? (
                    <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Loading members…</span>
                    </div>
                  ) : (
                    <AssignUsersChildrenPicker
                      disabled={!canAssign || savingLeaderAssign}
                      value={leaderModalChildIds[leader.id] ?? []}
                      onChange={(ids) => setLeaderChildIds(leader.id, ids)}
                      options={getPickerOptionsForLeader(leader)}
                      placeholder="Select members…"
                      tagClassName="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {leaderFlashError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{leaderFlashError}</p>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeLeaderAssignDialog}
              disabled={savingLeaderAssign}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveLeaderAssignAsync()}
              disabled={
                !canAssign || savingLeaderAssign || isLeadersLoading || isParentChildOptionsLoading
              }
              className="gap-1.5"
            >
              {savingLeaderAssign ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {savingLeaderAssign ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
