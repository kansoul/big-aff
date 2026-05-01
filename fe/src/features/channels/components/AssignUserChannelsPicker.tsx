import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export type AssignChannelOption = {
  code: string
  name: string | null
}

type AssignUserChannelsPickerProps = {
  disabled?: boolean
  value: string[]
  onChange: (next: string[]) => void
  options?: AssignChannelOption[]
  className?: string
  placeholder?: string
}

function codesToText(codes: string[]): string {
  return codes.join('\n')
}

function textToCodes(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function AssignUserChannelsPickerInner({
  disabled,
  value,
  onChange,
  options = [],
  className,
  placeholder = 'Enter channel codes, one per line…',
}: AssignUserChannelsPickerProps) {
  const [text, setText] = useState(() => codesToText(value))
  const isFocused = useRef(false)

  useEffect(() => {
    if (!isFocused.current) {
      setText(codesToText(value))
    }
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value
      setText(raw)
      onChange(textToCodes(raw))
    },
    [onChange],
  )

  const handleBlur = useCallback(() => {
    isFocused.current = false
    setText(codesToText(textToCodes(text)))
  }, [text])

  const knownCodes = new Set(options.map((o) => o.code))
  const invalidCodes =
    options.length > 0 ? textToCodes(text).filter((code) => !knownCodes.has(code)) : []

  return (
    <div className={cn('space-y-1.5', className)}>
      <textarea
        disabled={disabled}
        value={text}
        onChange={handleChange}
        onFocus={() => {
          isFocused.current = true
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={5}
        className={cn(
          'w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm shadow-xs',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:opacity-50',
          'transition-[color,box-shadow]',
        )}
      />
      {invalidCodes.length > 0 && (
        <p className="text-xs text-destructive">Unknown codes: {invalidCodes.join(', ')}</p>
      )}
    </div>
  )
}

export const AssignUserChannelsPicker = memo(AssignUserChannelsPickerInner)
