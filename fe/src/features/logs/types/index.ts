export type LogLevel =
  | 'emergency'
  | 'alert'
  | 'critical'
  | 'error'
  | 'warning'
  | 'notice'
  | 'info'
  | 'debug'

export type LogFile = {
  name: string
  size: number
  modified_at: string
}

export type LogEntry = {
  id: string
  timestamp: string
  channel: string
  level: LogLevel
  message: string
  stack_trace: string
  raw: string
}

export type LogPagination = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type LogListResponse = {
  data: LogEntry[]
  pagination: LogPagination
}

export type LogFilesResponse = {
  data: LogFile[]
}

export type LogTailResponse = {
  data: LogEntry[]
}

export type LogEntryResponse = {
  data: LogEntry
}

export type LogFilters = {
  file: string | null
  level: LogLevel | null
  keyword: string | null
}
