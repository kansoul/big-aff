import { z } from 'zod'

export const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  role_id: z.coerce.number().refine((n) => n > 0, 'Select a role'),
})

export type UserCreateFormValues = z.infer<typeof userCreateSchema>

export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email'),
  password: z.union([z.string().min(8, 'At least 8 characters'), z.literal('')]),
  role_id: z.coerce.number().refine((n) => n > 0, 'Select a role'),
})

export type UserUpdateFormValues = z.infer<typeof userUpdateSchema>

export type UserCreatePayload = {
  name: string
  email: string
  password: string
  role_id: number
}

export type UserUpdatePayload = {
  name?: string
  email?: string
  password?: string
  role_id?: number
}
