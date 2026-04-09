import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Mail, Lock } from 'lucide-react'

import logoRed from '@/assets/logo-s-red.png'
import logoWhite from '@/assets/logo-s-white.png'
import { ThemeToggle } from '@/components/common/ThemeToggle'
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
import { PATHS } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'
import { siteName } from '@/config'

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  remember: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null)
      setIsSubmitting(true)

      const user = await loginApi.login(data)
      setUser(user)
      await navigate(PATHS.dashboard)
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: { message?: string } }
      }
      if (error.response?.status === 422) {
        setError(error.response.data?.message || 'Invalid credentials provided.')
      } else if (error.response?.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col bg-zinc-900 border-r border-border text-white lg:flex">
        <div className="absolute inset-0 bg-linear-to-b from-zinc-800 to-zinc-950 opacity-90" />
        <div className="relative z-20 flex flex-col h-full p-10 justify-between">
          <div className="flex items-center gap-3 font-bold tracking-tight">
            <img src={logoWhite} alt={siteName} className="h-8 w-auto drop-shadow-md" />
          </div>

          <div className="mt-auto max-w-lg">
            <blockquote className="space-y-4">
              <p className="text-xl font-medium leading-relaxed tracking-wide text-zinc-100">
                &ldquo;{siteName} provides the most comprehensive platform to manage our ad
                campaigns, track real-time performance, and drive our team's productivity to the
                next level.&rdquo;
              </p>
              <footer className="text-sm font-medium text-zinc-400">
                &mdash; The {siteName} System
              </footer>
            </blockquote>
          </div>
        </div>
      </div>

      <div className="relative flex w-full items-center justify-center p-4 sm:p-8 md:p-12 bg-background">
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-col justify-center space-y-8">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <div className="flex justify-center lg:hidden mb-6">
              <img
                src={logoRed}
                alt={siteName}
                className="h-14 w-auto dark:hidden"
                loading="eager"
              />
              <img
                src={logoWhite}
                alt={siteName}
                className="hidden h-14 w-auto dark:block"
                loading="eager"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and password to access your account
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive animate-in fade-in-50 slide-in-from-top-1">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="font-medium text-destructive/90">{error}</p>
            </div>
          )}

          <Form {...form}>
            <form
              onSubmit={(e) => {
                void form.handleSubmit(onSubmit)(e)
              }}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-medium">Email address</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                          <Mail className="h-4 w-4" />
                        </div>
                        <Input
                          placeholder="name@example.com"
                          type="email"
                          autoComplete="email"
                          className="pl-10 h-11 bg-background shadow-sm transition-all focus-visible:ring-primary/40 focus:border-primary"
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-foreground/90 font-medium">Password</FormLabel>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                          <Lock className="h-4 w-4" />
                        </div>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="pl-10 h-11 bg-background shadow-sm transition-all focus-visible:ring-primary/40 focus:border-primary"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between pt-1">
                <FormField
                  control={form.control}
                  name="remember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2.5 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked === true)
                          }}
                          className="data-[state=checked]:bg-primary h-4 w-4"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                          Remember me
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-[15px] font-semibold tracking-wide shadow-md transition-all hover:shadow-lg active:scale-[0.98] mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </Form>

          {/* Optional Footer Links */}
          <div className="mt-8 text-center text-sm text-muted-foreground space-y-1">
            <p>Secure login provided by {siteName} System.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
