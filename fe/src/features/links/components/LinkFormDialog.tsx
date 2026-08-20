import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LINK_STATUSES,
  linkFormSchema,
  type Link,
  type LinkFormValues,
} from '@/features/links/types'

interface LinkFormDialogProps {
  open: boolean
  link: Link | null
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: LinkFormValues) => void | Promise<void>
}

const DEFAULT_VALUES: LinkFormValues = { name: '', url: '', status: 'active' }

export function LinkFormDialog({
  open,
  link,
  saving,
  onOpenChange,
  onSubmit,
}: LinkFormDialogProps) {
  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(link ? { name: link.name, url: link.url, status: link.status } : DEFAULT_VALUES)
  }, [form, link, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{link ? 'Edit link' : 'New link'}</DialogTitle>
          <DialogDescription>
            Use the final third-party landing URL. Tracking parameters are added when you copy it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Quickpayly landing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landing URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://partner.example/landing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LINK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status === 'active' ? 'Active' : 'Inactive'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {link ? 'Save changes' : 'Create link'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
