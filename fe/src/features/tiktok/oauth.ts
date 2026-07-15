// Captures the TikTok OAuth params from the initial URL at module load — i.e.
// before React renders and the `/` -> dashboard <Navigate replace> drops the
// query string. TikTok redirects the advertiser's browser to the SPA root with
// `?auth_code=...&state=...` (or `?error=...` if authorization was denied).

export type CapturedTikTokOAuth = {
  authCode: string | null
  state: string | null
  error: string | null
  errorDescription: string | null
}

function capture(): CapturedTikTokOAuth {
  if (typeof window === 'undefined') {
    return { authCode: null, state: null, error: null, errorDescription: null }
  }

  const params = new URLSearchParams(window.location.search)
  return {
    authCode: params.get('auth_code') ?? params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  }
}

export const capturedTikTokOAuth: CapturedTikTokOAuth = capture()

let handled = false

/**
 * Returns the captured OAuth params exactly once (null on subsequent calls and
 * when there was no TikTok redirect), so the exchange runs a single time even
 * under React StrictMode's double-mount.
 */
export function consumeTikTokOAuth(): CapturedTikTokOAuth | null {
  if (handled) {
    return null
  }
  handled = true

  if (!capturedTikTokOAuth.authCode && !capturedTikTokOAuth.error) {
    return null
  }

  return capturedTikTokOAuth
}

/** Remove the OAuth params from the address bar without triggering navigation. */
export function stripTikTokOAuthQuery(): void {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)
  for (const key of ['auth_code', 'code', 'state', 'error', 'error_description']) {
    url.searchParams.delete(key)
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}
