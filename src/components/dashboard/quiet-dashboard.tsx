"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Check, FileText, Flame, Footprints, Leaf, MessageCircle, Scale, Sparkles, Target, UserRound } from "lucide-react"

import { challengeApi } from "@/lib/challenge-api"
import { withBasePath } from "@/lib/api-path"
import type { NutritionDaySummary } from "@/lib/nutrition"
import { useCycles } from "@/hooks/use-cycles"
import type { BodyFatEntry, CalculationResult, Report, UserData } from "@/types"
import type { ChallengeCycle, ChallengeDailyLog } from "@/types/challenge"
import type { DashboardMetrics } from "./hooks/useDashboardData"
import { Button } from "@/components/ui/button"

interface QuietDashboardProps {
  user: UserData
  metrics: DashboardMetrics
  entries: BodyFatEntry[]
  reports: Report[]
  calculation: CalculationResult | null
  onGenerateReport: () => void
}

function MiniTrend({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="flex h-28 items-center justify-center text-xs text-[#7b847d]">Add two entries to see a trend.</div>
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(1, max - min)
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${90 - ((value - min) / span) * 70}`).join(" ")
  return <svg viewBox="0 0 100 100" className="h-28 w-full" preserveAspectRatio="none" aria-label="Body fat trend"><path d={`M ${points.replaceAll(" ", " L ")} L 100 100 L 0 100 Z`} fill="var(--accent)" opacity=".75" /><polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>
}

export function QuietDashboard({ user, metrics, entries, reports, calculation, onGenerateReport }: QuietDashboardProps) {
  const { active } = useCycles()
  const [challenge, setChallenge] = React.useState<ChallengeCycle | null>(null)
  const [logs, setLogs] = React.useState<ChallengeDailyLog[]>([])
  const [nutritionToday, setNutritionToday] = React.useState<NutritionDaySummary | null>(null)

  React.useEffect(() => {
    let alive = true
    challengeApi.cycles().then(async (cycles) => {
      const selected = cycles.find((item) => item.plan_mode === "two_week_cut" && item.status === "active") || null
      if (!alive) return
      setChallenge(selected)
      if (selected) setLogs(await challengeApi.dailyLogs(selected.id))
    }).catch(() => undefined)
    return () => { alive = false }
  }, [])

  React.useEffect(() => {
    let alive = true
    fetch(withBasePath('/api/nutrition'))
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!alive || !payload?.days) return
        const today = new Date().toISOString().slice(0, 10)
        setNutritionToday(payload.days.find((day: NutritionDaySummary) => day.date === today) || null)
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [])

  const firstName = user.name?.split(" ")[0] || "there"
  const progression = calculation?.progression || []
  const weekIndex = Math.max(0, Math.min(metrics.programData.currentWeek - 1, progression.length - 1))
  const week = progression[weekIndex]
  const protein = week?.protein_g || user.protein_intake || 0
  const trendValues = entries.slice(0, 10).reverse().map((entry) => entry.body_fat_percentage).filter((value): value is number => typeof value === "number")
  const latestReport = reports[0]
  const dayNumber = challenge ? Math.min(14, Math.max(1, Math.floor((Date.now() - new Date(`${challenge.start_date}T00:00:00`).getTime()) / 86_400_000) + 1)) : null
  const challengeDay = dayNumber ? challenge?.plan_snapshot_json.days.find((item) => item.day_number === dayNumber) : null
  const todayLog = dayNumber ? logs.find((item) => item.day_number === dayNumber) : null
  const actualCalories = todayLog?.calories ?? nutritionToday?.calories
  const actualProtein = todayLog?.protein_g ?? nutritionToday?.protein_g
  const targetCalories = challengeDay?.nutrition_target.calories ?? (metrics.currentCalories ? Math.round(metrics.currentCalories) : null)
  const targetProtein = challengeDay?.nutrition_target.protein_g ?? (protein || null)

  return (
    <div className="space-y-5 bg-[#f8f6f0] p-4 text-[#1d2c22] md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#d8ddd5] bg-[linear-gradient(120deg,#fbfaf5,#edf2e8)] p-6 md:p-8">
        <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full border-[34px] border-[#dfe7d8]/70" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718075]">Dashboard · today</p><h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-[#173c2a] md:text-5xl">Good morning, {firstName}</h1><p className="mt-2 text-sm text-[#687169]">Stay focused today. Small steps lead to measurable changes.</p></div>
          <div className="flex gap-2"><Button asChild variant="outline" className="border-[#c6d0c4] bg-white"><Link href="/plans">Plan Studio</Link></Button><Button asChild className="bg-[#173c2a] text-white hover:bg-[#214c38]"><Link href={challenge ? "/challenge" : "/entries/new"}>{challenge ? "Open today" : "Start check-in"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.75fr_repeat(4,minmax(0,1fr))]">
        <div className="rounded-2xl border border-[#d7ddd4] bg-white p-5 shadow-[0_6px_24px_rgba(32,54,38,.05)] lg:row-span-1">
          <div className="flex items-center gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#fff4dd]"><Flame className="h-9 w-9 text-[#d38b18]" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#bd7412]">Today’s mission</p><h2 className="mt-1 font-serif text-2xl text-[#173c2a]">{challengeDay ? `Complete Day ${challengeDay.day_number}` : "Complete your check-in"}</h2><p className="mt-1 text-xs leading-relaxed text-[#6d756e]">{challengeDay?.key_instruction || "Your newest measurements keep every dashboard and report accurate."}</p></div></div>
          <Button asChild className="mt-4 w-full bg-[#e6a728] text-[#2d240e] hover:bg-[#d99a18]"><Link href={challenge ? "/challenge" : "/entries/new"}>{todayLog ? "Review today" : "Start check-in"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
        {[
          [Scale, metrics.currentWeight ? `${metrics.currentWeight.toFixed(1)} lb` : "—", "Current weight", metrics.startWeight ? `${(metrics.currentWeight - metrics.startWeight).toFixed(1)} lb this plan` : "Awaiting baseline"],
          [UserRound, metrics.currentBF ? `${metrics.currentBF.toFixed(1)}%` : "—", "Body fat", metrics.goalBF ? `${metrics.goalBF.toFixed(1)}% target` : "Target not set"],
          [Flame, metrics.currentCalories ? `${Math.round(metrics.currentCalories).toLocaleString()} kcal` : "—", "Daily target", week?.phase || "PRIME calculation"],
          [CalendarDays, challenge ? `Day ${dayNumber} of 14` : `Week ${metrics.programData.currentWeek || 0} of ${metrics.programData.totalWeeks || 0}`, "Plan progress", challenge ? `${logs.length} days logged` : `${Math.round(metrics.programData.programProgress)}% complete`],
        ].map(([Icon, value, label, detail]) => {
          const MetricIcon = Icon as typeof Scale
          return <div key={String(label)} className="rounded-2xl border border-[#d7ddd4] bg-white p-5 shadow-[0_6px_24px_rgba(32,54,38,.05)]"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3ea]"><MetricIcon className="h-5 w-5 text-[#41634b]" /></div><p className="mt-5 font-serif text-2xl font-semibold text-[#173c2a]">{String(value)}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#657067]">{String(label)}</p><p className="mt-4 text-xs text-[#738078]">{String(detail)}</p></div>
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr_1fr]">
        <div className="rounded-2xl border border-[#d7ddd4] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]">Body fat trend</p><h2 className="mt-1 font-serif text-3xl text-[#173c2a]">{metrics.currentBF ? `${metrics.currentBF.toFixed(1)}%` : "No current value"}</h2></div><Button asChild variant="ghost" size="sm"><Link href="/charts">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button></div><div className="mt-3"><MiniTrend values={trendValues} /></div><p className="rounded-lg bg-[#edf3e9] px-3 py-2 text-xs text-[#4c654e]"><Leaf className="mr-1.5 inline h-3.5 w-3.5" /> Uses your recorded measurements—not placeholder demo data.</p></div>

        <div className="rounded-2xl border border-[#d7ddd4] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]">Nutrition & adherence</p><div className="mt-4 flex items-center gap-4"><div className="flex h-24 w-24 items-center justify-center rounded-full border-[9px] border-primary bg-[#f7faf5]"><div className="text-center"><strong className="font-serif text-2xl">{actualCalories ? "Logged" : "Open"}</strong><span className="block text-[10px] uppercase text-[#6e776f]">today</span></div></div><div className="space-y-2 text-sm"><p><strong>{actualCalories ? Math.round(actualCalories).toLocaleString() : "—"}</strong> / {targetCalories?.toLocaleString() || "—"} kcal</p><p><strong>{actualProtein ? Math.round(actualProtein) : "—"}</strong> / {targetProtein || "—"} g protein</p><p className="flex items-center gap-1 text-xs text-[#657067]"><Footprints className="h-3.5 w-3.5" /> {todayLog?.steps ? `${todayLog.steps.toLocaleString()} steps` : "Steps not logged"}</p></div></div><Button asChild variant="outline" className="mt-5 w-full border-[#d1d8cf]"><Link href={challenge ? "/challenge" : "/nutrition"}>{challenge ? "Open today" : "Log nutrition"} <ArrowRight className="ml-auto h-4 w-4" /></Link></Button></div>

        <div className="rounded-2xl border border-[#d7ddd4] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]">Latest measurements</p><Link href="/entries" className="text-xs font-semibold text-[#3d654d]">View all</Link></div><div className="mt-4 divide-y divide-[#e7ebe5] text-sm">{[["Weight", metrics.currentWeight ? `${metrics.currentWeight.toFixed(1)} lb` : "—"], ["Body fat", metrics.currentBF ? `${metrics.currentBF.toFixed(1)}%` : "—"], ["Neck", user.neck ? `${user.neck} in` : "Not recorded"], ["Waist", user.waist ? `${user.waist} in` : "Not recorded"], ["Hips", user.hip ? `${user.hip} in` : "Not recorded"]].map(([label, value]) => <div key={label} className="flex items-center justify-between py-3"><span className="text-[#667067]">{label}</span><strong>{value}</strong></div>)}</div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_.8fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-[#d7ddd4] bg-[linear-gradient(135deg,#f4f7f1,#e6efe1)] p-5"><Sparkles className="h-5 w-5 text-[#49714e]" /><h2 className="mt-3 font-serif text-2xl text-[#173c2a]">AI Coach insight</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5f6d63]">{calculation?.ai_analysis || (entries.length ? "Your dashboard is using the latest recorded metrics. Keep calories, protein, steps, and recovery logs consistent so the next report can separate plan targets from actual adherence." : "Add your first check-in to unlock grounded coaching insights.")}</p><Button asChild variant="outline" className="mt-5 border-[#c9d4c7] bg-white/70"><Link href="/ai/chat"><MessageCircle className="mr-2 h-4 w-4" /> Ask your coach</Link></Button></div>

        <div className="rounded-2xl border border-[#d7ddd4] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]">Report center</p><div className="mt-4 flex items-center gap-4"><div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-[#edf3ea]"><FileText className="h-5 w-5 text-[#47664c]" /><span className="mt-1 text-[9px] uppercase text-[#637068]">Report</span></div><div><h2 className="font-serif text-xl text-[#173c2a]">{latestReport?.title || "No report yet"}</h2><p className="mt-1 text-xs text-[#6d756e]">{latestReport?.generated_at ? new Date(latestReport.generated_at).toLocaleDateString() : "Generate when you are ready"}</p></div></div><div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={onGenerateReport} variant="outline" className="border-[#d1d8cf]">Generate</Button><Button asChild variant="ghost"><Link href="/reports">View all</Link></Button></div></div>

        <div className={`rounded-2xl border p-5 ${challenge ? "border-[#b9cbb3] bg-[#edf4e9]" : "border-[#ecd39a] bg-[#fff9e9]"}`}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]">{challenge ? "Active challenge" : "Explore a shorter cut"}</p><h2 className="mt-1 font-serif text-2xl text-[#173c2a]">14-Day Cut</h2></div><Target className="h-6 w-6 text-[#52745b]" /></div><p className="mt-3 text-sm text-[#637068]">{challenge ? `${logs.length} days logged. Source weeks ${challenge.protocol_snapshot_json.start_week}–${challenge.protocol_snapshot_json.end_week} are bound to plan revision ${challenge.current_plan_revision}.` : "A focused two-week plan with PRIME calorie targets, an editable training template, and a required source-backed PED schedule."}</p><Button asChild className="mt-5 bg-[#173c2a] text-white"><Link href={challenge ? "/challenge" : "/plans"}>{challenge ? "Open Command Center" : "Build the challenge"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
      </section>

      <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]">Current plan</p><h2 className="mt-1 font-serif text-2xl text-[#173c2a]">{challenge?.name || active?.name || "No active plan"}</h2><p className="mt-1 text-xs text-[#6d756e]">{challenge ? `Day ${dayNumber} of 14` : active ? `Week ${metrics.programData.currentWeek} of ${active.timeline_weeks}` : "Choose 12, 15, 22 weeks or the 14-day challenge."}</p></div><Button asChild variant="outline" className="border-[#cbd3c8]"><Link href="/plans">Review plan options <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></section>
    </div>
  )
}
