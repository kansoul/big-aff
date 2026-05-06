import { memo, useCallback, useState } from 'react'

import { cn } from '@/lib/utils'

type AssignUserAccountsPickerProps = {
  disabled?: boolean
  value: string[]
  onChange: (next: string[]) => void
  className?: string
  placeholder?: string
}

function accountIdsToText(accountIds: string[]): string {
  return accountIds.join('\n')
}

function textToAccountIds(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function AssignUserAccountsPickerInner({
  disabled,
  value,
  onChange,
  className,
  placeholder = 'Enter account IDs, one per line…',
}: AssignUserAccountsPickerProps) {
  const [focusedText, setFocusedText] = useState<string | null>(null)
  const text = focusedText ?? accountIdsToText(value)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value
      setFocusedText(raw)
      onChange(textToAccountIds(raw))
    },
    [onChange],
  )

  const handleBlur = useCallback(() => {
    setFocusedText(null)
  }, [])

  const handleFocus = useCallback(() => {
    setFocusedText(accountIdsToText(value))
  }, [value])

  return (
    <textarea
      disabled={disabled}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      rows={5}
      className={cn(
        'w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm shadow-xs',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        'transition-[color,box-shadow]',
        className,
      )}
    />
  )
}

export const AssignUserAccountsPicker = memo(AssignUserAccountsPickerInner)
