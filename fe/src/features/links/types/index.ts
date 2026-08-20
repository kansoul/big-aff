import { z } from 'zod'

export const LINK_STATUSES = ['active', 'inactive'] as const
export type LinkStatus = (typeof LINK_STATUSES)[number]

export interface Link {
  id: number
  name: string
  url: string
  tracking_code: string
  status: LinkStatus
  created_at: string
  updated_at: string
}

export const linkFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  url: z
    .string()
    .trim()
    .url('Enter a valid absolute URL')
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
      message: 'Only HTTP and HTTPS URLs are supported',
    }),
  status: z.enum(LINK_STATUSES),
})

export type LinkFormValues = z.infer<typeof linkFormSchema>

export interface LinkFilterParams {
  keyword?: string
  status?: LinkStatus
  page?: number
  per_page?: number
}

export interface LinkListResponse {
  data: Link[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}
