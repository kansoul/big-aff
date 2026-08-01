import type { UseFormReturn } from 'react-hook-form'
import { AlertCircle, Loader2, Save } from 'lucide-react'

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

import { Textarea } from '@/components/ui/textarea'
import type {
  AdsLink,
  AdsLinkCreateFormValues,
  AdsLinkUpdateFormValues,
  SiteOption,
  AccountOption,
  PixelOption,
} from '@/features/ads-links/types'

// ——— Create dialog ———

type CreateAdsLinkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formError: string | null
  form: UseFormReturn<AdsLinkCreateFormValues>
  sites: SiteOption[]
  accounts: AccountOption[]
  pixels: PixelOption[]
  onAccountChange: (accountId: number) => void
  submitting: boolean
  onSubmit: (
    values: AdsLinkCreateFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => void | Promise<void>
}

export function CreateAdsLinkDialog({
  open,
  onOpenChange,
  formError,
  form,
  sites,
  accounts,
  pixels,
  onAccountChange,
  submitting,
  onSubmit,
}: CreateAdsLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Ads Link</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit((values) => onSubmit(values, { createAnother: false }))(e)
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="site_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Site <span className="text-destructive">*</span>
                  </FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => field.onChange(Number(v))}
                    options={sites.map((s) => ({ label: s.name, value: String(s.id) }))}
                    placeholder="Select site"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rac"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    RAC <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="googleid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Account ID(s)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 1232-456-123" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TikTok Account</FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(value) => {
                      const id = Number(value)
                      field.onChange(id)
                      form.setValue('pixel_id', null)
                      onAccountChange(id)
                    }}
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
                  <FormLabel>Pixel</FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(value) => field.onChange(Number(value))}
                    options={pixels.map((p) => ({
                      value: String(p.id),
                      label: p.name ? `${p.name} (${p.pixel_id})` : p.pixel_id,
                    }))}
                    placeholder="Select pixel"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && open ? (
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
              <Button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void form.handleSubmit((values) => onSubmit(values, { createAnother: true }))()
                }}
              >
                Create & create another
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Create Ads Link
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

// ——— Edit dialog ———

type EditAdsLinkDialogProps = {
  adsLink: AdsLink | null
  onOpenChange: (open: boolean) => void
  formError: string | null
  form: UseFormReturn<AdsLinkUpdateFormValues>
  submitting: boolean
  accounts: AccountOption[]
  pixels: PixelOption[]
  onAccountChange: (accountId: number) => void
  onSubmit: (values: AdsLinkUpdateFormValues) => void | Promise<void>
}

export function EditAdsLinkDialog({
  adsLink,
  onOpenChange,
  formError,
  form,
  submitting,
  accounts,
  pixels,
  onAccountChange,
  onSubmit,
}: EditAdsLinkDialogProps) {
  const open = adsLink !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ads Link</DialogTitle>
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
              name="rac"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    RAC <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="googleid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Account ID(s)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 123,456" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TikTok Account</FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(value) => {
                      const id = Number(value)
                      field.onChange(id)
                      form.setValue('pixel_id', null)
                      onAccountChange(id)
                    }}
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
                  <FormLabel>Pixel</FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(value) => field.onChange(Number(value))}
                    options={pixels.map((p) => ({
                      value: String(p.id),
                      label: p.name ? `${p.name} (${p.pixel_id})` : p.pixel_id,
                    }))}
                    placeholder="Select pixel"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && open ? (
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
                    Saving…
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
