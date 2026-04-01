"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Database, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getSyncStatus, syncData } from '@/lib/storage-api'

interface SyncStatusData {
  redisEntries: number
  sqliteEntries: number
  redisReports: number
  sqliteReports: number
  inSync: boolean
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSyncStatus()
      setStatus(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync status')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await syncData()
      if (result.success) {
        setLastSync(new Date().toLocaleTimeString())
        // Refresh status after sync
        await fetchStatus()
      } else {
        setError(result.error || 'Sync failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [fetchStatus])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Synchronization
        </CardTitle>
        <CardDescription>
          Sync status between Redis cache and SQLite database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading status...</div>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sync Status</span>
              <Badge variant={status.inSync ? 'default' : 'destructive'}>
                {status.inSync ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    In Sync
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Out of Sync
                  </span>
                )}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Redis Cache</div>
                <div className="font-mono">
                  {status.redisEntries} entries, {status.redisReports} reports
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">SQLite (Source of Truth)</div>
                <div className="font-mono">
                  {status.sqliteEntries} entries, {status.sqliteReports} reports
                </div>
              </div>
            </div>

            {lastSync && (
              <div className="text-xs text-muted-foreground">
                Last synced: {lastSync}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button
            variant="outline"
            onClick={fetchStatus}
            disabled={loading}
          >
            Refresh Status
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          SQLite is the source of truth. Clicking &quot;Sync Now&quot; will update Redis cache
          from SQLite data. Use this if data appears inconsistent.
        </p>
      </CardContent>
    </Card>
  )
}
