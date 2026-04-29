/// <reference types="vite/client" />

declare global {
  type AppDomain = 'ticollab' | 'nexa'
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_STRICT_MODE?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_SITE_DOMAIN?: AppDomain
}

import type { RowData } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string
    thClassName?: string
    tdClassName?: string
  }
}
