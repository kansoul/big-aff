import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './routes'

import { AuthProvider } from '@/app/providers/AuthProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { PageLoader } from '@/components/common/PageLoader'
import { Toaster } from '@/components/ui/sonner'

import './index.css'
import { strictMode } from './config'

import faviconUrl from '@/assets/logo-red.png'

const faviconLink = document.createElement('link')
faviconLink.rel = 'icon'
faviconLink.type = 'image/png'
faviconLink.href = faviconUrl
document.head.appendChild(faviconLink)

createRoot(document.getElementById('root')!).render(
  strictMode ? (
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </AuthProvider>
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
    </StrictMode>
  ) : (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  ),
)
