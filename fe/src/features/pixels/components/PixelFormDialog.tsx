import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  pixelSchema,
  type Pixel,
  type PixelFormValues,
} from '@/features/pixels/types'

type Props = {
  open: boolean
  pixel: Pixel | null
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PixelFormValues) => Promise<void>
}
export function PixelFormDialog({ open, pixel, saving, onOpenChange, onSubmit }: Props) {
  const form = useForm<PixelFormValues>({
    resolver: zodResolver(pixelSchema),
    defaultValues: { pixel_id: '', name: '' },
  })
  useEffect(() => {
    if (open)
      form.reset({
        pixel_id: pixel?.pixel_id ?? '',
        name: pixel?.name ?? '',
      })
  }, [open, pixel, form])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pixel ? 'Edit Pixel' : 'New Pixel'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <FormField
              control={form.control}
              name="pixel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pixel ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pixel ID" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
