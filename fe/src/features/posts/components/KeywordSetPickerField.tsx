import { useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Tags, X } from 'lucide-react'

import type { KeywordSet } from '@/features/posts/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { KeywordSetPickerDialog } from './KeywordSetPickerDialog'

type Props<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  defaultItems?: KeywordSet[]
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export function KeywordSetPickerField<T extends FieldValues>({
  control,
  name,
  defaultItems,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
}: Props<T>) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<KeywordSet[]>(defaultItems ?? [])

  // React's recommended pattern for syncing derived state from props:
  // store the previous prop value in state, update both together during render.
  // This only fires when defaultItems reference changes (once on edit page load).
  const [prevDefaultItems, setPrevDefaultItems] = useState(defaultItems)
  if (prevDefaultItems !== defaultItems) {
    setPrevDefaultItems(defaultItems)
    if (defaultItems && defaultItems.length > 0) {
      setSelectedItems(defaultItems)
    }
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const removeItem = (id: number) => {
          const next = selectedItems.filter((i) => i.id !== id)
          setSelectedItems(next)
          field.onChange(next.length > 0 ? next.map((i) => i.id) : null)
        }

        const handleConfirm = (items: KeywordSet[]) => {
          setSelectedItems(items)
          field.onChange(items.length > 0 ? items.map((i) => i.id) : null)
          setDialogOpen(false)
        }

        return (
          <FormItem>
            <FormLabel>Keyword Sets</FormLabel>
            <FormControl>
              <div className="space-y-2">
                {selectedItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItems.map((item) => (
                      <Badge
                        key={item.id}
                        variant="secondary"
                        className="h-auto gap-1 px-2 py-1 text-xs"
                      >
                        {item.name}
                        <button
                          type="button"
                          className="ml-0.5 text-muted-foreground hover:text-foreground"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDialogOpen(true)}
                >
                  <Tags className="h-3.5 w-3.5" />
                  {selectedItems.length > 0 ? 'Manage keyword sets' : 'Select keyword sets'}
                </Button>
              </div>
            </FormControl>
            <FormMessage />

            <KeywordSetPickerDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              defaultSelectedItems={selectedItems}
              onConfirm={handleConfirm}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          </FormItem>
        )
      }}
    />
  )
}
