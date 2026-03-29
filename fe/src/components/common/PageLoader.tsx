export function PageLoader() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative flex size-16 items-center justify-center">
        <span
          className="absolute size-10 rounded-full border-2 border-muted border-t-red-600 motion-safe:animate-spin dark:border-t-red-400"
          aria-hidden
        />
      </div>
    </div>
  )
}
