import { useNavigate } from 'react-router-dom'
import { LockKeyhole, Shield, Server } from 'lucide-react'

import logoRed from '@/assets/logo-s-red.png'
import logoWhite from '@/assets/logo-s-white.png'
import logoNexaLight from '@/assets/logo-nexa.png'
import logoNexaDark from '@/assets/dark-logo-nexa.png'
import tripLogo from '@/assets/trip-logo.png'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { PATHS } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useSessionStore } from '@/hooks/useSessionStore'
import { siteDomain, siteName } from '@/config'
import type { User } from '@/shared/types'

function LoginLogo({ theme, showTripLogo }: { theme: string; showTripLogo: boolean }) {
  const primaryLogo =
    siteDomain === 'nexa'
      ? theme === 'dark'
        ? logoNexaDark
        : logoNexaLight
      : theme === 'dark'
        ? logoWhite
        : logoRed

  return (
    <span className="flex min-w-0 items-center gap-2">
      <img
        src={primaryLogo}
        alt={siteDomain === 'nexa' ? 'Nexa' : 'Ticollab'}
        className="h-7 w-auto shrink-0 object-contain object-left md:h-10"
      />
      {showTripLogo ? (
        <>
          <span className="h-5 w-px shrink-0 bg-border/70" aria-hidden />
          <img
            src={tripLogo}
            alt="Trip"
            className="h-13 w-auto shrink-0 object-contain object-left md:h-18"
          />
        </>
      ) : null}
    </span>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const showTripLogo = Boolean(siteDomain === 'ticollab')
  const addSession = useSessionStore((s) => s.addSession)

  const handleSuccess = (user: User, token: string) => {
    addSession(user, token)
    setUser(user)
    void navigate(PATHS.dashboard)
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden">
      {/* Hero Section (Left on Desktop) */}
      <div className="relative hidden w-full lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-between bg-zinc-950 overflow-hidden text-white p-12 lg:p-16">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] lg:w-[50vw] lg:h-[50vw] rounded-full bg-indigo-600/30 blur-[100px] mix-blend-screen animate-in fade-in duration-1000" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60vw] h-[60vw] lg:w-[40vw] lg:h-[40vw] rounded-full bg-emerald-600/20 blur-[100px] mix-blend-screen animate-in fade-in duration-1000 delay-300" />
        <div className="absolute top-[30%] right-[10%] w-[40vw] h-[40vw] lg:w-[30vw] lg:h-[30vw] rounded-full bg-rose-600/20 blur-[100px] mix-blend-screen animate-in fade-in duration-1000 delay-500" />

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

        <div className="relative z-20 flex items-center gap-3 font-bold tracking-tight">
          <LoginLogo theme="dark" showTripLogo={showTripLogo} />
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

      {/* Form Section */}
      <div className="relative flex w-full lg:w-[55%] xl:w-[50%] flex-col justify-center bg-background px-6 sm:px-12 py-12 animate-in fade-in zoom-in-95 duration-500 shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.1)]">
        <div className="absolute right-6 top-6 md:right-8 md:top-8 z-50">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-[400px]">
          <div className="flex justify-center lg:hidden mb-12">
            <LoginLogo theme="dark" showTripLogo={showTripLogo} />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Login</h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Welcome back. Please enter your details to access your dashboard.
            </p>
          </div>

          <LoginForm onSuccess={handleSuccess} submitLabel="Continue to Dashboard" />

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
