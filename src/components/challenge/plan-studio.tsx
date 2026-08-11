"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight, CheckCircle2, Database, Pencil, ShieldCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { useApp } from "@/contexts/app-context"
import { challengeApi } from "@/lib/challenge-api"
import type { ChallengePreview, ChallengeTemplate, ProtocolCatalog, ProtocolWindow } from "@/types/challenge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProtocolScheduleCard } from "./protocol-schedule-card"
import { PlanPreviewPanel } from "./plan-preview-panel"

function todayLocalISO() {
  return new Date().toLocaleDateString("en-CA")
}

export function PlanStudio() {
  const router = useRouter()
  const { state, refreshWidgets } = useApp()
  const user = state.current_user
  const [template, setTemplate] = React.useState<ChallengeTemplate | null>(null)
  const [catalog, setCatalog] = React.useState<ProtocolCatalog | null>(null)
  const [protocol, setProtocol] = React.useState<ProtocolWindow | null>(null)
  const [preview, setPreview] = React.useState<ChallengePreview | null>(null)
  const [planLength, setPlanLength] = React.useState<12 | 14 | 15 | 22>(14)
  const [startDate, setStartDate] = React.useState(todayLocalISO())
  const [startWeek, setStartWeek] = React.useState(9)
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [previewing, setPreviewing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    Promise.all([challengeApi.templates(), challengeApi.protocolCatalog()])
      .then(async ([templates, protocolCatalog]) => {
        const selected = templates[0] || await challengeApi.importDefault()
        if (!alive) return
        setTemplate(selected)
        setCatalog(protocolCatalog)
        const profileWeek = user?.start_date
          ? Math.max(1, Math.floor((Date.now() - new Date(user.start_date).getTime()) / 604_800_000) + 1)
          : protocolCatalog.available_start_weeks[0]
        const closest = protocolCatalog.available_start_weeks.reduce((best, week) =>
          Math.abs(week - profileWeek) < Math.abs(best - profileWeek) ? week : best,
          protocolCatalog.available_start_weeks[0],
        )
        setStartWeek(closest)
        return challengeApi.protocolWindow(closest)
      })
      .then((window) => { if (alive && window) setProtocol(window) })
      .catch((error) => toast.error(error.message))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [user?.start_date])

  const chooseWeek = async (week: number) => {
    setStartWeek(week)
    setPreview(null)
    try {
      setProtocol(await challengeApi.protocolWindow(week))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load protocol window")
    }
  }

  const buildPreview = async () => {
    if (!user || !template) return toast.error("Complete your profile before building a challenge")
    setPreviewing(true)
    try {
      const result = await challengeApi.preview({
        user_data: user,
        template_id: template.id,
        protocol_start_week: startWeek,
        start_date: startDate,
        safety_acknowledged: acknowledged,
      })
      setPreview(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Plan preview failed")
    } finally {
      setPreviewing(false)
    }
  }

  const activateTemplate = async () => {
    if (!template) return
    try {
      const updated = await challengeApi.setTemplateStatus(template.id, "active")
      setTemplate(updated)
      setPreview(null)
      toast.success("Template activated. Build a fresh preview to continue.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template activation failed")
    }
  }

  const createChallenge = async (activate: boolean) => {
    if (!user || !template) return
    setSaving(true)
    try {
      const result = await challengeApi.create({
        user_data: user,
        template_id: template.id,
        protocol_start_week: startWeek,
        start_date: startDate,
        safety_acknowledged: acknowledged,
        name: "Two-Week Emergency Cut",
        activate,
      })
      refreshWidgets()
      toast.success(activate ? "14-day challenge activated" : "Draft challenge saved")
      router.push("/challenge")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Challenge creation failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading Plan Decision Studio…</div>

  return (
    <main className="min-h-full bg-[#f8f6f0] p-4 text-[#1d2c22] md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#647068]">Plan Decision Studio</p>
            <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight text-[#173c2a]">Build the plan. Keep the life.</h1>
            <p className="mt-2 text-sm text-[#687169]">Adjust inputs, inspect the source-backed protocol, and lock one report-ready revision.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${template?.status === "active" ? "bg-[#e7f0df] text-[#37612f]" : "bg-[#fff0c9] text-[#795b15]"}`}>
              Template {template?.status}
            </span>
            <Button asChild variant="outline" className="rounded-full border-[#bfc9c0] bg-white">
              <Link href="/challenge/template"><Pencil className="mr-2 h-4 w-4" /> Edit template</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
                <div className="flex items-center justify-between"><h2 className="font-serif text-xl text-[#173c2a]">Current metrics</h2><Link href="/entries/new" className="text-xs font-semibold text-[#2d6846]">Update</Link></div>
                <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-[#737b74]">Weight</dt><dd className="text-right font-semibold">{user?.current_weight ?? "—"} lb</dd>
                  <dt className="text-[#737b74]">Body fat</dt><dd className="text-right font-semibold">{user?.current_bf ?? "—"}%</dd>
                  <dt className="text-[#737b74]">Activity</dt><dd className="text-right font-semibold">Level {user?.activity_level ?? "—"}</dd>
                  <dt className="text-[#737b74]">Training</dt><dd className="text-right font-semibold">{user?.workout_days ?? "—"} days/week</dd>
                </dl>
              </div>
              <div className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
                <div className="flex items-center justify-between"><h2 className="font-serif text-xl text-[#173c2a]">Goal</h2><Link href="/setup" className="text-xs font-semibold text-[#2d6846]">Edit</Link></div>
                <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-[#737b74]">Target weight</dt><dd className="text-right font-semibold">{user?.goal_weight ?? "—"} lb</dd>
                  <dt className="text-[#737b74]">Target body fat</dt><dd className="text-right font-semibold">{user?.goal_bf ?? "—"}%</dd>
                  <dt className="text-[#737b74]">Priority</dt><dd className="text-right font-semibold">Lean-mass retention</dd>
                  <dt className="text-[#737b74]">Calculation</dt><dd className="text-right font-semibold">PRIME</dd>
                </dl>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
              <h2 className="font-serif text-xl text-[#173c2a]">Plan length</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[12, 15, 22, 14].map((weeks) => (
                  <button key={weeks} onClick={() => setPlanLength(weeks as 12 | 14 | 15 | 22)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${planLength === weeks ? "border-[#2d6846] bg-[#edf4ea] text-[#1f5135]" : "border-[#d7ddd4] hover:bg-[#f6f8f4]"}`}>
                    {weeks === 14 ? "14-Day Cut" : `${weeks} Weeks`}
                  </button>
                ))}
              </div>
              {planLength !== 14 && <p className="mt-3 rounded-lg bg-[#f4f2ea] p-3 text-xs text-[#667067]">Standard {planLength}-week cuts continue using the existing cycle and report workflow. Select 14-Day Cut for the new challenge builder.</p>}
            </section>

            {planLength === 14 && (
              <>
                <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#677169]"><Database className="h-4 w-4" /> Available protocol inventory</p><h2 className="mt-1 font-serif text-xl text-[#173c2a]">Use what is already on file</h2></div>
                    <span className="rounded-full bg-[#edf4ea] px-3 py-1 text-xs font-semibold text-[#37612f]">{catalog?.protocol_id}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm"><span className="mb-1.5 block text-xs font-semibold text-[#657067]">Challenge start date</span><Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPreview(null) }} /></label>
                    <label className="text-sm"><span className="mb-1.5 block text-xs font-semibold text-[#657067]">Start from source week</span><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={startWeek} onChange={(event) => chooseWeek(Number(event.target.value))}>{catalog?.available_start_weeks.map((week) => <option key={week} value={week}>Weeks {week}–{week + 1}</option>)}</select></label>
                  </div>
                  <p className="mt-3 flex gap-2 text-xs text-[#76601c]"><AlertTriangle className="h-4 w-4 shrink-0" /> Week 1 is unavailable because the source contains no Week 1 dosing table; Week 16 cannot start a two-week window.</p>
                </section>
                <ProtocolScheduleCard protocol={protocol} />
                <label className="flex items-start gap-3 rounded-2xl border border-[#d7ddd4] bg-white p-4 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#2d6846]" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setPreview(null) }} /><span><strong className="flex items-center gap-2 text-[#274a36]"><ShieldCheck className="h-4 w-4" /> Safety acknowledgement</strong><span className="mt-1 block text-xs text-[#687169]">I understand this app is tracking an existing source schedule, not prescribing or medically approving it, and that source gaps/ranges remain unresolved unless separately reviewed.</span></span></label>
              </>
            )}
          </div>

          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <PlanPreviewPanel preview={preview} loading={previewing} />
            {planLength === 14 && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={buildPreview} disabled={previewing || !user} variant="outline" className="h-12 border-[#8a987e] bg-white"><Sparkles className="mr-2 h-4 w-4" /> Build exact preview</Button>
                {template?.status !== "active" ? (
                  <Button onClick={activateTemplate} className="h-12 bg-[#173c2a] text-white hover:bg-[#214c38]"><CheckCircle2 className="mr-2 h-4 w-4" /> Activate template</Button>
                ) : (
                  <Button onClick={() => createChallenge(true)} disabled={!preview?.readiness.ready || saving} className="h-12 bg-[#173c2a] text-white hover:bg-[#214c38]">Start 14-day cut <ArrowRight className="ml-2 h-4 w-4" /></Button>
                )}
                <Button onClick={() => createChallenge(false)} disabled={!preview || saving} variant="ghost" className="sm:col-span-2">Save as draft</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
