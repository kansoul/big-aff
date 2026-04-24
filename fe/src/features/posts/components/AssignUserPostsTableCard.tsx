import { memo, useEffect, useState } from 'react'
import { Loader2, Save, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type UserPostAssignmentRow = {
  id: number
  name: string
  email: string
  assigned_post_ids: number[]
}

type AssignUserPostsTableCardProps = {
  loading: boolean
  users: UserPostAssignmentRow[]
  postOptions?: unknown
  drafts: Record<number, number[]>
  savedByUserId: Record<number, number[]>
  onDraftChange: (userId: number, postIds: number[]) => void
  onSaveRow: (userId: number) => void
  savingRowId: number | null
  canAssign: boolean
}

function parsePostIds(text: string): number[] {
  return text
    .split(/[\n,]/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function idsToText(ids: number[]): string {
  return ids.join('\n')
}

function hasSelectionDiff(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return true
  return left.some((id) => !right.includes(id)) || right.some((id) => !left.includes(id))
}

type PostIdsTextareaProps = {
  value: number[]
  disabled: boolean
  onChange: (ids: number[]) => void
}

function PostIdsTextarea({ value, disabled, onChange }: PostIdsTextareaProps) {
  const [text, setText] = useState(() => idsToText(value))

  useEffect(() => {
    if (hasSelectionDiff(parsePostIds(text), value)) {
      setText(idsToText(value))
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Textarea
      disabled={disabled}
      value={text}
      placeholder="Enter post IDs, one per line or comma separated"
      className="min-h-[120px] max-h-[240px] font-mono text-sm"
      onChange={(e) => {
        setText(e.target.value)
        onChange(parsePostIds(e.target.value))
      }}
    />
  )
}

function AssignUserPostsTableCardInner({
  loading,
  users,
  drafts,
  savedByUserId,
  onDraftChange,
  onSaveRow,
  savingRowId,
  canAssign,
}: AssignUserPostsTableCardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading…</span>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-center">
        <Users className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No users to assign</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="grid grid-cols-[180px_0.5fr_0.5fr] border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Email</span>
        <span>Assigned Posts</span>
        <span>Post IDs (Bulk)</span>
      </div>

      {/* Rows */}
      {users.map((row, idx) => {
        const saved = savedByUserId[row.id] ?? row.assigned_post_ids
        const draft = drafts[row.id] ?? saved
        const dirty = hasSelectionDiff(draft, saved)
        const isSaving = savingRowId === row.id

        return (
          <div
            key={row.id}
            className={cn(
              'grid grid-cols-[180px_0.5fr_0.5fr] gap-0 px-4 py-3 transition-colors',
              idx !== 0 && 'border-t border-border',
              dirty && 'bg-amber-50/5',
            )}
          >
            {/* Email */}
            <div className="min-w-0 pr-4 pt-0.5">
              <p className="break-all text-sm text-foreground">{row.email}</p>
            </div>

            {/* Assigned posts display */}
            <div className="min-w-0 pr-4">
              {saved.length === 0 ? (
                <p className="text-sm text-muted-foreground/50">—</p>
              ) : (
                <p className="text-sm leading-relaxed text-primary">
                  {saved.map((id, i) => (
                    <span key={id}>
                      {i > 0 && <span className="mx-1 text-muted-foreground/40">|</span>}
                      {id}
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* Textarea + save */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                {dirty && (
                  <span className="absolute -top-5 right-0 text-[10px] font-medium text-amber-500">
                    Unsaved changes
                  </span>
                )}
                <PostIdsTextarea
                  disabled={!canAssign}
                  value={draft}
                  onChange={(next) => onDraftChange(row.id, next)}
                />
              </div>
              {canAssign && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant={dirty ? 'default' : 'secondary'}
                    className="gap-1.5 font-medium"
                    disabled={!dirty || savingRowId !== null}
                    onClick={() => onSaveRow(row.id)}
                  >
                    {isSaving ? (
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
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const AssignUserPostsTableCard = memo(AssignUserPostsTableCardInner)
export type { UserPostAssignmentRow }
