import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { teamsApi } from '@/features/teams/api'
import {
  AssignMembersDialog,
  AssignToLeadersDialog,
  DeleteTeamDialog,
  TeamFormDialog,
  TeamsTableCard,
} from '@/features/teams/components'
import type {
  Team,
  TeamFilterParams,
  TeamLeaderOption,
  TeamParentChildOption,
  TeamRole,
} from '@/features/teams/types'
import { type AssignChildOption } from '@/features/users/components/AssignUsersChildrenPicker'
import { usersApi } from '@/features/users/api/users'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: TeamFilterParams = {
  query: null,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): TeamFilterParams {
  return {
    query: params.get('query'),
    order_by: params.get('order_by') as TeamFilterParams['order_by'],
    order: params.get('order') as TeamFilterParams['order'],
  }
}

function buildParams(filters: TeamFilterParams, pagination: TablePaginationState): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination)
  return params
}

export function TeamsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.TeamsCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.TeamsUpdate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.TeamsDelete), [perms])
  const canAssign = useMemo(() => hasPermission(perms, PermissionSlugs.TeamsAssign), [perms])

  // ── Table state ──────────────────────────────────────────────────────────
  const [data, setData] = useState<Team[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { filters, pagination, setPagination, onFilterChange, onFilterReset } =
    useTableUrlState<TeamFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
    })

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // ── Member assignment state ───────────────────────────────────────────────
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
  const [savingMembers, setSavingMembers] = useState(false)
  const [membersFlashError, setMembersFlashError] = useState<string | null>(null)

  // ── Leader assignment state ───────────────────────────────────────────────
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

  // ── Table data loading ───────────────────────────────────────────────────
  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => setRefreshSignal((s) => s + 1), [])

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: res } = await teamsApi.list({
          ...filters,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        })
        if (!ignore) {
          setData(res.data)
          setRowCount(res.pagination.total)
          setSavedUserIdsByTeam((prev) => {
            const patch: Record<number, number[]> = {}
            for (const team of res.data) {
              if (!(team.id in prev)) {
                patch[team.id] = (team.users ?? []).map((u) => u.id)
              }
            }
            return Object.keys(patch).length ? { ...prev, ...patch } : prev
          })
          setSavedUserRolesByTeam((prev) => {
            const patch: Record<number, Record<number, TeamRole>> = {}
            for (const team of res.data) {
              if (!(team.id in prev)) {
                patch[team.id] = (team.users ?? []).reduce<Record<number, TeamRole>>((acc, u) => {
                  acc[u.id] = u.team_role ?? 'member'
                  return acc
                }, {})
              }
            }
            return Object.keys(patch).length ? { ...prev, ...patch } : prev
          })
        }
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void fetchData()
    return () => {
      ignore = true
    }
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  const onSortingChange = useCallback(
    (orderBy: string | null, order: 'asc' | 'desc' | null) => {
      onFilterChange({
        order_by: (orderBy as TeamFilterParams['order_by']) ?? null,
        order: order ?? null,
      })
    },
    [onFilterChange],
  )

  const onAddClick = useCallback(() => {
    setEditTarget(null)
    setFormOpen(true)
  }, [])

  const onEditRow = useCallback((row: Team) => {
    setEditTarget(row)
    setFormOpen(true)
  }, [])

  const onDeleteRow = useCallback((row: Team) => {
    setDeleteTarget(row)
  }, [])

  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onFormOpenChange = useCallback((open: boolean) => {
    setFormOpen(open)
    if (!open) setEditTarget(null)
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => teamsApi.remove(id)))
      const failedIds = new Set<number>()
      let firstError: unknown = null
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedIds.add(ids[index])
          if (!firstError) firstError = result.reason
        }
      })
      const deletedCount = ids.length - failedIds.size
      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} team${deletedCount > 1 ? 's' : ''} successfully`)
      }
      if (firstError) toast.error(formatApiError(firstError))
      setSelectedIds(failedIds)
      setBulkDeleteOpen(false)
      loadData()
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, loadData])

  const onSuccess = useCallback(() => {
    loadData()
  }, [loadData])

  // ── Member assignment helpers ─────────────────────────────────────────────
  const fetchOptionsForTeam = useCallback(async (team: Team) => {
    const teamId = team.id
    setTeamOptionsLoading((prev) => ({ ...prev, [teamId]: true }))
    try {
      const { data: res } = await teamsApi.userOptions(teamId)
      const existingMembers: AssignChildOption[] = (team.users ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }))
      const candidateUsers: AssignChildOption[] = res.data.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }))
      const merged = new Map<number, AssignChildOption>()
      ;[...existingMembers, ...candidateUsers].forEach((option) => merged.set(option.id, option))
      setTeamOptions((prev) => ({ ...prev, [teamId]: Array.from(merged.values()) }))
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setTeamOptionsLoading((prev) => ({ ...prev, [teamId]: false }))
    }
  }, [])

  const editingTeam = useMemo(
    () => data.find((team) => team.id === editingTeamId) ?? null,
    [data, editingTeamId],
  )

  const openMembersEditor = useCallback(
    (team: Team) => {
      const savedIds = savedUserIdsByTeam[team.id] ?? (team.users ?? []).map((u) => u.id)
      const savedRoles = savedUserRolesByTeam[team.id] ?? {}
      setMembersFlashError(null)
      setEditingTeamId(team.id)
      setModalManagerIds(savedIds.filter((id) => savedRoles[id] === 'manager'))
      setModalLeaderIds(savedIds.filter((id) => savedRoles[id] === 'leader'))
      setModalMemberIds(savedIds.filter((id) => !savedRoles[id] || savedRoles[id] === 'member'))
      void fetchOptionsForTeam(team)
    },
    [savedUserIdsByTeam, savedUserRolesByTeam, fetchOptionsForTeam],
  )

  const closeMembersEditor = useCallback(() => {
    setEditingTeamId(null)
    setModalManagerIds([])
    setModalLeaderIds([])
    setModalMemberIds([])
    setMembersFlashError(null)
  }, [])

  const onMembersOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !savingMembers) closeMembersEditor()
    },
    [savingMembers, closeMembersEditor],
  )

  const saveMembersAsync = useCallback(async () => {
    if (!editingTeam) return
    const totalIds = [...modalManagerIds, ...modalLeaderIds, ...modalMemberIds]
    if (totalIds.length === 0) {
      setMembersFlashError('Please select at least one user before saving.')
      return
    }

    const savedRoles = savedUserRolesByTeam[editingTeam.id] ?? {}
    const savedIds = savedUserIdsByTeam[editingTeam.id] ?? []
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
    ).filter((t) => !setsEqual(t.ids, t.saved))

    if (tasks.length === 0) {
      setMembersFlashError('No changes detected.')
      return
    }

    try {
      setMembersFlashError(null)
      setSavingMembers(true)
      for (const task of tasks) {
        await teamsApi.assignUsers(editingTeam.id, {
          user_ids: task.ids,
          team_role: task.role,
        })
      }

      setSavedUserIdsByTeam((prev) => ({ ...prev, [editingTeam.id]: totalIds }))
      const normalizedRoles = Object.fromEntries([
        ...modalManagerIds.map((id) => [id, 'manager' as TeamRole]),
        ...modalLeaderIds.map((id) => [id, 'leader' as TeamRole]),
        ...modalMemberIds.map((id) => [id, 'member' as TeamRole]),
      ]) as Record<number, TeamRole>
      setSavedUserRolesByTeam((prev) => ({ ...prev, [editingTeam.id]: normalizedRoles }))
      setData((prev) =>
        prev.map((team) => {
          if (team.id !== editingTeam.id) return team
          const options = teamOptions[editingTeam.id] ?? []
          return {
            ...team,
            users_count: totalIds.length,
            users: options.filter((opt) => totalIds.includes(opt.id)),
          }
        }),
      )
      // Invalidate leader-assignment caches — roles may have changed
      setLeadersForTeam((prev) => {
        const next = { ...prev }
        delete next[editingTeam.id]
        return next
      })
      setParentChildOptionsForTeam((prev) => {
        const next = { ...prev }
        delete next[editingTeam.id]
        return next
      })

      toast.success('Saved successfully')
      closeMembersEditor()
    } catch (err) {
      setMembersFlashError(formatApiError(err))
    } finally {
      setSavingMembers(false)
    }
  }, [
    editingTeam,
    closeMembersEditor,
    modalManagerIds,
    modalLeaderIds,
    modalMemberIds,
    teamOptions,
    savedUserIdsByTeam,
    savedUserRolesByTeam,
  ])

  // ── Leader assignment helpers ─────────────────────────────────────────────
  const leaderAssignTeam = useMemo(
    () => data.find((t) => t.id === leaderAssignTeamId) ?? null,
    [data, leaderAssignTeamId],
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

  const pickerOptionsForLeaders = useMemo((): AssignChildOption[] => {
    if (!leaderAssignTeam) return []
    return (parentChildOptionsForTeam[leaderAssignTeam.id] ?? [])
      .filter((u) => u.team_role === 'member')
      .map((u) => ({ id: u.id, name: u.name, email: u.email }))
  }, [leaderAssignTeam, parentChildOptionsForTeam])

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
    setLeaderAssignTeamId(null)
    setLeaderModalChildIds({})
    setLeaderFlashError(null)
  }, [])

  const onLeaderAssignOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !savingLeaderAssign) closeLeaderAssignDialog()
    },
    [savingLeaderAssign, closeLeaderAssignDialog],
  )

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

  return (
    <div className="flex flex-col gap-8">
      <TeamsTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        filters={{ ...filters, page: pagination.pageIndex + 1, per_page: pagination.pageSize }}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onPaginationChange={(page, perPage) =>
          setPagination({ pageIndex: page - 1, pageSize: perPage })
        }
        onSortingChange={onSortingChange}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canAssign={canAssign}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
        onAddMembers={openMembersEditor}
        onEditMembers={openMembersEditor}
        onAssignToLeaders={(team: Team) => void openLeaderAssignDialog(team)}
        savedUserIdsByTeam={savedUserIdsByTeam}
        savedUserRolesByTeam={savedUserRolesByTeam}
        teamOptionsLoading={teamOptionsLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />

      <TeamFormDialog
        open={formOpen}
        onOpenChange={onFormOpenChange}
        team={editTarget}
        onSuccess={onSuccess}
      />

      <DeleteTeamDialog
        team={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onSuccess}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="team"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />

      <AssignMembersDialog
        open={editingTeamId !== null}
        onOpenChange={onMembersOpenChange}
        team={editingTeam}
        options={editingTeam ? (teamOptions[editingTeam.id] ?? []) : []}
        optionsLoading={editingTeam ? (teamOptionsLoading[editingTeam.id] ?? false) : false}
        canAssign={canAssign}
        managerIds={modalManagerIds}
        onManagerIdsChange={setModalManagerIds}
        leaderIds={modalLeaderIds}
        onLeaderIdsChange={setModalLeaderIds}
        memberIds={modalMemberIds}
        onMemberIdsChange={setModalMemberIds}
        saving={savingMembers}
        flashError={membersFlashError}
        onSave={() => void saveMembersAsync()}
      />

      <AssignToLeadersDialog
        open={leaderAssignTeamId !== null}
        onOpenChange={onLeaderAssignOpenChange}
        team={leaderAssignTeam}
        leaders={leaderAssignLeaders}
        leadersLoading={isLeadersLoading}
        parentChildOptionsLoading={isParentChildOptionsLoading}
        canAssign={canAssign}
        leaderModalChildIds={leaderModalChildIds}
        onLeaderChildIdsChange={setLeaderChildIds}
        pickerOptions={pickerOptionsForLeaders}
        saving={savingLeaderAssign}
        flashError={leaderFlashError}
        onSave={() => void saveLeaderAssignAsync()}
      />
    </div>
  )
}
