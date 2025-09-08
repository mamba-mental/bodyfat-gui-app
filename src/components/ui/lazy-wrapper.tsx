"use client"

import React, { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  title?: string
  description?: string
  height?: string
  className?: string
}

const DefaultSkeleton = ({ title, description, height = "h-48" }: { title?: string, description?: string, height?: string }) => (
  <Card className="w-full">
    {(title || description) && (
      <CardHeader>
        {title && (
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        )}
        {description && (
          <Skeleton className="h-4 w-48 mt-2" />
        )}
      </CardHeader>
    )}
    <CardContent>
      <div className={`space-y-3 ${height}`}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export function LazyWrapper({ 
  children, 
  fallback, 
  title, 
  description, 
  height = "h-48",
  className = ""
}: LazyWrapperProps) {
  const loadingFallback = fallback || (
    <DefaultSkeleton title={title} description={description} height={height} />
  )

  return (
    <div className={className}>
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </div>
  )
}

// Chart-specific skeleton
export const ChartSkeleton = ({ title, height = "h-64" }: { title?: string, height?: string }) => (
  <Card>
    <CardHeader>
      {title && (
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
      )}
      <Skeleton className="h-4 w-56" />
    </CardHeader>
    <CardContent>
      <div className={`${height} flex items-end justify-between space-x-2`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="w-8" 
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
)

// AI component skeleton
export const AISkeleton = ({ compact = false }: { compact?: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {Array.from({ length: compact ? 2 : 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </CardContent>
  </Card>
)