"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, TrendingUp, Target, Activity, Brain, AlertCircle, CheckCircle, FileDown, TrashIcon, Eye, CalendarRange, ShieldCheck } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"
import { useApp } from "@/contexts/app-context"
import { ProgressTrendChart } from "@/components/charts/progress-trend-chart"
import { generatePDFFromHTML, generateStyledPDF } from "@/lib/pdf-generator"
import { Report } from "@/types"
import TurndownService from 'turndown'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { defaultSelectedCycle, scopeByCycle, ALL_CYCLES } from "@/lib/cycleScope"
import { sourceFingerprint, canGenerateReport } from "@/lib/reportGate"
import type { Cycle } from "@/hooks/use-cycles"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { CycleContextBanner } from "@/components/cycle/cycle-context-banner"
import { fetchGeneratedLivingReport, generateId } from "@/lib/storage-api"
import { challengeApi } from "@/lib/challenge-api"
import { WorkspacePageHeader } from "@/components/layout/workspace-page-header"
import { buildLivingReportActualEntries } from "@/lib/livingReportEntries"
import { dedupeReportsByArtifact } from "@/lib/reportArtifacts"

const CALC_VERSION = "calc-v1"
const GENERATOR_VERSION = "gen-v3"

/**
 * Tiny sentinel that fires a callback once when its subtree mounts.
 * Used so the AI Analysis tab triggers the on-demand fetch immediately
 * when the user clicks the tab (TabsContent mounts lazily on first visit).
 */
function AiTabMountTrigger({ onMount }: { onMount: () => void }) {
  React.useEffect(() => {
    onMount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount only
  return null
}

export default function ReportsPage() {
  const { state, dispatch, generateNewReport, deleteReport } = useApp()
  const {
    current_user,
    current_calculation,
    entries: allEntries,
    reports: allReports,
    loading,
    error,
    report_generation_status,
    report_generation_entry_date,
  } = state

  // ReComp Cycle scoping (P4): load cycles, default to the CURRENT (active) cycle,
  // let the user pick a specific cycle or aggregate "All ReComp Cycles".
  const [cycles, setCycles] = React.useState<Cycle[]>([])
  const [selectedCycleId, setSelectedCycleId] = React.useState<string>(ALL_CYCLES)
  React.useEffect(() => {
    let alive = true
    fetch('/api/data/cycles')
      .then((r) => (r.ok ? r.json() : []))
      .then((cs) => {
        if (!alive) return
        const list = Array.isArray(cs) ? cs : []
        setCycles(list)
        setSelectedCycleId(
          defaultSelectedCycle(list.map((c: any) => ({ id: c.id, status: c.status, startDate: c.start_date })))
        )
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  const entries = scopeByCycle(allEntries as any[], selectedCycleId)
  const uniqueReports = React.useMemo(
    () => dedupeReportsByArtifact(allReports as Report[]),
    [allReports],
  )
  const reports = scopeByCycle(uniqueReports as any[], selectedCycleId)
  const selectedChallenge = React.useMemo(() => {
    const candidates = cycles.filter((cycle) => cycle.plan_mode === 'two_week_cut')
    if (selectedCycleId !== ALL_CYCLES) return candidates.find((cycle) => cycle.id === selectedCycleId) || null
    return candidates.find((cycle) => cycle.status === 'active') || candidates[0] || null
  }, [cycles, selectedCycleId])
  const latestChallengeReport = React.useMemo(
    () => uniqueReports.find((report) => report.report_type === 'two_week_cut' && (!selectedChallenge || report.cycle_id === selectedChallenge.id)) || null,
    [uniqueReports, selectedChallenge],
  )

  // Real elapsed weeks between two entry dates (floored at 1/7 wk to avoid divide-by-zero).
  // Fixes "per week" stats that previously assumed every entry was exactly one week apart.
  const weeksBetween = (laterISO?: string, earlierISO?: string): number => {
    if (!laterISO || !earlierISO) return 1
    const ms = new Date(laterISO).getTime() - new Date(earlierISO).getTime()
    return Math.max(1 / 7, ms / (7 * 24 * 60 * 60 * 1000))
  }

  const buildFileApiPath = (report: Report, ext: string): string | undefined => {
    if (report.file_base) {
      return `/api/reports/files/${report.file_base}.${ext}`
    }
    const storagePath =
      ext === "pdf" ? report.pdf_path :
      ext === "md" ? report.markdown_path :
      ext === "html" ? report.html_path :
      undefined
    if (storagePath) {
      const filename = storagePath.split('/').pop()
      if (filename) {
        return `/api/reports/files/${filename}`
      }
    }
    return undefined
  }

  // Living Report generation state
  const [livingReportLoading, setLivingReportLoading] = useState(false)
  const [livingReportError, setLivingReportError] = useState<string | null>(null)
  const [challengeReportLoading, setChallengeReportLoading] = useState(false)

  const handleGenerateChallengeReport = async () => {
    if (!selectedChallenge) return
    setChallengeReportLoading(true)
    setLivingReportError(null)
    try {
      const generated = await challengeApi.report(selectedChallenge.id) as unknown as Report
      dispatch({ type: 'ADD_REPORT', payload: generated })
      const html = generated.html_content
      if (html) {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
        window.open(url, '_blank')
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch (reason) {
      setLivingReportError(reason instanceof Error ? reason.message : 'Failed to generate the 14-day report')
    } finally {
      setChallengeReportLoading(false)
    }
  }

  const handleGenerateLivingReport = async () => {
    if (!current_user) return
    setLivingReportLoading(true)
    setLivingReportError(null)
    try {
      // `entries` is already scoped by the selected cycle. Its cycle start date
      // wins over the profile date so historical reports retain their own week 1.
      const selectedCycle = selectedCycleId === ALL_CYCLES
        ? null
        : cycles.find((cycle) => cycle.id === selectedCycleId) ?? null
      const actualEntries = buildLivingReportActualEntries(
        entries as any[],
        selectedCycle?.start_date ?? current_user.start_date,
      )
      const res = await fetchGeneratedLivingReport(current_user, actualEntries)
      if (!res.html_content) throw new Error('Living report returned no HTML content')

      // Register the living report in the in-memory store so it appears in
      // Report History immediately (the backend already inserted a DB row).
      const now = new Date()
      const livingReportRecord = {
        id: res.id ?? generateId(),
        user_id: current_user.name ?? 'default',
        title: `Living Report — ${current_user.name ?? 'User'} (${now.toLocaleDateString()})`,
        generated_at: now.toISOString(),
        html_content: res.html_content,
        html_path: res.html_path,
        markdown_path: res.md_path,
        // report_type is a pass-through field — kept for history badge rendering
        report_type: 'living',
      } as any
      dispatch({ type: 'ADD_REPORT', payload: livingReportRecord })

      const blob = new Blob([res.html_content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error('[ReportsPage] Living report generation failed:', err)
      setLivingReportError(err instanceof Error ? err.message : 'Failed to generate living report')
    } finally {
      setLivingReportLoading(false)
    }
  }

  // P7: block generating a report when there's no NEW data since the last one.
  // reason 'no-entries' = the target cycle has nothing to report on yet;
  // 'no-new-data' = the latest entry is unchanged since the last report.
  const [gateDialog, setGateDialog] = useState<{ open: boolean; reason: "no-entries" | "no-new-data" }>(
    { open: false, reason: "no-new-data" }
  )

  // The cycle a new report belongs to: the selected one, or the active cycle when
  // viewing "All ReComp Cycles".
  const targetCycleId = React.useMemo(() => {
    if (selectedCycleId !== ALL_CYCLES) return selectedCycleId
    return cycles.find((c: any) => c.status === "active")?.id ?? ""
  }, [selectedCycleId, cycles])

  const handleGenerateReport = async () => {
    const targetEntries = scopeByCycle(allEntries as any[], targetCycleId || ALL_CYCLES)
    const latest = targetEntries[0]
    if (!latest) {
      setGateDialog({ open: true, reason: "no-entries" })
      return
    }
    const currentFp = sourceFingerprint({
      cycleId: targetCycleId,
      entryId: String(latest.id),
      entryDate: String(latest.date).slice(0, 10),
      entryUpdatedAt: String(latest.updated_at ?? ""),
      calcVersion: CALC_VERSION,
      generatorVersion: GENERATOR_VERSION,
    })
    const targetReports = scopeByCycle(uniqueReports as any[], targetCycleId || ALL_CYCLES)
    const lastFp = (targetReports[0] as any)?.source_fingerprint ?? null
    const gate = canGenerateReport(lastFp, currentFp)
    if (!gate.allowed) {
      setGateDialog({ open: true, reason: "no-new-data" })
      return
    }
    await generateNewReport(undefined, { sourceFingerprint: currentFp, cycleId: targetCycleId })
  }

  // --- On-demand AI analysis fetch ---
  // Fast-path report generation intentionally skips the AI call, so
  // calculation_result.ai_analysis is often null on the latest report.
  // When the user opens the AI Analysis tab we lazily fetch it here and
  // cache the result in component state so it doesn't refetch on re-renders.
  const [aiAnalysisCache, setAiAnalysisCache] = React.useState<Record<string, string | null>>({})
  const [aiAnalysisLoading, setAiAnalysisLoading] = React.useState(false)
  const [aiAnalysisFailed, setAiAnalysisFailed] = React.useState(false)

  // The latest generated report for the selected cycle (reports are already
  // cycle-scoped via scopeByCycle above and sorted newest-first by the API).
  const latestReport = reports[0] as any | undefined

  // Effective AI analysis: prefer what's stored on the report; fall back to
  // the on-demand fetched value cached in state.
  const latestReportId: string | undefined = latestReport?.id
  const storedAiAnalysis: string | null | undefined =
    latestReport?.calculation_result?.ai_analysis ?? null
  const cachedAiAnalysis: string | null =
    latestReportId ? (aiAnalysisCache[latestReportId] ?? null) : null
  const effectiveAiAnalysis: string | null = storedAiAnalysis || cachedAiAnalysis

  const fetchAiAnalysisOnDemand = React.useCallback(async () => {
    if (!latestReport || !latestReport.calculation_result) return
    if (effectiveAiAnalysis) return          // already have it
    if (aiAnalysisLoading) return            // fetch in progress
    // Note: aiAnalysisFailed is NOT checked here so callers can clear it
    // before invoking (enabling manual retry). Auto-triggers guard via the
    // AiTabMountTrigger / onFocus paths by only calling when the tab first
    // mounts (mount trigger runs once) or gains focus naturally.

    setAiAnalysisLoading(true)
    setAiAnalysisFailed(false)
    try {
      const body = {
        user: current_user,
        entries,
        calculation: latestReport.calculation_result,
      }
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`AI insights fetch failed: ${res.status}`)
      const data = await res.json()
      // The /api/ai/insights endpoint returns an array of insight objects.
      // Combine them into a single narrative string so it renders like a
      // stored ai_analysis field.
      let analysisText: string | null = null
      if (Array.isArray(data) && data.length > 0) {
        analysisText = data
          .map((ins: any) => `**${ins.title}**: ${ins.content}`)
          .join('\n\n')
      } else if (typeof data === 'string' && data.length > 0) {
        analysisText = data
      }
      if (latestReportId && analysisText) {
        setAiAnalysisCache((prev) => ({ ...prev, [latestReportId]: analysisText }))
      }
    } catch (err) {
      console.warn('[ReportsPage] On-demand AI analysis fetch failed:', err)
      setAiAnalysisFailed(true)
    } finally {
      setAiAnalysisLoading(false)
    }
  }, [latestReport, effectiveAiAnalysis, aiAnalysisLoading, current_user, entries, latestReportId])

  // Lazy-fetch html_content on demand. List response strips html_content for speed,
  // so we hit /api/data/reports/{id} only when the user clicks an action that needs it.
  const ensureHtmlContent = async (report: any): Promise<string | null> => {
    if (report?.html_content) return report.html_content as string
    if (!report?.id) return null
    try {
      const res = await fetch(`/api/data/reports/${encodeURIComponent(report.id)}`)
      if (!res.ok) return null
      const full = await res.json()
      return full?.html_content ?? null
    } catch (err) {
      console.error('Failed to fetch full report:', err)
      return null
    }
  }

  const handleDownloadHTML = async (report: any) => {
    const html = await ensureHtmlContent(report)
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadMarkdown = async (report: any) => {
    const html = await ensureHtmlContent(report)
    if (!html) return
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-'
    })

    turndownService.addRule('tables', {
      filter: 'table',
      replacement: function(content) {
        return '\n\n' + content + '\n\n'
      }
    })

    const markdown = turndownService.turndown(html)

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = async (report: Report) => {
    const html = await ensureHtmlContent(report)
    if (html) {
      await generatePDFFromHTML(html, `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
      return
    }

    // Fallback: try the styled generator if no html_content available
    try {
      await generateStyledPDF(report)
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Unable to generate PDF: no report content available')
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      await deleteReport(reportId)
    }
  }

  const handleViewFullReport = async (report: any) => {
    const html = await ensureHtmlContent(report)
    if (!html) return
    const win = window.open("", "_blank")
    if (win) {
      win.document.write(html)
      win.document.close()
      win.document.title = report.title
    }
  }

  const challengeReportCard = (
    <Card className="overflow-hidden border-primary/30 bg-accent/40">
      <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1"><CalendarRange className="h-3 w-3" /> 14-Day Cut report</Badge>
            <Badge variant="outline">{selectedChallenge ? latestChallengeReport?.report_mode?.replace('_', ' ') || 'Ready to generate' : 'Plan required'}</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold">{selectedChallenge?.name || 'Two-Week Emergency Cut'}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {selectedChallenge
              ? 'This report is generated from the immutable plan revision, the exact source-backed PED schedule, daily diet targets and actuals, completion logs, and future-day amendments.'
              : 'Build and activate a 14-day plan to unlock a dedicated progress/final report containing its diet schedule, exact source-backed PED schedule, daily actuals, amendments, and provenance.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {selectedChallenge ? <>
              <span><strong className="text-foreground">Progress:</strong> {latestChallengeReport?.completion ? `${latestChallengeReport.completion.days_logged} / ${latestChallengeReport.completion.days_total} days` : 'Generate to snapshot current progress'}</span>
              <span><strong className="text-foreground">Plan revision:</strong> {latestChallengeReport?.plan_revision || Number(selectedChallenge.current_plan_revision) || '—'}</span>
              <span><strong className="text-foreground">Protocol:</strong> {latestChallengeReport?.protocol_id || String(selectedChallenge.protocol_id || 'Required')}</span>
            </> : <span><strong className="text-foreground">Report modes:</strong> progress, final, and stopped early</span>}
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Source provenance retained</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:flex-col">
          {selectedChallenge ? <>
            <Button onClick={handleGenerateChallengeReport} disabled={challengeReportLoading}>
              <FileText className="mr-2 h-4 w-4" />
              {challengeReportLoading ? 'Building 14-day report…' : latestChallengeReport ? 'Refresh progress report' : 'Generate 14-day report'}
            </Button>
            <Button asChild variant="outline"><Link href="/challenge">Open Command Center</Link></Button>
            {latestChallengeReport && <Button variant="ghost" onClick={() => handleViewFullReport(latestChallengeReport)}>View latest report</Button>}
          </> : <>
            <Button asChild><Link href="/plans">Build the 14-day plan</Link></Button>
            <Button asChild variant="outline"><Link href="/challenge/template">Review editable template</Link></Button>
          </>}
        </div>
      </CardContent>
    </Card>
  )

  if (!current_user) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <WorkspacePageHeader eyebrow="Report center" title="Progress reports" description="Generate, review, and export reproducible PRIME and 14-day challenge reports." icon={FileText} />

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete your profile setup to generate reports.
          </AlertDescription>
        </Alert>

        {challengeReportCard}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <WorkspacePageHeader
        eyebrow="Report center"
        title="Progress reports"
        description="Build standard PRIME Living Reports or revision-bound 14-day reports, then review, compare, and export the exact saved result."
        icon={FileText}
        actions={<>
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[210px]"><SelectValue placeholder="Cycle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CYCLES}>All ReComp Cycles</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {(c.name || c.id)}{c.status === 'active' ? ' (current)' : ` (${c.status})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleGenerateLivingReport}
            disabled={livingReportLoading || !current_user}
          >
            <ClientIcon icon={Activity} className="mr-2 h-4 w-4" />
            {livingReportLoading ? "Building..." : "Generate Living Report"}
          </Button>
          <Button variant="default" onClick={handleGenerateReport} disabled={loading}>
            <ClientIcon icon={FileText} className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Generate New Report"}
          </Button>
        </>}
      />

      {/* Cycle context + next scheduled check-in (P8) */}
      <CycleContextBanner entryDates={(allEntries as any[]).map((e) => e.date)} />

      {challengeReportCard}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {livingReportError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Living Report: {livingReportError}</AlertDescription>
        </Alert>
      )}

      {report_generation_status && (
        <Alert>
          <ClientIcon icon={CheckCircle} className="h-4 w-4" />
          <AlertDescription>
            Report status: {report_generation_status}
            {report_generation_entry_date && (
              <span className="ml-1">(Entry date: {report_generation_entry_date})</span>
            )}
          </AlertDescription>
        </Alert>
      )}
 
      {loading && (

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="font-medium">Generating PRIME calculation report...</span>
              </div>
              <Progress value={undefined} className="w-full" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  Calculating optimal progression path...
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></span>
                  Analyzing body composition data...
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></span>
                  Generating AI insights and recommendations...
                </p>
              </div>
              {report_generation_status && (
                <p className="text-xs font-medium text-primary">
                  Current status: {report_generation_status}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                This may take up to 5 minutes. Please do not refresh the page.
              </p>
            </div>

          </CardContent>
        </Card>
      )}

      {(current_calculation || reports.length > 0) && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="progression">Progression</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="history">Report History</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Report Diagnostics</CardTitle>
                  <ClientIcon icon={Brain} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium">
                    {report_generation_status || 'No report generation in progress.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Entry used: {report_generation_entry_date || reports[0]?.entry_date || 'Not recorded'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last report: {reports.length > 0 ? new Date(reports[0].generated_at).toLocaleString() : 'None generated yet'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <ClientIcon icon={FileText} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {reports.length > 0 
                      ? `Latest: ${new Date(reports[0].generated_at).toLocaleString()}`
                      : 'No reports yet'
                    }
                  </p>
                </CardContent>
              </Card>


              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weekly Entries</CardTitle>
                  <ClientIcon icon={Target} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{entries.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {entries && entries.length > 0 && entries[0]
                      ? `Latest: ${new Date(entries[0].date).toLocaleString()}`
                      : 'No entries yet'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Program Progress</CardTitle>
                  <ClientIcon icon={Activity} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Calculate progress based on program timeline (consistent with dashboard)
                    if (!current_user?.start_date || !current_user?.end_date) {
                      return (
                        <>
                          <div className="text-2xl font-bold">0%</div>
                          <p className="text-xs text-muted-foreground">No active program</p>
                        </>
                      )
                    }
                    const startDate = new Date(current_user.start_date)
                    const endDate = new Date(current_user.end_date)
                    const today = new Date()
                    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                    const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                    const progressPercent = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
                    const currentWeek = Math.max(1, Math.ceil(daysElapsed / 7))
                    const totalWeeks = Math.ceil(totalDays / 7)
                    return (
                      <>
                        <div className="text-2xl font-bold">{progressPercent}%</div>
                        <p className="text-xs text-muted-foreground">
                          Week {currentWeek} of {totalWeeks}
                        </p>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Weekly Loss</CardTitle>
                  <ClientIcon icon={TrendingUp} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                      ? ((entries[entries.length - 1].weight - entries[0].weight) * -1 / weeksBetween(entries[0].date, entries[entries.length - 1].date)).toFixed(1)
                      : '0.0'
                    } lbs
                  </div>
                  <p className="text-xs text-muted-foreground">Per week actual rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity Summary</CardTitle>
                  <CardDescription>Latest entries and reports generated</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Latest Entries</h4>
                      {entries.length > 0 ? (
                        <div className="space-y-2">
                          {entries && entries.length > 0 ? entries.slice(0, 3).map((entry, index) => (
                            <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="text-sm">
                                <div className="font-medium">{entry.weight.toFixed(1)} lbs</div>
                                <div className="text-muted-foreground text-xs">
                                  {new Date(entry.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-sm text-right">
                                {entry.body_fat_percentage && (
                                  <div className="font-medium">{entry.body_fat_percentage.toFixed(1)}% BF</div>
                                )}
                                <div className="text-muted-foreground text-xs">
                                  {index === 0
                                    ? 'Latest'
                                    : (() => {
                                        const days = Math.round((new Date(entries[0].date).getTime() - new Date(entry.date).getTime()) / 86400000)
                                        if (days < 7) return `${days}d ago`
                                        const wks = Math.round(days / 7)
                                        return `${wks} wk${wks === 1 ? '' : 's'} ago`
                                      })()}
                                </div>
                              </div>
                            </div>
                          )) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No entries recorded yet</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Recent Reports</h4>
                      {reports.length > 0 ? (
                        <div className="space-y-2">
                          {reports && reports.length > 0 ? reports.slice(0, 2).map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="text-sm">
                                <div className="font-medium">{report.title}</div>
                                <div className="text-muted-foreground text-xs">
                                  {new Date(report.generated_at).toLocaleString()}
                                </div>
                              </div>
                              <Badge variant="outline">Complete</Badge>
                            </div>
                          )) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No reports generated yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weekly Performance Insights</CardTitle>
                  <CardDescription>Analysis of your weekly progress patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {entries.length >= 2 ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 border rounded">
                            <div className="text-lg font-bold">
                              {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                                ? ((entries[entries.length - 1].weight - entries[0].weight) * -1).toFixed(1)
                                : '0.0'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">Total Weight Lost</div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-lg font-bold">
                              {entries.length >= 2 && entries[0]?.body_fat_percentage && entries[entries.length - 1]?.body_fat_percentage
                                ? ((entries[entries.length - 1].body_fat_percentage! - entries[0].body_fat_percentage!) * -1).toFixed(1)
                                : '0.0'
                              }%
                            </div>
                            <div className="text-xs text-muted-foreground">Body Fat Reduced</div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Weekly Consistency</h5>
                          {(() => {
                            // Calculate based on timeline (consistent with dashboard)
                            if (!current_user?.start_date || !current_user?.end_date) {
                              return (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={0} className="flex-1" />
                                    <span className="text-sm font-medium">0%</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">No active program</p>
                                </>
                              )
                            }
                            const startDate = new Date(current_user.start_date)
                            const endDate = new Date(current_user.end_date)
                            const today = new Date()
                            const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                            const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                            const progressPercent = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
                            const currentWeek = Math.max(1, Math.ceil(daysElapsed / 7))
                            const totalWeeks = Math.ceil(totalDays / 7)
                            return (
                              <>
                                <div className="flex items-center space-x-2">
                                  <Progress value={progressPercent} className="flex-1" />
                                  <span className="text-sm font-medium">{progressPercent}%</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {currentWeek} of {totalWeeks} weeks tracked
                                </p>
                              </>
                            )
                          })()}
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Recent Trend</h5>
                          <div className="text-sm">
                            {entries.length >= 3 ? (
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span>Most recent rate:</span>
                                  <span className="font-medium">
                                    {entries && entries.length >= 2 && entries[0] && entries[1]
                                      ? ((entries[1].weight - entries[0].weight) * -1 / weeksBetween(entries[0].date, entries[1].date)).toFixed(1)
                                      : '0.0'
                                    } lbs/week
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Overall avg:</span>
                                  <span className="font-medium">
                                    {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                                      ? ((entries[entries.length - 1].weight - entries[0].weight) * -1 / weeksBetween(entries[0].date, entries[entries.length - 1].date)).toFixed(1)
                                      : '0.0'
                                    } lbs/week
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">Need more entries to analyze trends</p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Add more weekly entries to see detailed performance insights
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progression" className="space-y-4">
            <ProgressTrendChart
              entries={entries}
              // Prefer the latest saved report's progression so the chart reflects
              // what was actually generated, not a stale transient calculation.
              progression={
                latestReport?.calculation_result?.progression ?? current_calculation?.progression ?? []
              }
              title="PRIME Progression Analysis"
              description="Weekly breakdown of your projected transformation"
            />

            <Card>
              <CardHeader>
                <CardTitle>Predictions/Benchmarks/Targets</CardTitle>
                <CardDescription>
                  {latestReport
                    ? `First 4 weeks — from latest report (${new Date(latestReport.generated_at).toLocaleDateString()})`
                    : 'First 4 weeks of your PRIME calculation'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    // Use the latest report's progression when available so the table
                    // reflects the generated (saved) data, not a stale transient calc.
                    const progression =
                      latestReport?.calculation_result?.progression ??
                      (current_calculation?.progression ?? [])
                    return Array.isArray(progression) && progression.length > 0
                      ? progression.slice(0, 4).map((week: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="text-center">
                          <div className="text-lg font-bold">{week.weight.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">Weight (lbs)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{week.body_fat_percentage.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Body Fat</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{Math.round(week.daily_calorie_intake)}</div>
                          <div className="text-xs text-muted-foreground">Daily Calories</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{week.date}</div>
                          <div className="text-xs text-muted-foreground">Week {index + 1}</div>
                        </div>
                      </div>
                    </div>
                  ))
                      : (
                        <div className="text-center text-muted-foreground py-4">
                          No progression data available
                        </div>
                      )
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="analysis"
            className="space-y-4"
            // Trigger on-demand AI fetch when the tab becomes visible.
            // Skip auto-refetch if a previous attempt failed — manual retry
            // button (which resets aiAnalysisFailed first) handles that path.
            onFocus={aiAnalysisFailed ? undefined : fetchAiAnalysisOnDemand}
          >
            {/* Also trigger on mount of the tab panel via an effect sentinel */}
            <AiTabMountTrigger onMount={fetchAiAnalysisOnDemand} />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClientIcon icon={Brain} className="h-5 w-5" />
                    PRIME AI Analysis
                  </CardTitle>
                  <CardDescription>
                    {latestReport
                      ? `AI-powered insights from your latest report (${new Date(latestReport.generated_at).toLocaleDateString()})`
                      : 'AI-powered insights from your PRIME calculation'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {effectiveAiAnalysis ? (
                    <div className="prose max-w-none text-sm whitespace-pre-line">
                      <p>{effectiveAiAnalysis}</p>
                    </div>
                  ) : aiAnalysisLoading ? (
                    <div className="flex items-center gap-3 py-8">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">Fetching AI analysis…</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ClientIcon icon={Brain} className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      {latestReport ? (
                        <>
                          <p className="text-muted-foreground">No AI analysis available for this report.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => { setAiAnalysisFailed(false); fetchAiAnalysisOnDemand() }}
                            disabled={aiAnalysisLoading}
                          >
                            <ClientIcon icon={Brain} className="mr-2 h-4 w-4" />
                            Fetch AI Analysis
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-muted-foreground">No AI analysis available.</p>
                          <p className="text-xs text-muted-foreground mt-1">Generate a new report to get AI insights.</p>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress Recommendations</CardTitle>
                  <CardDescription>AI suggestions based on your current progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {entries.length >= 2 ? (
                      <>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Performance Analysis</h4>
                          <div className="text-sm space-y-1">
                            {(() => {
                              const recentWeightLoss = entries && entries.length >= 2 && entries[0] && entries[1]
                                ? (entries[1].weight - entries[0].weight) * -1 
                                : 0
                              const avgWeightLoss = entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                                ? ((entries[entries.length - 1].weight - entries[0].weight) / (entries.length - 1)) * -1 
                                : 0
                              
                              if (recentWeightLoss > avgWeightLoss + 0.5) {
                                return (
                                  <div className="rounded-lg border border-primary/25 bg-accent/45 p-3">
                                    <p className="text-foreground">🎯 <strong>Excellent Progress!</strong> Your recent weight loss ({recentWeightLoss.toFixed(1)} lbs/week) is ahead of your average pace.</p>
                                  </div>
                                )
                              } else if (recentWeightLoss < avgWeightLoss - 0.5) {
                                return (
                                  <div className="rounded-lg border border-border bg-muted/55 p-3">
                                    <p className="text-foreground">⚠️ <strong>Slowing Progress</strong> Recent loss ({recentWeightLoss.toFixed(1)} lbs/week) is below average. Consider reviewing calorie intake or increasing activity.</p>
                                  </div>
                                )
                              } else {
                                return (
                                  <div className="rounded-lg border border-border bg-muted/55 p-3">
                                    <p className="text-foreground">📈 <strong>Steady Progress</strong> You're maintaining consistent progress at {avgWeightLoss.toFixed(1)} lbs/week. Keep up the great work!</p>
                                  </div>
                                )
                              }
                            })()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Personalized Recommendations</h4>
                          <div className="text-sm space-y-2">
                            {current_user?.workout_type === 'Bodybuilding' && (
                              <div className="flex items-start gap-2">
                                <span className="text-primary">💪</span>
                                <p>Focus on maintaining muscle mass with high protein intake ({Math.round(current_user.current_weight * 1.2)}g daily) and consistent resistance training.</p>
                              </div>
                            )}
                            {current_user?.workout_type === 'Powerlifting' && (
                              <div className="flex items-start gap-2">
                                <span className="text-primary">🏋️</span>
                                <p>Prioritize strength maintenance. Consider periodic refeed days to support performance and metabolism.</p>
                              </div>
                            )}
                            {current_user?.workout_type === 'CrossFit' && (
                              <div className="flex items-start gap-2">
                                <span className="text-primary">🔥</span>
                                <p>Balance high-intensity training with adequate recovery. Monitor performance metrics alongside weight loss.</p>
                              </div>
                            )}
                            {current_user?.workout_type === 'Cardio Only' && (
                              <div className="flex items-start gap-2">
                                <span className="text-primary">🏃</span>
                                <p>Add 2-3 resistance training sessions weekly to preserve muscle mass during weight loss.</p>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <span className="text-primary">😴</span>
                              <p>Ensure 7-9 hours of quality sleep nightly to optimize recovery and fat loss hormones.</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-primary">💧</span>
                              <p>Stay hydrated with {Math.round(current_user?.current_weight * 0.5) || 64}+ oz of water daily for optimal metabolism.</p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Add more weekly entries to receive personalized AI recommendations.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Trend Analysis</CardTitle>
                <CardDescription>AI analysis of your weekly progress patterns</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length >= 3 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                          ? ((entries[entries.length - 1].weight - entries[0].weight) * -1 / weeksBetween(entries[0].date, entries[entries.length - 1].date) * 4).toFixed(1)
                          : '0.0'
                        } lbs
                      </div>
                      <div className="text-sm text-muted-foreground">Monthly Rate</div>
                      <div className="text-xs text-muted-foreground mt-1">Projected monthly loss</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {(() => {
                          // Calculate based on timeline (consistent with dashboard)
                          if (!current_user?.start_date || !current_user?.end_date) return 0
                          const startDate = new Date(current_user.start_date)
                          const endDate = new Date(current_user.end_date)
                          const today = new Date()
                          const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                          const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                          return Math.min(100, Math.round((daysElapsed / totalDays) * 100))
                        })()}%
                      </div>
                      <div className="text-sm text-muted-foreground">Completion</div>
                      <div className="text-xs text-muted-foreground mt-1">Program progress</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {/* Prefer the latest report's confidence score so this reflects saved data */}
                        {latestReport?.calculation_result?.confidence_score ?? current_calculation?.confidence_score ?? 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">AI Confidence</div>
                      <div className="text-xs text-muted-foreground mt-1">Plan reliability</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {/* Intentional: trend stats require ≥3 cycle-scoped entries to be meaningful. */}
                    <p className="text-muted-foreground">Need at least 3 weekly entries for trend analysis.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report History</CardTitle>
                <CardDescription>Previously generated reports</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="flex flex-col gap-4 rounded-xl border p-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium">{report.title}</div>
                            {report.report_type === 'two_week_cut' ? (
                              <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                                <CalendarRange className="h-3 w-3" />
                                14-Day · {(report.report_mode || 'progress').replace('_', ' ')}
                              </Badge>
                            ) : report.report_type === 'living' ? (
                              <Badge variant="outline">
                                <Activity className="mr-1 h-3 w-3" />
                                Living
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Complete
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Generated {new Date(report.generated_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/reports/${report.id}`}>
                            <Button variant="default" size="sm">
                              <ClientIcon icon={Eye} className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFullReport(report)}
                          >
                            <ClientIcon icon={FileText} className="mr-1 h-3 w-3" />
                            Full Report
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadHTML(report)}
                          >
                            <ClientIcon icon={Download} className="mr-1 h-3 w-3" />
                            HTML
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadMarkdown(report)}
                          >
                            <ClientIcon icon={FileDown} className="mr-1 h-3 w-3" />
                            MD
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadPDF(report)}
                          >
                            <ClientIcon icon={FileText} className="mr-1 h-3 w-3" />
                            PDF
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            <ClientIcon icon={TrashIcon} className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No previous reports found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {!current_calculation && !selectedChallenge && (
        <Card>
          <CardHeader>
            <CardTitle>No Calculation Available</CardTitle>
            <CardDescription>Generate a PRIME calculation first to view reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to have a PRIME calculation completed before you can generate reports.
            </p>
            <Button variant="secondary" onClick={() => window.location.href = '/'}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* P7: report-gating dialog — no new data since the last report */}
      <Dialog open={gateDialog.open} onOpenChange={(open) => setGateDialog((g) => ({ ...g, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {gateDialog.reason === "no-entries" ? "No entries in this cycle yet" : "No new data to report"}
            </DialogTitle>
            <DialogDescription>
              {gateDialog.reason === "no-entries"
                ? "This cycle has no weigh-ins yet, so there's nothing to generate a report from. Log this week's entry first."
                : "Your latest report already reflects the most recent entry. Log a new weigh-in, or edit your last entry to generate an updated report."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            {gateDialog.reason === "no-new-data" && (
              <Link href="/entries" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  Edit last entry
                </Button>
              </Link>
            )}
            <Link href="/entries/new" className="w-full sm:w-auto">
              <Button variant="default" className="w-full">
                Log this week&apos;s entry
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
