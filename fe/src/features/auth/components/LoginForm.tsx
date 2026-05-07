import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertCircle, Loader2, Mail, Lock, ArrowRight } from 'lucide-react'

import { loginApi } from '@/features/auth/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { User } from '@/shared/types'

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  remember: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  defaultEmail?: string
  onSuccess: (user: User, token: string) => void
  submitLabel?: string
}

export function LoginForm({ defaultEmail, onSuccess, submitLabel = 'Continue' }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail ?? '',
      password: '',
      remember: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null)
      setIsSubmitting(true)
      const { user, token } = await loginApi.login(data)
      onSuccess(user, token)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      if (e.response?.status === 422) {
        setError(e.response.data?.message || 'Invalid credentials provided.')
      } else if (e.response?.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-medium text-destructive/90 leading-relaxed">{error}</p>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e)
          }}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-semibold text-sm">
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                      <Mail className="h-5 w-5" />
                    </div>
                    <Input
                      placeholder="name@company.com"
                      type="email"
                      autoComplete="email"
                      readOnly={!!defaultEmail}
                      className="pl-11 h-12 rounded-xl bg-muted/40 border-border/50 shadow-sm transition-all focus-visible:ring-primary/30 focus-visible:bg-background focus:border-primary text-base"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-semibold text-sm">Password</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                      <Lock className="h-5 w-5" />
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pl-11 h-12 rounded-xl bg-muted/40 border-border/50 shadow-sm transition-all focus-visible:ring-primary/30 focus-visible:bg-background focus:border-primary text-base font-medium tracking-widest placeholder:tracking-normal"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="data-[state=checked]:bg-primary h-5 w-5 rounded-md border-muted-foreground/30"
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  Remember my device
                </FormLabel>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0 group bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              <span className="flex items-center">
                {submitLabel}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
