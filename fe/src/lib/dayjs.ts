import dayjsOriginal from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjsOriginal.extend(utc)
dayjsOriginal.extend(timezone)

// sang utc -7
dayjsOriginal.tz.setDefault('America/Los_Angeles')

const LA_TZ = 'America/Los_Angeles'

// Create a wrapper function that behaves like dayjs but uses the default timezone
const dayjs = ((...args: Parameters<typeof dayjsOriginal>) => {
  if (args.length === 0) {
    return dayjsOriginal.tz()
  }
  const [date, ...rest] = args
  // Date objects from Calendar carry local-timezone wall-clock parts.
  // Re-interpret those parts in LA to avoid cross-timezone date shifts.
  if (date instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const localIso =
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    return dayjsOriginal.tz(localIso, LA_TZ)
  }
  return dayjsOriginal.tz(date, ...(rest as [string?]))
}) as typeof dayjsOriginal

// Copy all static properties and methods
Object.assign(dayjs, dayjsOriginal)

export default dayjs
export type { Dayjs } from 'dayjs'
