import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Form } from '@/components/ui/form'
import { MediaPickerField } from '@/components/common/MediaPickerDialog'
import { rolesApi } from '@/features/settings/api/roles'
import { formatApiError } from '@/features/settings/components'
import { usersApi } from '@/features/users/api/users'
import {
  CreateUserDialog,
  DeleteUserDialog,
  EditUserDialog,
  SettingsUsersTableCard,
} from '@/features/users/components'
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateFormValues,
  type UserUpdateFormValues,
  type UserUpdatePayload,
} from '@/features/users/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import type { ManagedUser, Role } from '@/shared/types'
import type { Media } from '@/features/media/types'

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

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [deleteUserRow, setDeleteUserRow] = useState<ManagedUser | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const testForm = useForm<{ avatar: Media | null }>({ defaultValues: { avatar: null } })
  const avatar = testForm.watch('avatar')

  const createForm = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role_id: 0,
    },
  })

  const editForm = useForm<UserUpdateFormValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role_id: 0,
    },
  })

  const loadData = useCallback(async () => {
    try {
      setListError(null)
      setLoading(true)
      const [userList, roleList] = await Promise.all([usersApi.list(), rolesApi.list()])
      setUsers(userList)
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
      })
    }
  }, [editUser, editForm, roles])

  const onCreateSubmit = async (values: UserCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await usersApi.create({
        name: values.name,
        email: values.email,
        password: values.password,
        role_id: values.role_id,
      })
      setCreateOpen(false)
      await loadData()
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
      }
      if (values.password.length > 0) {
        payload.password = values.password
      }
      await usersApi.update(editUser.id, payload)
      setEditUser(null)
      await loadData()
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

  return (
    <div className="flex flex-col gap-8">
      <SettingsUsersTableCard
        listError={listError}
        loading={loading}
        users={users}
        currentUserId={user?.id}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
      />
      <CreateUserDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        formError={formError}
        form={createForm}
        roles={roles}
        submitting={submitting}
        onSubmit={onCreateSubmit}
      />
      <EditUserDialog
        userRow={editUser}
        onOpenChange={onEditOpenChange}
        formError={formError}
        form={editForm}
        roles={roles}
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
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        {avatar ? <p className="text-xs text-muted-foreground">Selected: {avatar.name}</p> : null}
        <Form {...testForm}>
          <MediaPickerField control={testForm.control} name="avatar" label="Avatar" />
        </Form>
      </div>
    </div>
  )
}
