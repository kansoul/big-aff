import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PATHS } from '@/constants/paths'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {/* Glowing number */}
      <div className="relative select-none">
        <span
          className="text-[10rem] font-black leading-none tracking-tighter text-foreground/5 sm:text-[14rem]"
          aria-hidden="true"
        >
          404
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-[4rem] font-black tracking-tight text-foreground sm:text-[6rem]">
          404
        </span>
      </div>

      {/* Divider */}
      <div className="mt-6 h-px w-20 bg-border" />

      {/* Message */}
      <div className="mt-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Page not found
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has been moved. Check the URL or
          navigate back to safety.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Button
          size="lg"
          className="min-w-36 gap-2 font-semibold"
          onClick={() => void navigate(PATHS.dashboard)}
        >
          Go to Dashboard
        </Button>
        <Button
          size="lg"
          className="min-w-36 gap-2 font-semibold"
          onClick={() => void navigate(-1)}
        >
          Go Back
        </Button>
      </div>

      {/* Decorative dots */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>
    </div>
  )
}
