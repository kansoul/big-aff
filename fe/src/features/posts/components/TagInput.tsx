import { useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter…',
  disabled,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTags = (rawTags: string[]) => {
    const nextTags = rawTags.reduce<string[]>(
      (tags, raw) => {
        const trimmed = raw.trim()
        if (trimmed && !tags.includes(trimmed)) {
          tags.push(trimmed)
        }

        return tags
      },
      [...value],
    )

    if (nextTags.length !== value.length) {
      onChange(nextTags)
    }
  }

  const addTag = (raw: string) => {
    addTags([raw])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes(',')) return

    e.preventDefault()
    addTags(`${inputValue}${text}`.split(','))
    setInputValue('')
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue)
      setInputValue('')
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  )
}
