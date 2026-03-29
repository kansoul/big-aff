import * as z from 'zod'

export const roleNameSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name must be at most 100 characters' }),
})

export type RoleNameFormValues = z.infer<typeof roleNameSchema>
