import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

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
import { adClientsApi } from '@/features/ad-clients/api'
import type { AdClient, AdClientFormValues } from '@/features/ad-clients/types'
import { adClientSchema } from '@/features/ad-clients/types'
import { formatApiError } from '@/features/settings/components'

type CreateAdClientDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateAdClientDialog({ open, onOpenChange, onSuccess }: CreateAdClientDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<AdClientFormValues>({
    resolver: zodResolver(adClientSchema),
    defaultValues: {
      ad_client_id: '',
      product_code: null,
      product_name: null,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setFormError(null)
    form.reset({ ad_client_id: '', product_code: null, product_name: null })
  }, [open, form])

  const onSubmit = async (values: AdClientFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await adClientsApi.create({
        ad_client_id: values.ad_client_id,
        product_code: values.product_code,
        product_name: values.product_name,
      })
      toast.success('Ad client created successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Ad Client</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="ad_client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Ad Client ID <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ca-pub-123456" {...field} disabled={submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. PROD-001"
                      value={field.value ?? ''}
                      disabled={submitting}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. My Product"
                      value={field.value ?? ''}
                      disabled={submitting}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

type EditAdClientDialogProps = {
  adClient: AdClient | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditAdClientDialog({ adClient, onOpenChange, onSuccess }: EditAdClientDialogProps) {
  const open = adClient !== null
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<AdClientFormValues>({
    resolver: zodResolver(adClientSchema),
    defaultValues: {
      ad_client_id: '',
      product_code: null,
      product_name: null,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setFormError(null)
    form.reset({
      ad_client_id: adClient?.ad_client_id ?? '',
      product_code: adClient?.product_code ?? null,
      product_name: adClient?.product_name ?? null,
    })
  }, [open, adClient, form])

  const onSubmit = async (values: AdClientFormValues) => {
    if (!adClient) {
      return
    }

    try {
      setFormError(null)
      setSubmitting(true)
      await adClientsApi.update(adClient.id, {
        ad_client_id: values.ad_client_id,
        product_code: values.product_code,
        product_name: values.product_name,
      })
      toast.success('Ad client updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Ad Client</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="ad_client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Ad Client ID <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ca-pub-123456" {...field} disabled={submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. PROD-001"
                      value={field.value ?? ''}
                      disabled={submitting}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. My Product"
                      value={field.value ?? ''}
                      disabled={submitting}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
