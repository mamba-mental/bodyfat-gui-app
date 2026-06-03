/**
 * Outbound n8n webhook for the next weigh-in (P9).
 *
 * On report generation we optionally notify a single n8n webhook so the user's
 * own flow can create a calendar event / Todoist task / Sunsama task for their
 * next scheduled check-in. Design constraints from the plan:
 *  - single outbound webhook the user owns (n8n.primemind.dk),
 *  - failures are NON-FATAL and surfaced, never blocking report generation,
 *  - idempotency key so retries/duplicate fires don't double-create downstream.
 *
 * The webhook URL is stored client-side (single-user local app). Production
 * multi-user would move this to a server-only encrypted secret store — tracked
 * in the Settings "Coming Soon" cloud-sync card.
 */

import { nextWeighIn } from "./cycleWeek"

const WEBHOOK_KEY = "n8n_weighin_webhook_url"

export function getWebhookUrl(): string {
  if (typeof window === "undefined") return ""
  try {
    return window.localStorage.getItem(WEBHOOK_KEY) ?? ""
  } catch {
    return ""
  }
}

export function setWebhookUrl(url: string): void {
  if (typeof window === "undefined") return
  try {
    if (url) window.localStorage.setItem(WEBHOOK_KEY, url.trim())
    else window.localStorage.removeItem(WEBHOOK_KEY)
  } catch {
    /* ignore quota / disabled storage */
  }
}

export interface WeighInWebhookPayload {
  event: "next_weighin"
  idempotency_key: string
  next_weighin_date: string | null
  cycle_id: string | null
  cycle_name: string | null
  weighin_days: number[]
  report_title?: string
  generated_at: string
  source: "apexfit"
}

export interface WebhookResult {
  attempted: boolean
  ok: boolean
  status?: number
  error?: string
  payload?: WeighInWebhookPayload
}

function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA")
}

/**
 * Fire the webhook for the active cycle's next weigh-in. Self-contained: reads the
 * URL + the active cycle itself. Returns a result instead of throwing so callers
 * can surface failure without aborting report generation.
 */
export async function fireWeighInWebhook(opts?: {
  reportTitle?: string
  urlOverride?: string
}): Promise<WebhookResult> {
  const url = (opts?.urlOverride ?? getWebhookUrl()).trim()
  if (!url) return { attempted: false, ok: false }

  try {
    // Load the active cycle to compute the next weigh-in + label the event.
    const res = await fetch("/api/data/cycles", { cache: "no-store" })
    const cycles = res.ok ? await res.json() : []
    const active = Array.isArray(cycles)
      ? cycles.find((c: any) => c.status === "active")
      : null

    const weighinDays: number[] = Array.isArray(active?.weighin_days) ? active.weighin_days : []
    const today = todayLocalISO()
    const next = nextWeighIn(today, weighinDays)

    const payload: WeighInWebhookPayload = {
      event: "next_weighin",
      // Idempotency: same cycle + same next date => same key, so n8n can dedupe.
      idempotency_key: `${active?.id ?? "nocycle"}:${next ?? "none"}`,
      next_weighin_date: next,
      cycle_id: active?.id ?? null,
      cycle_name: active?.name ?? null,
      weighin_days: weighinDays,
      report_title: opts?.reportTitle,
      generated_at: new Date().toISOString(),
      source: "apexfit",
    }

    const hookRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    return { attempted: true, ok: hookRes.ok, status: hookRes.status, payload }
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: error instanceof Error ? error.message : "Webhook request failed",
    }
  }
}
