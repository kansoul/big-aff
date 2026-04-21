import type { LogLevel } from '@/features/logs/types'

const LEVEL_STYLES: Record<LogLevel, string> = {
  emergency: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-400',
  alert: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-400',
  critical:
    'bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  error: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-400',
  warning:
    'bg-yellow-100 text-yellow-800 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-600',
  notice: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  info: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-400',
  debug: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-400',
}

type Props = { level: string }

export function LogLevelBadge({ level }: Props) {
  const normalized = level.toLowerCase() as LogLevel
  const style = LEVEL_STYLES[normalized] ?? 'bg-gray-100 text-gray-600 ring-gray-200'

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${style}`}
    >
      {level}
    </span>
  )
}
