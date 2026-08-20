import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { SearchableSelect } from '@/components/common/SearchableSelect'
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
  type PixelBusinessCenterOption,
  type PixelFormValues,
} from '@/features/pixels/types'

type Props = {
  open: boolean
  pixel: Pixel | null
  saving: boolean
  businessCenters: PixelBusinessCenterOption[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PixelFormValues) => Promise<void>
}
export function PixelFormDialog({
  open,
  pixel,
  saving,
  businessCenters,
  onOpenChange,
  onSubmit,
}: Props) {
  const form = useForm<PixelFormValues>({
    resolver: zodResolver(pixelSchema),
    defaultValues: {
      pixel_id: '',
      name: '',
      platform: 'facebook',
      business_center_id: 0,
      status: 'active',
    },
  })
  const platform = useWatch({ control: form.control, name: 'platform' })
  const availableBusinessCenters = businessCenters.filter(
    (businessCenter) => businessCenter.ads_type === platform,
  )
  useEffect(() => {
    if (open)
      form.reset({
        pixel_id: pixel?.pixel_id ?? '',
        name: pixel?.name ?? '',
        platform: pixel?.platform ?? 'facebook',
        business_center_id: pixel?.business_center_id ?? 0,
        status: pixel?.status ?? 'active',
      })
  }, [open, pixel, form])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pixel ? 'Edit Pixel Conversion' : 'New Pixel Conversion'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Platform <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      placeholder="Select platform"
                      value={field.value}
                      options={[
                        { value: 'facebook', label: 'Facebook' },
                        { value: 'tiktok', label: 'TikTok' },
                      ]}
                      onValueChange={(value) => {
                        field.onChange(value as 'facebook' | 'tiktok')
                        form.setValue('business_center_id', 0)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="business_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Business Center <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      placeholder="Select Business Center"
                      value={field.value ? String(field.value) : ''}
                      options={availableBusinessCenters.map((businessCenter) => ({
                        value: String(businessCenter.id),
                        label: `${businessCenter.name} (${businessCenter.bc_id})`,
                      }))}
                      onValueChange={(value) => field.onChange(Number(value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pixel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Pixel ID <span className="text-destructive">*</span>
                  </FormLabel>
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
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pixel name" />
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
                  <FormLabel>
                    Status <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      placeholder="Select status"
                      value={field.value}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                      onValueChange={field.onChange}
                    />
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
