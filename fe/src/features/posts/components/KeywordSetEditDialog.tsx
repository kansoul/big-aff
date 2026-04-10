import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import type { KeywordSet } from '@/features/posts/types'
import { keywordSetsApi } from '@/features/posts/api/keywordSetsApi'
import { formatApiError } from '@/features/settings/components'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from './TagInput'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: KeywordSet
  onSuccess: (updated: KeywordSet) => void
}

export function KeywordSetEditDialog({ open, onOpenChange, item, onSuccess }: Props) {
  const [name, setName] = useState(item.name)
  const [keywords, setKeywords] = useState<string[]>(item.keywords ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(item.name)
    setKeywords(item.keywords ?? [])
    setError(null)
  }, [item])

  const handleSave = async () => {
    try {
      setError(null)
      setSaving(true)
      const res = await keywordSetsApi.update(item.id, { name, keywords })
      toast.success('Keyword set updated')
      onSuccess(res.data.data)
      onOpenChange(false)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Keyword Set</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Keyword set name"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Keywords</Label>
            <TagInput
              value={keywords}
              onChange={setKeywords}
              placeholder="Type keyword and press Enter…"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Press Enter or comma to add a keyword.</p>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-1.5">
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
