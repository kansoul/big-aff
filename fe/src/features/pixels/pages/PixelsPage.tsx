import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PixelFormDialog } from '@/features/pixels/components/PixelFormDialog'
import { pixelsApi } from '@/features/pixels/api'
import type { Pixel, PixelAccount, PixelFormValues } from '@/features/pixels/types'
import { axiosInstance } from '@/shared/api/axios'
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
  const [accounts, setAccounts] = useState<PixelAccount[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Pixel | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, accountResult] = await Promise.all([
        pixelsApi.list({ query, per_page: 100 }),
        axiosInstance.get<{ data: PixelAccount[] }>('/options/accounts'),
      ])
      setRows(result.data)
      setAccounts(accountResult.data.data.filter((a) => a.ads_type === 'tiktok'))
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
      <div className="space-y-3">
        {rows.map((pixel) => (
          <Card key={pixel.id}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-mono text-sm font-semibold">{pixel.pixel_id}</p>
                <p className="text-xs text-muted-foreground">
                  {pixel.name || 'Unnamed'} ·{' '}
                  {pixel.account?.account_name ?? pixel.account?.account_id}
                </p>
              </div>
              <div className="flex gap-1">
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
                    <span className="sr-only">Edit</span>
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button variant="ghost" size="icon" onClick={() => void remove(pixel)}>
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No pixels found.</p>
        ) : null}
      </div>
      <PixelFormDialog
        open={open}
        pixel={editing}
        accounts={accounts}
        saving={saving}
        onOpenChange={setOpen}
        onSubmit={submit}
      />
    </section>
  )
}
