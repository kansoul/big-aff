import React from 'react'
import { Outlet } from 'react-router-dom'

import { DocumentTitle } from '@/components/common/DocumentTitle'

const AuthLayout: React.FC = () => {
  return (
    <div className="auth-layout-wrapper">
      <DocumentTitle />
      <Outlet />
    </div>
  )
}

export default AuthLayout
