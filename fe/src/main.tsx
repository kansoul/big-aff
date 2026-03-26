import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './routes'

import { AuthProvider } from '@/app/providers/AuthProvider'

import './index.css'
import { strictMode } from './config'

createRoot(document.getElementById('root')!).render(
  strictMode ? (
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>
  ) : (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  ),
)
