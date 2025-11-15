/**
 * Performance monitoring dashboard for development and debugging
 */

"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePerformanceBundle } from '@/hooks/use-performance'
import { useAPICache, api } from '@/lib/api-cache'
import { useMountedRef } from '@/hooks/use-mounted-ref'

interface PerformanceDashboardProps {
  isVisible?: boolean
  onClose?: () => void
}

export function PerformanceDashboard({ isVisible = false, onClose }: PerformanceDashboardProps) {
  const {
    renderMetrics,
    webVitals,
    apiMetrics,
    memoryInfo,
    memoryUsagePercent,
    isHighMemoryUsage
  } = usePerformanceBundle('PerformanceDashboard')

  const { stats: cacheStats } = useAPICache()
  const [backendStats, setBackendStats] = useState<any>(null)
  const mountedRef = useMountedRef()

  useEffect(() => {
    if (isVisible) {
      // Fetch backend performance stats
      api.getPerformanceStats()
        .then(stats => {
          if (mountedRef.current) {
            setBackendStats(stats)
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setBackendStats(null)
          }
        })
    }
  }, [isVisible])

  if (!isVisible) return null

  const getVitalStatus = (metric: number | null, good: number, needs: number) => {
    if (metric === null) return 'unknown'
    if (metric <= good) return 'good'
    if (metric <= needs) return 'needs-improvement'
    return 'poor'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500'
      case 'needs-improvement': return 'bg-yellow-500'
      case 'poor': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-4">
          <Tabs defaultValue="vitals" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
              <TabsTrigger value="api">API Performance</TabsTrigger>
              <TabsTrigger value="memory">Memory Usage</TabsTrigger>
              <TabsTrigger value="cache">Cache Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Largest Contentful Paint</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {webVitals.LCP ? `${webVitals.LCP.toFixed(0)}ms` : 'N/A'}
                      </span>
                      <Badge 
                        className={getStatusColor(getVitalStatus(webVitals.LCP, 2500, 4000))}
                      >
                        {getVitalStatus(webVitals.LCP, 2500, 4000)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Good: ≤2.5s, Needs improvement: ≤4s
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">First Input Delay</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {webVitals.FID ? `${webVitals.FID.toFixed(0)}ms` : 'N/A'}
                      </span>
                      <Badge 
                        className={getStatusColor(getVitalStatus(webVitals.FID, 100, 300))}
                      >
                        {getVitalStatus(webVitals.FID, 100, 300)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Good: ≤100ms, Needs improvement: ≤300ms
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cumulative Layout Shift</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {webVitals.CLS ? webVitals.CLS.toFixed(3) : 'N/A'}
                      </span>
                      <Badge 
                        className={getStatusColor(getVitalStatus(webVitals.CLS, 0.1, 0.25))}
                      >
                        {getVitalStatus(webVitals.CLS, 0.1, 0.25)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Good: ≤0.1, Needs improvement: ≤0.25
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">First Contentful Paint</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {webVitals.FCP ? `${webVitals.FCP.toFixed(0)}ms` : 'N/A'}
                      </span>
                      <Badge 
                        className={getStatusColor(getVitalStatus(webVitals.FCP, 1800, 3000))}
                      >
                        {getVitalStatus(webVitals.FCP, 1800, 3000)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Good: ≤1.8s, Needs improvement: ≤3s
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Time to First Byte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {webVitals.TTFB ? `${webVitals.TTFB.toFixed(0)}ms` : 'N/A'}
                      </span>
                      <Badge 
                        className={getStatusColor(getVitalStatus(webVitals.TTFB, 800, 1800))}
                      >
                        {getVitalStatus(webVitals.TTFB, 800, 1800)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Good: ≤800ms, Needs improvement: ≤1.8s
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Component Renders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Last Render:</span>
                        <span className="font-mono">{renderMetrics.renderTime.toFixed(2)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Update Count:</span>
                        <span className="font-mono">{renderMetrics.updateCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Active Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">{apiMetrics.activeRequests}</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Response Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">
                      {apiMetrics.averageResponseTime.toFixed(0)}ms
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">{apiMetrics.requestCount}</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Error Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">
                      {apiMetrics.requestCount > 0 
                        ? ((apiMetrics.errorCount / apiMetrics.requestCount) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </CardContent>
                </Card>
              </div>

              {backendStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Backend Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                        <p className="text-lg font-semibold">{backendStats.cache_stats?.hit_rate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cache Size</p>
                        <p className="text-lg font-semibold">{backendStats.cache_stats?.cache_size || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">API Version</p>
                        <p className="text-lg font-semibold">{backendStats.api_version}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Optimizations</p>
                        <Badge variant={backendStats.optimizations_enabled ? 'default' : 'destructive'}>
                          {backendStats.optimizations_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="memory" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Memory Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Used:</span>
                        <span className="font-mono">
                          {memoryInfo ? `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total:</span>
                        <span className="font-mono">
                          {memoryInfo ? `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Limit:</span>
                        <span className="font-mono">
                          {memoryInfo ? `${(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Usage Percentage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{memoryUsagePercent.toFixed(1)}%</span>
                      <Badge variant={isHighMemoryUsage ? 'destructive' : 'default'}>
                        {isHighMemoryUsage ? 'High' : 'Normal'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (window.gc) {
                          window.gc()
                        } else {
                          console.log('Manual garbage collection not available')
                        }
                      }}
                    >
                      Force GC
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="cache" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Hit Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">{cacheStats.hitRate}</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cache Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">{cacheStats.cacheSize}</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">{cacheStats.totalRequests}</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold">{cacheStats.pendingRequests}</span>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cache Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Hits</p>
                      <p className="font-semibold">{cacheStats.hits}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Misses</p>
                      <p className="font-semibold">{cacheStats.misses}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Errors</p>
                      <p className="font-semibold">{cacheStats.errors}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => api.clearCache()}
                    >
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}