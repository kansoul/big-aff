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
import { SearchableSelect } from '@/components/common/SearchableSelect'

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
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight uppercase text-base">
            New Ads Link
          </DialogTitle>
        </DialogHeader>
        {formError && open ? <RoleFormErrorAlert message={formError} className="shrink-0" /> : null}
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit((values) => onSubmit(values, { createAnother: false }))(e)
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="site_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site *</FormLabel>
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
              name="post_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post *</FormLabel>
                  <SearchableSelect
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => {
                      field.onChange(Number(v))
                      form.setValue('keyword_set_id', null)
                    }}
                    options={posts.map((p) => ({ label: p.title, value: String(p.id) }))}
                    placeholder="Select post"
                  />
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
                  <SearchableSelect
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                    options={channels.map((c) => ({ label: c.name, value: c.code }))}
                    placeholder="Select channel"
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
                    <SearchableSelect
                      value={field.value ? String(field.value) : '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : Number(v))}
                      options={[
                        { label: 'None', value: '__none__' },
                        ...keywordSets.map((ks) => ({ label: ks.name, value: String(ks.id) })),
                      ]}
                      placeholder="None"
                    />
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
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  void form.handleSubmit((values) => onSubmit(values, { createAnother: true }))()
                }}
              >
                Create & create another
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
  posts: PostOption[]
  onOpenChange: (open: boolean) => void
  formError: string | null
  form: UseFormReturn<AdsLinkUpdateFormValues>
  submitting: boolean
  onSubmit: (values: AdsLinkUpdateFormValues) => void | Promise<void>
}

export function EditAdsLinkDialog({
  adsLink,
  posts,
  onOpenChange,
  formError,
  form,
  submitting,
  onSubmit,
}: EditAdsLinkDialogProps) {
  const open = adsLink !== null

  const selectedPost = posts.find((p) => p.id === adsLink?.post?.id)
  const keywordSets =
    selectedPost?.keyword_sets ?? (adsLink?.keyword_set ? [adsLink.keyword_set] : [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
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

            {keywordSets.length > 0 ? (
              <FormField
                control={form.control}
                name="keyword_set_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keyword Set</FormLabel>
                    <SearchableSelect
                      value={field.value ? String(field.value) : '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : Number(v))}
                      options={[
                        { label: 'None', value: '__none__' },
                        ...keywordSets.map((ks) => ({ label: ks.name, value: String(ks.id) })),
                      ]}
                      placeholder="None"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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
