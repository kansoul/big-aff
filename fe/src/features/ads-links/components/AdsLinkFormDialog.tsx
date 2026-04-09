import type { UseFormReturn } from 'react-hook-form'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RoleFormErrorAlert } from '@/features/settings/components/RoleFormErrorAlert'
import type {
  AdsLink,
  AdsLinkCreateFormValues,
  AdsLinkUpdateFormValues,
  ChannelOption,
  PostOption,
  SiteOption,
} from '@/features/ads-links/types'

// ——— Create dialog ———

type CreateAdsLinkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formError: string | null
  form: UseFormReturn<AdsLinkCreateFormValues>
  sites: SiteOption[]
  posts: PostOption[]
  channels: ChannelOption[]
  submitting: boolean
  onSubmit: (values: AdsLinkCreateFormValues) => void | Promise<void>
}

export function CreateAdsLinkDialog({
  open,
  onOpenChange,
  formError,
  form,
  sites,
  posts,
  channels,
  submitting,
  onSubmit,
}: CreateAdsLinkDialogProps) {
  const selectedPostId = form.watch('post_id')
  const selectedPost = posts.find((p) => p.id === selectedPostId)
  const keywordSets = selectedPost?.keyword_sets ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            New Ads Link
          </DialogTitle>
        </DialogHeader>
        {formError && open ? <RoleFormErrorAlert message={formError} className="shrink-0" /> : null}
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="site_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site *</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="post_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post *</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => {
                      field.onChange(Number(v))
                      form.setValue('keyword_set_id', null)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select post" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {posts.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channel_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel *</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channels.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rac"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RAC *</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fbid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook Pixel ID(s)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12313123312" {...field} value={field.value ?? ''} />
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

            {keywordSets.length > 0 ? (
              <FormField
                control={form.control}
                name="keyword_set_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keyword Set</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {keywordSets.map((ks) => (
                          <SelectItem key={ks.id} value={String(ks.id)}>
                            {ks.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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

            <DialogFooter className="mt-2 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ——— Edit dialog (only rac, fbid, googleid) ———

type EditAdsLinkDialogProps = {
  adsLink: AdsLink | null
  onOpenChange: (open: boolean) => void
  formError: string | null
  form: UseFormReturn<AdsLinkUpdateFormValues>
  submitting: boolean
  onSubmit: (values: AdsLinkUpdateFormValues) => void | Promise<void>
}

export function EditAdsLinkDialog({
  adsLink,
  onOpenChange,
  formError,
  form,
  submitting,
  onSubmit,
}: EditAdsLinkDialogProps) {
  const open = adsLink !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            Edit Ads Link
          </DialogTitle>
        </DialogHeader>
        {formError && open ? <RoleFormErrorAlert message={formError} className="shrink-0" /> : null}
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="rac"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RAC *</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fbid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook Pixel ID(s)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12313,123312" {...field} value={field.value ?? ''} />
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

            <DialogFooter className="mt-2 shrink-0 gap-2 border-0 bg-transparent sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
