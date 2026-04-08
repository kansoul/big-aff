import type { Control } from 'react-hook-form'

import type { SiteCreateFormValues } from '@/features/sites/types'
import { MediaPickerField } from '@/components/common/MediaPickerDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SiteFormSectionsProps = {
  control: Control<SiteCreateFormValues>
}

export function SiteFormSections({ control }: SiteFormSectionsProps) {
  return (
    <>
      <Card className="border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="My Site" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  URL <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Short description of this site…"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MediaPickerField
            control={control}
            name="logo"
            label="Logo"
            accept="image/*"
            placeholder="Pick a logo…"
          />
          <MediaPickerField
            control={control}
            name="favicon"
            label="Favicon"
            accept="image/png,image/x-icon,image/svg+xml"
            placeholder="Pick a favicon…"
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="settings.gtm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Google Tag Manager ID</FormLabel>
                <FormControl>
                  <Input placeholder="GTM-XXXXXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="settings.fb_pixel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook Pixel ID</FormLabel>
                <FormControl>
                  <Input placeholder="1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="settings.theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No theme</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => ({
                      value: `theme-${i + 1}`,
                      label: `Theme ${i + 1}`,
                    })).map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </>
  )
}
