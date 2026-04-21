import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogLevelBadge } from '@/features/logs/components/LogLevelBadge'
import type { LogEntry } from '@/features/logs/types'

type Props = {
  entry: LogEntry | null
  onClose: () => void
}

export function LogEntryDetailDrawer({ entry, onClose }: Props) {
  const [stackOpen, setStackOpen] = useState(true)

  function copyRaw() {
    if (!entry) return
    void navigator.clipboard.writeText(entry.raw)
    toast.success('Copied to clipboard')
  }

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-full! max-w-fit! flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-center justify-between shrink-0 border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <DialogTitle className="sr-only">Log Entry Detail</DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copyRaw}
              title="Copy raw entry"
              className="mr-4"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {entry && <LogLevelBadge level={entry.level} />}
            {entry && <span className="text-sm text-muted-foreground">{entry.channel}</span>}
            {entry && (
              <span className="text-xs font-mono text-muted-foreground">{entry.timestamp}</span>
            )}
          </div>
        </DialogHeader>

        {entry && (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Message */}
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Message
              </p>
              <p className="wrap-break-word rounded bg-muted/50 p-3 font-mono text-sm whitespace-pre-wrap">
                {entry.message}
              </p>
            </div>

            {/* Stack trace */}
            {entry.stack_trace && (
              <div>
                <button
                  onClick={() => setStackOpen((o) => !o)}
                  className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                >
                  {stackOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Stack Trace
                </button>
                {stackOpen && (
                  <pre className="wrap-break-word overflow-x-auto rounded bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
                    {entry.stack_trace}
                  </pre>
                )}
              </div>
            )}

            {/* Raw */}
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Raw
              </p>
              <pre className="overflow-x-auto break-all rounded bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
                {entry.raw}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
