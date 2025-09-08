"use client"

import { useEffect, useState, Suspense } from 'react'

interface ClientWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  useSuspense?: boolean
}

function ClientOnlyContent({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default function ClientWrapper({ children, fallback = null, useSuspense = true }: ClientWrapperProps) {
  if (useSuspense) {
    return (
      <Suspense fallback={fallback}>
        <ClientOnlyContent fallback={fallback}>
          {children}
        </ClientOnlyContent>
      </Suspense>
    )
  }

  return (
    <ClientOnlyContent fallback={fallback}>
      {children}
    </ClientOnlyContent>
  )
}