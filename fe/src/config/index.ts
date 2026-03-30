export const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const strictMode = import.meta.env.VITE_STRICT_MODE === 'true'

/** Base name in `<title>` (`Page`). Override with `VITE_APP_TITLE`. */
export const appTitle = import.meta.env.VITE_APP_TITLE?.trim() || 'fe'
