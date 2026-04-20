import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Server,
  LockKeyhole,
} from 'lucide-react'

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
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden">
      {/* Hero Section (Left on Desktop) */}
      <div className="relative hidden w-full lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-between bg-zinc-950 overflow-hidden text-white p-12 lg:p-16">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] lg:w-[50vw] lg:h-[50vw] rounded-full bg-indigo-600/30 blur-[100px] mix-blend-screen animate-in fade-in duration-1000" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60vw] h-[60vw] lg:w-[40vw] lg:h-[40vw] rounded-full bg-emerald-600/20 blur-[100px] mix-blend-screen animate-in fade-in duration-1000 delay-300" />
        <div className="absolute top-[30%] right-[10%] w-[40vw] h-[40vw] lg:w-[30vw] lg:h-[30vw] rounded-full bg-rose-600/20 blur-[100px] mix-blend-screen animate-in fade-in duration-1000 delay-500" />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

        <div className="relative z-20 flex items-center gap-3 font-bold tracking-tight">
          <img src={logoWhite} alt={siteName} className="h-10 w-auto drop-shadow-xl" />
        </div>

        <div className="relative z-20 w-full max-w-md mb-36 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-8 shadow-sm">
            <LockKeyhole className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide text-zinc-100 uppercase">
              System Access
            </span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-6 leading-tight">
            Your unified management workspace.
          </h1>
          <p className="text-lg text-zinc-300 font-medium leading-relaxed mb-10">
            Connect to your workspace to analyze real-time performance, manage resources, and
            orchestrate daily operations seamlessly.
          </p>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                <span className="text-xl font-bold text-white">Protected</span>
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Secure Connection
              </span>
            </div>
            <div className="flex flex-col gap-2 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-400" />
                <span className="text-xl font-bold text-white">Online</span>
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                System Status
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section (Right on Desktop, Full on Mobile) */}
      <div className="relative flex w-full lg:w-[55%] xl:w-[50%] flex-col justify-center bg-background px-6 sm:px-12 py-12 animate-in fade-in zoom-in-95 duration-500 shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.1)]">
        <div className="absolute right-6 top-6 md:right-8 md:top-8 z-50">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-[400px]">
          <div className="flex justify-center lg:hidden mb-12">
            <img src={logoRed} alt={siteName} className="h-14 w-auto dark:hidden" loading="eager" />
            <img
              src={logoWhite}
              alt={siteName}
              className="hidden h-14 w-auto dark:block"
              loading="eager"
            />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Login</h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Welcome back. Please enter your details to access your dashboard.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 mb-8 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-foreground font-semibold text-sm">
                        Password
                      </FormLabel>
                    </div>
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

              <div className="flex items-center justify-between pt-2">
                <FormField
                  control={form.control}
                  name="remember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked === true)
                          }}
                          className="data-[state=checked]:bg-primary h-5 w-5 rounded-md border-muted-foreground/30"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                          Remember my device
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
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
                      Continue to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Form>

          {/* Footer Area */}
          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground font-medium">
              Provided by {siteName} Systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
