import { forwardRef, memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import {
  Bold,
  Code,
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Table as TableIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FileCode,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { MediaPickerDialog } from '@/components/common/MediaPickerDialog'
import type { MediaFile } from '@/features/media/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─────────────────────────────────────────────────────────────────────────────
// ToolbarButton — small icon toggle button
// ─────────────────────────────────────────────────────────────────────────────

type ToolbarButtonProps = {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

const ToolbarButton = memo(
  forwardRef<HTMLButtonElement, ToolbarButtonProps>(
    ({ onClick, active, disabled, title, children }, ref) => {
      return (
        <button
          ref={ref}
          type="button"
          title={title}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'disabled:pointer-events-none disabled:opacity-40',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            active && 'bg-accent text-foreground',
          )}
        >
          {children}
        </button>
      )
    },
  ),
)
ToolbarButton.displayName = 'ToolbarButton'

const ToolbarTooltipButton = memo((props: ToolbarButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToolbarButton {...props} title={props.title} />
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {props.title}
      </TooltipContent>
    </Tooltip>
  )
})
ToolbarTooltipButton.displayName = 'ToolbarTooltipButton'

// ─────────────────────────────────────────────────────────────────────────────
// ToolbarSeparator
// ─────────────────────────────────────────────────────────────────────────────

const ToolbarSeparator = memo(() => <div className="mx-1 h-5 w-px shrink-0 bg-border" />)
ToolbarSeparator.displayName = 'ToolbarSeparator'

// ─────────────────────────────────────────────────────────────────────────────
// TextEditor — headless Tiptap rich text editor with full toolbar
//
// Usage (uncontrolled / standalone):
//   <TextEditor onChange={(html) => console.log(html)} placeholder="Write here…" />
//
// Usage (inside a FormField):
//   <FormField control={form.control} name="body" render={({ field }) => (
//     <FormItem>
//       <FormLabel>Content</FormLabel>
//       <FormControl>
//         <TextEditor value={field.value} onChange={field.onChange} />
//       </FormControl>
//       <FormMessage />
//     </FormItem>
//   )} />
// ─────────────────────────────────────────────────────────────────────────────

export type TextEditorProps = {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Minimum height of the content area. Defaults to 240px. */
  minHeight?: string
  directory: 'media'
}

export const TextEditor = memo(function TextEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  disabled = false,
  className,
  minHeight = '240px',
  directory = 'media',
}: TextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [mediaOpen, setMediaOpen] = useState(false)
  const [htmlMode, setHtmlMode] = useState(false)
  const [htmlDraft, setHtmlDraft] = useState('')

  // NOTE: useEditor does not re-create when extensions change.
  // `placeholder` must be static for the lifetime of this component instance.
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2 cursor-pointer',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-md max-w-full h-auto' },
      }),
      Placeholder.configure({ placeholder }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4 border border-border',
        },
      }),
      TableRow.configure({
        HTMLAttributes: { class: 'border-b border-border transition-colors' },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border bg-muted/50 px-4 py-2 font-semibold text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: { class: 'border border-border px-4 py-2' },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- static for editor lifetime
    [],
  )

  const editor = useEditor({
    extensions,
    content: value ?? '',
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
    editable: !disabled,
    immediatelyRender: false,
  })

  // Sync editable state when disabled changes
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  // Sync when value changes externally (e.g. form.reset(), async API load)
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const incoming = value ?? ''
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [value, editor])

  const handleLinkOpen = useCallback(() => {
    if (!editor) return
    const href = editor.getAttributes('link').href
    setLinkUrl(typeof href === 'string' ? href : '')
    setLinkOpen(true)
  }, [editor])

  const handleLinkApply = useCallback(() => {
    if (!editor) return
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setLinkOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const handleLinkRemove = useCallback(() => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false)
    setLinkUrl('')
  }, [editor])

  const handleMediaSelect = useCallback(
    (media: MediaFile) => {
      if (!editor) return
      editor.chain().focus().setImage({ src: media.url, alt: media.alt_text }).run()
    },
    [editor],
  )

  const handleToggleHtmlMode = useCallback(() => {
    if (!editor) return
    if (!htmlMode) {
      setHtmlDraft(editor.getHTML())
      setHtmlMode(true)
    } else {
      editor.commands.setContent(htmlDraft, { emitUpdate: true })
      setHtmlMode(false)
    }
  }, [editor, htmlMode, htmlDraft])

  // Stable toolbar handlers — editor instance is referentially stable across renders,
  // so these callbacks won't change and memo'd ToolbarTooltipButtons can skip re-render.
  const tb = useMemo(() => {
    if (!editor) return null
    return {
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      bold: () => editor.chain().focus().toggleBold().run(),
      italic: () => editor.chain().focus().toggleItalic().run(),
      underline: () => editor.chain().focus().toggleUnderline().run(),
      strike: () => editor.chain().focus().toggleStrike().run(),
      code: () => editor.chain().focus().toggleCode().run(),
      bulletList: () => editor.chain().focus().toggleBulletList().run(),
      orderedList: () => editor.chain().focus().toggleOrderedList().run(),
      blockquote: () => editor.chain().focus().toggleBlockquote().run(),
      codeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
      hr: () => editor.chain().focus().setHorizontalRule().run(),
      insertTable: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      addColBefore: () => editor.chain().focus().addColumnBefore().run(),
      addColAfter: () => editor.chain().focus().addColumnAfter().run(),
      deleteCol: () => editor.chain().focus().deleteColumn().run(),
      addRowBefore: () => editor.chain().focus().addRowBefore().run(),
      addRowAfter: () => editor.chain().focus().addRowAfter().run(),
      deleteRow: () => editor.chain().focus().deleteRow().run(),
      deleteTable: () => editor.chain().focus().deleteTable().run(),
      openMedia: () => setMediaOpen(true),
    }
  }, [editor])

  if (!editor || !tb) return null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border bg-background transition-colors',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <TooltipProvider delayDuration={400}>
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1.5">
          {/* History */}
          <ToolbarTooltipButton onClick={tb.undo} disabled={!editor.can().undo()} title="Undo (⌘Z)">
            <Undo2 className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            onClick={tb.redo}
            disabled={!editor.can().redo()}
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="size-3.5" />
          </ToolbarTooltipButton>

          <ToolbarSeparator />

          {/* Headings */}
          <ToolbarTooltipButton
            active={editor.isActive('heading', { level: 1 })}
            onClick={tb.h1}
            title="Heading 1"
          >
            <Heading1 className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={tb.h2}
            title="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={tb.h3}
            title="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </ToolbarTooltipButton>

          <ToolbarSeparator />

          {/* Text marks */}
          <ToolbarTooltipButton
            active={editor.isActive('bold')}
            onClick={tb.bold}
            title="Bold (⌘B)"
          >
            <Bold className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('italic')}
            onClick={tb.italic}
            title="Italic (⌘I)"
          >
            <Italic className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('underline')}
            onClick={tb.underline}
            title="Underline (⌘U)"
          >
            <UnderlineIcon className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('strike')}
            onClick={tb.strike}
            title="Strikethrough"
          >
            <Strikethrough className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('code')}
            onClick={tb.code}
            title="Inline code"
          >
            <Code className="size-3.5" />
          </ToolbarTooltipButton>

          <ToolbarSeparator />

          {/* Lists */}
          <ToolbarTooltipButton
            active={editor.isActive('bulletList')}
            onClick={tb.bulletList}
            title="Bullet list"
          >
            <List className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('orderedList')}
            onClick={tb.orderedList}
            title="Numbered list"
          >
            <ListOrdered className="size-3.5" />
          </ToolbarTooltipButton>

          <ToolbarSeparator />

          {/* Block formats */}
          <ToolbarTooltipButton
            active={editor.isActive('blockquote')}
            onClick={tb.blockquote}
            title="Blockquote"
          >
            <Quote className="size-3.5" />
          </ToolbarTooltipButton>
          <ToolbarTooltipButton
            active={editor.isActive('codeBlock')}
            onClick={tb.codeBlock}
            title="Code block"
          >
            <CodeSquare className="size-3.5" />
          </ToolbarTooltipButton>

          <ToolbarSeparator />

          {/* Link — controlled Popover anchored to the toolbar button */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <Tooltip>
              <PopoverAnchor asChild>
                <TooltipTrigger asChild>
                  <ToolbarButton
                    active={editor.isActive('link')}
                    onClick={handleLinkOpen}
                    title="Insert link"
                  >
                    <Link2 className="size-3.5" />
                  </ToolbarButton>
                </TooltipTrigger>
              </PopoverAnchor>
              <TooltipContent side="top" sideOffset={8}>
                Insert link
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-64 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Link URL</p>
                <div className="flex gap-1.5">
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleLinkApply()
                      }
                    }}
                    placeholder="https://example.com"
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={handleLinkApply}
                  >
                    Apply
                  </Button>
                </div>
                {editor.isActive('link') && (
                  <button
                    type="button"
                    onClick={handleLinkRemove}
                    className="flex cursor-pointer items-center gap-1 self-start text-xs text-destructive hover:underline"
                  >
                    <Link2Off className="size-3" />
                    Remove link
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Image — opens MediaPickerDialog */}
          <ToolbarTooltipButton onClick={tb.openMedia} title="Insert image">
            <ImageIcon className="size-3.5" />
          </ToolbarTooltipButton>

          <ToolbarSeparator />

          {/* Horizontal rule */}
          <ToolbarTooltipButton onClick={tb.hr} title="Horizontal rule">
            <Minus className="size-3.5" />
          </ToolbarTooltipButton>

          <ToolbarSeparator />

          {/* Table Operations */}
          <ToolbarTooltipButton onClick={tb.insertTable} title="Insert table">
            <TableIcon className="size-3.5" />
          </ToolbarTooltipButton>

          {editor.isActive('table') && (
            <>
              <ToolbarSeparator />
              <ToolbarTooltipButton onClick={tb.addColBefore} title="Add column before">
                <ArrowLeft className="size-3.5" />
              </ToolbarTooltipButton>
              <ToolbarTooltipButton onClick={tb.addColAfter} title="Add column after">
                <ArrowRight className="size-3.5" />
              </ToolbarTooltipButton>
              <ToolbarTooltipButton onClick={tb.deleteCol} title="Delete column">
                <span className="text-[10px] font-bold uppercase">-C</span>
              </ToolbarTooltipButton>

              <ToolbarSeparator />
              <ToolbarTooltipButton onClick={tb.addRowBefore} title="Add row before">
                <ArrowUp className="size-3.5" />
              </ToolbarTooltipButton>
              <ToolbarTooltipButton onClick={tb.addRowAfter} title="Add row after">
                <ArrowDown className="size-3.5" />
              </ToolbarTooltipButton>
              <ToolbarTooltipButton onClick={tb.deleteRow} title="Delete row">
                <span className="text-[10px] font-bold uppercase">-R</span>
              </ToolbarTooltipButton>

              <ToolbarSeparator />
              <ToolbarTooltipButton onClick={tb.deleteTable} title="Delete table">
                <Trash2 className="size-3.5 text-destructive" />
              </ToolbarTooltipButton>
            </>
          )}

          <div className="ml-auto">
            <ToolbarTooltipButton onClick={handleToggleHtmlMode} active={htmlMode} title="Edit HTML">
              <FileCode className="size-3.5" />
            </ToolbarTooltipButton>
          </div>
        </div>

        {/* ── HTML source editor ── */}
        {htmlMode ? (
          <textarea
            value={htmlDraft}
            onChange={(e) => {
              setHtmlDraft(e.target.value)
              onChange?.(e.target.value)
            }}
            style={{ minHeight }}
            className="w-full resize-y bg-background px-4 py-3 font-mono text-xs text-foreground outline-none"
            spellCheck={false}
          />
        ) : null}

        {/* ── Editor content ── */}
        <div className={cn('prose prose-sm dark:prose-invert max-w-none', htmlMode && 'hidden')}>
          <EditorContent
            editor={editor}
            style={{ '--editor-min-height': minHeight } as React.CSSProperties}
            className="[&_.tiptap]:min-h-(--editor-min-height) [&_.tiptap]:px-4 [&_.tiptap]:py-3 [&_.tiptap]:outline-none"
          />
        </div>

        <MediaPickerDialog
          open={mediaOpen}
          onOpenChange={setMediaOpen}
          onSelect={handleMediaSelect}
          accept="image/*"
          title="Insert image"
          directory={directory}
        />
      </TooltipProvider>
    </div>
  )
})
TextEditor.displayName = 'TextEditor'

// ─────────────────────────────────────────────────────────────────────────────
// TextEditorField — self-contained RHF field
// Pass control + name; renders label, editor, description, and validation message.
//
//   <TextEditorField control={form.control} name="body" label="Content" />
// ─────────────────────────────────────────────────────────────────────────────

type TextEditorFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  placeholder?: string
  description?: string
  minHeight?: string
  directory: 'media'
}

export function TextEditorField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  minHeight,
  directory,
}: TextEditorFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label ? <FormLabel>{label}</FormLabel> : null}
          <FormControl>
            <TextEditor
              directory={directory}
              value={field.value as string | undefined}
              onChange={field.onChange}
              placeholder={placeholder}
              minHeight={minHeight}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
