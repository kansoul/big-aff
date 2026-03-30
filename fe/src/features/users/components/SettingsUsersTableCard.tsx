import { memo } from 'react'
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ManagedUser } from '@/shared/types'

type SettingsUsersTableCardProps = {
  listError: string | null
  loading: boolean
  users: ManagedUser[]
  currentUserId: number | undefined
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onAddClick: () => void
  onEditRow: (row: ManagedUser) => void
  onDeleteRow: (row: ManagedUser) => void
}

function SettingsUsersTableCardInner({
  listError,
  loading,
  users,
  currentUserId,
  canCreate,
  canUpdate,
  canDelete,
  onAddClick,
  onEditRow,
  onDeleteRow,
}: SettingsUsersTableCardProps) {
  return (
    <>
      {listError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{listError}</p>
        </div>
      ) : null}

      <Card className=" border-border shadow-none mt-4">
        <CardHeader className="justify-end">
          {canCreate ? (
            <Button className=" font-bold tracking-widest" onClick={onAddClick}>
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-y">
                <TableHead className="text-xs font-bold tracking-widest">Name</TableHead>
                <TableHead className="text-xs font-bold tracking-widest">Email</TableHead>
                <TableHead className="text-xs font-bold tracking-widest">Role</TableHead>
                <TableHead className="text-xs font-bold tracking-widest">Parent</TableHead>
                <TableHead className="text-xs font-bold tracking-widest w-[140px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground text-sm"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground text-sm"
                  >
                    No users in this scope.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm py-1">{row.name}</TableCell>
                    <TableCell className="text-sm py-1">{row.email}</TableCell>
                    <TableCell className="text-sm py-1 text-muted-foreground">
                      {row.role?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm py-1 text-muted-foreground">
                      {row.parent?.name ?? '—'}
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      {canUpdate || canDelete ? (
                        <div className="flex justify-end gap-1">
                          {canUpdate ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className=" h-9 w-9"
                              aria-label={`Edit ${row.name}`}
                              onClick={() => onEditRow(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canDelete && row.id !== currentUserId ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className=" h-9 w-9 text-destructive hover:text-destructive"
                              aria-label={`Delete ${row.name}`}
                              onClick={() => onDeleteRow(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}

export const SettingsUsersTableCard = memo(SettingsUsersTableCardInner)
