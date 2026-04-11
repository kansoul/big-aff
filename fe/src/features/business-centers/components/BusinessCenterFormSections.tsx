import type { Control } from 'react-hook-form'

import type { BusinessCenterCreateFormValues } from '@/features/business-centers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/common/SearchableSelect'

type BusinessCenterFormSectionsProps = {
  control: Control<BusinessCenterCreateFormValues>
}

export function BusinessCenterFormSections({ control }: BusinessCenterFormSectionsProps) {
  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="bc_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                BC ID <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter BC ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="ads_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Ads Type <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <SearchableSelect
                  placeholder="Select ads type"
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={[
                    { value: 'facebook', label: 'Facebook' },
                    { value: 'google', label: 'Google' },
                    { value: 'unknown', label: 'Unknown' },
                  ]}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="team_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team ID</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter team ID (optional)"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val === '' ? null : Number(val))
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
