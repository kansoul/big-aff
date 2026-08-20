import { useEffect, useState } from 'react'
import type { Control } from 'react-hook-form'
import { toast } from 'sonner'

import type { BusinessCenterCreateFormValues } from '@/features/business-centers/types'
import { teamsApi } from '@/features/teams/api'
import type { Team } from '@/features/teams/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SearchableSelect, type SearchableSelectOption } from '@/components/common/SearchableSelect'
import { formatApiError } from '@/features/settings/components'

type BusinessCenterFormSectionsProps = {
  control: Control<BusinessCenterCreateFormValues>
}

export function BusinessCenterFormSections({ control }: BusinessCenterFormSectionsProps) {
  const [teamOptions, setTeamOptions] = useState<SearchableSelectOption[]>([])

  useEffect(() => {
    let ignore = false

    const loadTeamOptions = async () => {
      try {
        const response = await teamsApi.listOptions()
        const teams = (response.data as { data: Pick<Team, 'id' | 'name'>[] }).data
        if (!ignore) {
          setTeamOptions(
            teams.map((team) => ({
              value: String(team.id),
              label: team.name,
            })),
          )
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      }
    }

    void loadTeamOptions()

    return () => {
      ignore = true
    }
  }, [])

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
                    { value: 'tiktok', label: 'TikTok' },
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
                <SearchableSelect
                  placeholder="Select team (optional)"
                  value={field.value == null ? '__none__' : String(field.value)}
                  onValueChange={(value) =>
                    field.onChange(value === '__none__' ? null : Number(value))
                  }
                  options={[{ value: '__none__', label: 'No team' }, ...teamOptions]}
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
