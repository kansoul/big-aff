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
import { SearchableSelect } from '@/components/common/SearchableSelect'
import {
  pixelSchema,
  type Pixel,
  type PixelAccount,
  type PixelFormValues,
} from '@/features/pixels/types'

type Props = {
  open: boolean
  pixel: Pixel | null
  accounts: PixelAccount[]
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PixelFormValues) => Promise<void>
}
export function PixelFormDialog({ open, pixel, accounts, saving, onOpenChange, onSubmit }: Props) {
  const form = useForm<PixelFormValues>({
    resolver: zodResolver(pixelSchema),
    defaultValues: { account_id: 0, pixel_id: '', name: '' },
  })
  useEffect(() => {
    if (open)
      form.reset({
        account_id: pixel?.account_id ?? 0,
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
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => field.onChange(Number(v))}
                    options={accounts.map((a) => ({
                      value: String(a.id),
                      label: `${a.account_name ?? a.account_id} (${a.account_id})`,
                    }))}
                    placeholder="Select TikTok account"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
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
