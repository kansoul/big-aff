import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

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
import { PermissionScope, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import type { Role } from '@/shared/types'

export function SettingsRolesPage() {
  const user = useAuthStore((s) => s.user)
  const scopes = user?.permissions
  const canCreate = useMemo(
    () => hasPermission(scopes, PermissionScope.settings.roles.create),
    [scopes],
  )
  const canUpdate = useMemo(
    () => hasPermission(scopes, PermissionScope.settings.roles.update),
    [scopes],
  )
  const canDelete = useMemo(
    () => hasPermission(scopes, PermissionScope.settings.roles.delete),
    [scopes],
  )
  const canAssign = useMemo(
    () => hasPermission(scopes, PermissionScope.settings.roles.assign),
    [scopes],
  )

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createPermissionMask, setCreatePermissionMask] = useState(0)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)
  const [selectedPermissionMask, setSelectedPermissionMask] = useState(0)

  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setListError(null)
      setLoading(true)
      const roleList = await rolesApi.list()
      setRoles(roleList)
    } catch (err) {
      setListError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

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
      setSelectedPermissionMask(editRole.permission_mask)
    }
  }, [editRole, editForm])

  const onCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open)
      if (open) {
        setCreatePermissionMask(0)
      } else {
        createForm.reset({ name: '' })
        setCreatePermissionMask(0)
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

  const onCreateSubmit = async (values: RoleNameFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await rolesApi.create({
        name: values.name,
        permission_mask: canAssign ? createPermissionMask : 0,
      })
      setCreateOpen(false)
      createForm.reset({ name: '' })
      await loadData()
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
      const payload: { name?: string; permission_mask?: number } = {}
      if (canUpdate) {
        payload.name = values.name
      }
      if (canAssign) {
        payload.permission_mask = selectedPermissionMask
      }
      await rolesApi.update(editRole.id, payload)
      setEditRole(null)
      await loadData()
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
      await loadData()
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
        listError={listError}
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
        createPermissionMask={createPermissionMask}
        setCreatePermissionMask={setCreatePermissionMask}
        submitting={submitting}
        onSubmit={onCreateSubmit}
      />

      <EditRoleDialog
        role={editRole}
        onOpenChange={onEditOpenChange}
        canUpdate={canUpdate}
        canAssign={canAssign}
        formError={formError}
        editForm={editForm}
        selectedPermissionMask={selectedPermissionMask}
        setSelectedPermissionMask={setSelectedPermissionMask}
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
