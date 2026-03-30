import { useCallback, useEffect, useState } from 'react'

import { AssignUsersTableCard } from '@/features/users/components/AssignUsersTableCard'
import { usersApi } from '@/features/users/api/users'
import type { UserOptionForAssign, UserParentAssignmentRow } from '@/features/users/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionBits, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

function draftsFromRows(rows: UserParentAssignmentRow[]): Record<number, number[]> {
  return Object.fromEntries(rows.map((r) => [r.id, [...r.child_user_ids]]))
}

export function AssignUsersPage() {
  const user = useAuthStore((s) => s.user)
  const mask = user?.permission_mask ?? 0
  const canUpdate = hasPermission(mask, PermissionBits.SettingsUsersUpdate)

  const [assignments, setAssignments] = useState<UserParentAssignmentRow[]>([])
  const [userOptions, setUserOptions] = useState<UserOptionForAssign[]>([])
  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)

  const applyPayload = useCallback(
    (payload: { assignments: UserParentAssignmentRow[]; user_options: UserOptionForAssign[] }) => {
      setAssignments(payload.assignments)
      setUserOptions(payload.user_options)
      setDrafts(draftsFromRows(payload.assignments))
    },
    [],
  )

  const load = useCallback(async () => {
    try {
      setListError(null)
      setLoading(true)
      const payload = await usersApi.listParentChildAssignments()
      applyPayload(payload)
    } catch (err) {
      setListError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [applyPayload])

  useEffect(() => {
    void load()
  }, [load])

  const onDraftChange = useCallback((parentId: number, childIds: number[]) => {
    setDrafts((d) => ({ ...d, [parentId]: childIds }))
  }, [])

  const saveRowAsync = useCallback(
    async (parentId: number) => {
      const childIds = drafts[parentId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(parentId)
        const payload = await usersApi.syncParentChildren(parentId, childIds)
        applyPayload(payload)
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [applyPayload, drafts],
  )

  const onSaveRow = useCallback(
    (parentId: number) => {
      void saveRowAsync(parentId)
    },
    [saveRowAsync],
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-muted-foreground text-sm">
          Each parent row lists one user email. Choose child users as tags; use Save to apply. A
          user already marked as a child cannot have children until unassigned.
        </p>
      </div>

      {flashError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {flashError}
        </div>
      ) : null}

      <AssignUsersTableCard
        listError={listError}
        loading={loading}
        assignments={assignments}
        userOptions={userOptions}
        drafts={drafts}
        onDraftChange={onDraftChange}
        onSaveRow={onSaveRow}
        savingRowId={savingRowId}
        canUpdate={canUpdate}
      />
    </div>
  )
}
