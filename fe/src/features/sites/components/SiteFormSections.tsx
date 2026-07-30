import { useEffect, useState } from 'react'
import type { Control } from 'react-hook-form'

import type { SiteCreateFormValues } from '@/features/sites/types'
import { channelsApi } from '@/features/channels/api'
import { stylesApi } from '@/features/styles/api'
import type { ChannelOption } from '@/features/channels/types'
import type { StyleOption } from '@/features/styles/types'
import { MediaPickerField } from '@/components/common/MediaPickerDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/common/SearchableSelect'

type SiteFormSectionsProps = {
  control: Control<SiteCreateFormValues>
}

export function SiteFormSections({ control }: SiteFormSectionsProps) {
  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [styles, setStyles] = useState<StyleOption[]>([])

  useEffect(() => {
    void channelsApi.options().then((res) => setChannels(res.data))
    void stylesApi.options().then((res) => setStyles(res.data))
  }, [])

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
                <FormLabel>
                  Status<span className="text-destructive">*</span>
                </FormLabel>
                <SearchableSelect
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Maintenance', value: 'maintenance' },
                    { label: 'Suspended', value: 'suspended' },
                  ]}
                  placeholder="Select status"
                />
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
            directory="media/site"
            placeholder="Pick a logo…"
          />
          <MediaPickerField
            control={control}
            name="favicon"
            label="Favicon"
            directory="media"
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
            name="settings.default_channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Default Channel <span className="text-destructive">*</span>
                </FormLabel>
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
            control={control}
            name="settings.default_style"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Default Style <span className="text-destructive">*</span>
                </FormLabel>
                <SearchableSelect
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                  options={styles.map((s) => ({ label: s.name, value: s.code }))}
                  placeholder="Select style"
                />
                <FormMessage />
              </FormItem>
            )}
          />
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
            name="settings.theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <SearchableSelect
                  value={field.value || '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                  options={[
                    { label: 'No theme', value: '__none__' },
                    ...Array.from({ length: 10 }, (_, i) => ({
                      value: `theme-${i + 1}`,
                      label: `Theme ${i + 1}`,
                    })),
                  ]}
                  placeholder="Select theme"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </>
  )
}
