import React from 'react'

const SuspenseFallback: React.FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  )
}

export default SuspenseFallback
