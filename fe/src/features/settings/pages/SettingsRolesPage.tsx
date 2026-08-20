import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { rolesApi } from '@/features/settings/api/roles'
import {
  CreateRoleDialog,
  DeleteRoleDialog,
  EditRoleDialog,
  SettingsRolesTableCard,
  formatApiError,
  roleNameSchema,
  type RoleNameFormValues,
} from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import type { Role } from '@/shared/types'

export function SettingsRolesPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  // Non-admin users can only assign permissions they themselves have
  const allowedPermissions = user?.is_admin ? null : perms
  const canCreate = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsRolesCreate),
    [perms],
  )
  const canUpdate = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsRolesUpdate),
    [perms],
  )
  const canDelete = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsRolesDelete),
    [perms],
  )
  const canAssign = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsRolesAssign),
    [perms],
  )

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createPermissions, setCreatePermissions] = useState<string[]>([])
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const roleList = await rolesApi.list()
        if (!ignore) {
          setRoles(roleList)
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
  }, [refreshSignal])

  const createForm = useForm<RoleNameFormValues>({
    resolver: zodResolver(roleNameSchema),
    defaultValues: { name: '' },
  })

  const editForm = useForm<RoleNameFormValues>({
    resolver: zodResolver(roleNameSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (editRole) {
      editForm.reset({ name: editRole.name })
      setSelectedPermissions([...editRole.permissions])
    }
  }, [editRole, editForm])

  const onCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open)
      if (open) {
        setCreatePermissions([])
      } else {
        createForm.reset({ name: '' })
        setCreatePermissions([])
        setFormError(null)
      }
    },
    [createForm],
  )

  const onEditOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditRole(null)
      setFormError(null)
    }
  }, [])

  const onCreateSubmit = async (
    values: RoleNameFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await rolesApi.create({
        name: values.name,
        ...(canAssign ? { permissions: createPermissions } : {}),
      })
      createForm.reset({ name: '' })
      setCreatePermissions([])
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

  const onEditSubmit = async (values: RoleNameFormValues) => {
    if (!editRole) {
      return
    }
    if (!canUpdate && !canAssign) {
      return
    }
    try {
      setFormError(null)
      setSubmitting(true)
      const payload: { name?: string; permissions?: string[] } = {}
      if (canUpdate) {
        payload.name = values.name
      }
      if (canAssign) {
        payload.permissions = selectedPermissions
      }
      await rolesApi.update(editRole.id, payload)
      setEditRole(null)
      loadData()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!deleteRole) {
      return
    }
    try {
      setFormError(null)
      setDeleting(true)
      await rolesApi.remove(deleteRole.id)
      setDeleteRole(null)
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

  const onEditRow = useCallback((row: Role) => {
    setFormError(null)
    setEditRole(row)
  }, [])

  const onDeleteRow = useCallback((row: Role) => {
    setFormError(null)
    setDeleteRole(row)
  }, [])

  const onDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteRole(null)
      setFormError(null)
    }
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <SettingsRolesTableCard
        loading={loading}
        roles={roles}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canAssign={canAssign}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
      />

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        canAssign={canAssign}
        formError={formError}
        createForm={createForm}
        createPermissions={createPermissions}
        setCreatePermissions={setCreatePermissions}
        submitting={submitting}
        onSubmit={onCreateSubmit}
        allowedPermissions={allowedPermissions}
      />

      <EditRoleDialog
        role={editRole}
        onOpenChange={onEditOpenChange}
        canUpdate={canUpdate}
        canAssign={canAssign}
        formError={formError}
        editForm={editForm}
        selectedPermissions={selectedPermissions}
        setSelectedPermissions={setSelectedPermissions}
        submitting={submitting}
        onSubmit={onEditSubmit}
      />

      <DeleteRoleDialog
        role={deleteRole}
        onOpenChange={onDeleteDialogOpenChange}
        formError={formError}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
      />
    </div>
  )
}
