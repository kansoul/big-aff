import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { MRT_SortingState } from 'mantine-react-table'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { rolesApi } from '@/features/settings/api/roles'
import { formatApiError } from '@/features/settings/components'
import { stylesApi } from '@/features/styles/api'
import type { StyleOption } from '@/features/styles/types'
import { teamsApi } from '@/features/teams/api'
import { usersApi } from '@/features/users/api/users'
import {
  DeleteUserDialog,
  SettingsUsersTableCard,
  UserFormDialog,
} from '@/features/users/components'
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateFormValues,
  type UserFilterParams,
  type UserOrderBy,
  type UserUpdateFormValues,
  type UserUpdatePayload,
} from '@/features/users/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import type { ManagedUser } from '@/shared/types'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

type RoleOption = { id: number; name: string }

const DEFAULT_FILTERS: UserFilterParams = { order: null, order_by: null }

function parseFilters(params: URLSearchParams): UserFilterParams {
  return {
    order_by: params.get('order_by') as UserFilterParams['order_by'],
    order: params.get('order') as UserFilterParams['order'],
  }
}

function buildParams(filters: UserFilterParams, pagination: TablePaginationState): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination)
  return params
}

function normalizeRoleOptions(data: unknown): RoleOption[] {
  if (Array.isArray(data)) {
    return data as RoleOption[]
  }

  if (data && typeof data === 'object') {
    return Object.values(data) as RoleOption[]
  }

  return []
}

export function SettingsUsersPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsUsersCreate),
    [perms],
  )
  const canUpdate = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsUsersUpdate),
    [perms],
  )
  const canDelete = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsUsersDelete),
    [perms],
  )
  const canViewStyles = useMemo(() => hasPermission(perms, PermissionSlugs.StylesView), [perms])

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([])
  const [teamOptions, setTeamOptions] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  const { filters, setFilters, pagination, setPagination } = useTableUrlState<UserFilterParams>({
    parseFilters,
    buildParams,
    defaultFilters: DEFAULT_FILTERS,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [deleteUserRow, setDeleteUserRow] = useState<ManagedUser | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const createForm = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role_id: 0,
      style_id: null,
      team_id: null,
    },
  })

  const editForm = useForm<UserUpdateFormValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role_id: 0,
      style_id: null,
      team_id: null,
    },
  })

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const [usersRes, roleOptionsRes, styleOptionsRes, teamOptionsRes] = await Promise.all([
          usersApi.list(pagination.pageIndex + 1, pagination.pageSize, filters),
          rolesApi.listOptions(),
          canViewStyles ? stylesApi.options() : Promise.resolve(null),
          teamsApi.listOptions(),
        ])
        if (!ignore) {
          setUsers(usersRes.data.data)
          setRowCount(usersRes.data.pagination.total)
          setRoles(normalizeRoleOptions(roleOptionsRes.data.data))
          if (styleOptionsRes) {
            setStyleOptions(styleOptionsRes.data)
          }
          if (teamOptionsRes) {
            setTeamOptions(teamOptionsRes.data.data)
          }
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal, canViewStyles])

  const onSortingChange = useCallback(
    (sorting: MRT_SortingState) => {
      const first = sorting[0] ?? null
      setFilters((prev) => ({
        ...prev,
        order_by: first ? (first.id as UserOrderBy) : null,
        order: first ? (first.desc ? 'desc' : 'asc') : null,
      }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    [setFilters, setPagination],
  )

  const onCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open)
      if (open) {
        setFormError(null)
        const firstRoleId = roles[0]?.id ?? 0
        createForm.reset({
          name: '',
          email: '',
          password: '',
          role_id: firstRoleId,
          style_id: null,
          team_id: null,
        })
      } else {
        setFormError(null)
      }
    },
    [createForm, roles],
  )

  useEffect(() => {
    if (editUser) {
      editForm.reset({
        name: editUser.name,
        email: editUser.email,
        password: '',
        role_id: editUser.role_id ?? roles[0]?.id ?? 0,
        style_id: editUser.style_id ?? null,
        team_id: null, // Reset for edit as we don't necessarily show it on edit if already assigned
      })
    }
  }, [editUser, editForm, roles])

  const onCreateSubmit = async (
    values: UserCreateFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await usersApi.create({
        name: values.name,
        email: values.email,
        password: values.password,
        role_id: values.role_id,
        ...(canViewStyles ? { style_id: values.style_id ?? null } : {}),
        team_id: values.team_id ?? null,
      })
      const firstRoleId = roles[0]?.id ?? 0
      createForm.reset({
        name: '',
        email: '',
        password: '',
        role_id: firstRoleId,
        style_id: null,
        team_id: null,
      })
      if (!options?.createAnother) {
        setCreateOpen(false)
      }
      loadData()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onEditSubmit = async (values: UserUpdateFormValues) => {
    if (!editUser) {
      return
    }
    try {
      setFormError(null)
      setSubmitting(true)
      const payload: UserUpdatePayload = {
        name: values.name,
        email: values.email,
        role_id: values.role_id,
        ...(canViewStyles ? { style_id: values.style_id ?? null } : {}),
      }
      if (values.password.length > 0) {
        payload.password = values.password
      }
      await usersApi.update(editUser.id, payload)
      setEditUser(null)
      loadData()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!deleteUserRow) {
      return
    }
    try {
      setFormError(null)
      setDeleting(true)
      await usersApi.remove(deleteUserRow.id)
      setDeleteUserRow(null)
      loadData()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const onAddClick = useCallback(() => {
    setFormError(null)
    setCreateOpen(true)
  }, [])

  const onEditRow = useCallback((row: ManagedUser) => {
    setFormError(null)
    setEditUser(row)
  }, [])

  const onDeleteRow = useCallback((row: ManagedUser) => {
    setFormError(null)
    setDeleteUserRow(row)
  }, [])

  const onEditOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditUser(null)
      setFormError(null)
    }
  }, [])

  const onDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteUserRow(null)
      setFormError(null)
    }
  }, [])

  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      setFormError(null)
      const results = await Promise.allSettled(ids.map((id) => usersApi.remove(id)))
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
        toast.success(`Deleted ${deletedCount} user${deletedCount > 1 ? 's' : ''} successfully`)
      }
      if (firstError) {
        setFormError(formatApiError(firstError))
      }

      setSelectedIds(failedIds)
      setBulkDeleteOpen(false)
      loadData()
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, loadData])

  return (
    <div className="flex flex-col gap-8">
      <SettingsUsersTableCard
        loading={loading}
        users={users}
        rowCount={rowCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        filters={filters}
        onSortingChange={onSortingChange}
        currentUserId={user?.id}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />
      <UserFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        formError={formError}
        form={createForm}
        roles={roles}
        styleOptions={canViewStyles ? styleOptions : undefined}
        teamOptions={teamOptions}
        submitting={submitting}
        onSubmit={onCreateSubmit}
      />
      <UserFormDialog
        open={!!editUser}
        onOpenChange={onEditOpenChange}
        user={editUser}
        formError={formError}
        form={editForm}
        roles={roles}
        styleOptions={canViewStyles ? styleOptions : undefined}
        teamOptions={teamOptions}
        submitting={submitting}
        onSubmit={onEditSubmit}
      />
      <DeleteUserDialog
        userRow={deleteUserRow}
        onOpenChange={onDeleteDialogOpenChange}
        formError={formError}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
      />
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="user"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}
