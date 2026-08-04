import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PixelFormDialog } from '@/features/pixels/components/PixelFormDialog'
import { pixelsApi } from '@/features/pixels/api'
import type { Pixel, PixelFormValues } from '@/features/pixels/types'
import { useAuthStore } from '@/hooks/useAuthStore'
import { hasPermission, PermissionSlugs } from '@/constants/permissions'
import { formatApiError } from '@/features/settings/components'

export function PixelsPage() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const canCreate = useMemo(
    () => hasPermission(permissions, PermissionSlugs.PixelsCreate),
    [permissions],
  )
  const canUpdate = useMemo(
    () => hasPermission(permissions, PermissionSlugs.PixelsUpdate),
    [permissions],
  )
  const canDelete = useMemo(
    () => hasPermission(permissions, PermissionSlugs.PixelsDelete),
    [permissions],
  )
  const [rows, setRows] = useState<Pixel[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Pixel | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await pixelsApi.list({ query, per_page: 100 })
      setRows(result.data)
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [query])
  useEffect(() => {
    void load()
  }, [load])
  const submit = useCallback(
    async (values: PixelFormValues) => {
      setSaving(true)
      try {
        if (editing) await pixelsApi.update(editing.id, values)
        else await pixelsApi.create(values)
        toast.success(editing ? 'Pixel updated' : 'Pixel created')
        setOpen(false)
        setEditing(null)
        await load()
      } catch (e) {
        toast.error(formatApiError(e))
      } finally {
        setSaving(false)
      }
    },
    [editing, load],
  )
  const remove = useCallback(
    async (pixel: Pixel) => {
      if (!window.confirm(`Delete pixel ${pixel.pixel_id}?`)) return
      try {
        await pixelsApi.delete(pixel.id)
        toast.success('Pixel deleted')
        await load()
      } catch (e) {
        toast.error(formatApiError(e))
      }
    },
    [load],
  )
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="max-w-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pixel ID or name…"
        />
        {canCreate ? (
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="size-4" />
            New Pixel
          </Button>
        ) : null}
      </div>
      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Pixel ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    <span className="sr-only">Loading pixels</span>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No pixels found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((pixel) => (
                  <TableRow key={pixel.id}>
                    <TableCell className="text-muted-foreground">{pixel.id}</TableCell>
                    <TableCell className="font-mono font-medium">{pixel.pixel_id}</TableCell>
                    <TableCell>
                      {pixel.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canUpdate ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(pixel)
                              setOpen(true)
                            }}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit pixel {pixel.pixel_id}</span>
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="ghost" size="icon" onClick={() => void remove(pixel)}>
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete pixel {pixel.pixel_id}</span>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      <PixelFormDialog
        open={open}
        pixel={editing}
        saving={saving}
        onOpenChange={setOpen}
        onSubmit={submit}
      />
    </section>
  )
}
