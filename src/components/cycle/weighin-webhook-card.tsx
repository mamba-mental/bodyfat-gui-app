"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Webhook, Check, X } from "lucide-react"
import { getWebhookUrl, setWebhookUrl, fireWeighInWebhook } from "@/lib/weighinWebhook"

/**
 * n8n webhook settings (P9). One outbound webhook the user owns; on report
 * generation we POST the next weigh-in so their flow can create a calendar event /
 * Todoist task / Sunsama task. Stored client-side for this single-user local app.
 */
export function WeighInWebhookCard() {
  const [url, setUrl] = React.useState("")
  const [saved, setSaved] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{ ok: boolean; msg: string } | null>(null)

  React.useEffect(() => {
    setUrl(getWebhookUrl())
  }, [])

  const save = () => {
    setWebhookUrl(url)
    setSaved(true)
    setTestResult(null)
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fireWeighInWebhook({ urlOverride: url, reportTitle: "Test from Settings" })
      if (!res.attempted) {
        setTestResult({ ok: false, msg: "Enter a webhook URL first." })
      } else if (res.ok) {
        setTestResult({ ok: true, msg: `Delivered (HTTP ${res.status}). Next weigh-in: ${res.payload?.next_weighin_date ?? "none scheduled"}.` })
      } else {
        setTestResult({ ok: false, msg: res.error ?? `Webhook returned HTTP ${res.status}.` })
      }
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Weigh-In Reminders (n8n)
        </CardTitle>
        <CardDescription>
          When you generate a report, we&apos;ll POST your next weigh-in to this n8n webhook so your
          flow can add a calendar event, Todoist task, or Sunsama task. Optional and non-blocking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="webhook-url">n8n Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://n8n.primemind.dk/webhook/weighin"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setSaved(false)
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={!url && !getWebhookUrl()}>
            Save
          </Button>
          <Button variant="outline" onClick={test} disabled={testing || !url}>
            {testing ? "Sending..." : "Send test"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
              testResult.ok
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            {testResult.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{testResult.msg}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          The payload includes an idempotency key (cycle + date) so retries won&apos;t double-create
          downstream tasks. Failures here never block report generation.
        </p>
      </CardContent>
    </Card>
  )
}
