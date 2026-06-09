"use client"

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { calculateAge } from "@/lib/date-utils"
import { getEatingPatternOptions, getEatingWindowHours } from "@/lib/eating-patterns"
import { useApp } from "@/contexts/app-context"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  User,
  Ruler,
  Target,
  Dumbbell,
  Utensils,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Trophy,
  Rocket,
} from "lucide-react"

import { profileTemplates, type ProfileTemplate } from "./profile-templates"
import { PedStackPicker, type PedStackEntry } from "./ped-stack-picker"

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6

const STEP_META = [
  { label: "Personal Info", icon: User },
  { label: "Body Measurements", icon: Ruler },
  { label: "Goals", icon: Target },
  { label: "Activity & Training", icon: Dumbbell },
  { label: "Diet & Lifestyle", icon: Utensils },
  { label: "Review & Start", icon: CheckCircle2 },
] as const

/** Map template icon names to Lucide components */
const TEMPLATE_ICONS: Record<ProfileTemplate["icon"], React.ElementType> = {
  dumbbell: Dumbbell,
  "heart-pulse": HeartPulse,
  trophy: Trophy,
}

// ─── Form State Shape ────────────────────────────────────────────────────────

interface WizardFormData {
  // Step 1 — Personal
  name: string
  age: string
  dob: string
  gender: string

  // Step 2 — Body
  height_feet: string
  height_inches: string
  height_cm: string
  current_weight: string
  current_bf: string
  waist: string
  hip: string
  neck: string

  // Step 3 — Goals
  goal_weight: string
  goal_bf: string
  timeline_weeks: string

  // Step 4 — Activity
  activity_level: string
  workout_type: string
  workout_days: string
  resistance_training: boolean
  exercise_type: string
  experience_level: string
  is_athlete: boolean
  is_bodybuilder: boolean
  job_activity: string
  leisure_activity: string
  volume_score: string
  intensity_score: string
  frequency_score: string
  ped_use: boolean

  // Step 5 — Diet
  diet_type: string
  eating_pattern: string
  protein_intake: string
  sleep_quality: string

  // Step 3 — Goal configuration (new fields)
  goal_type: string // "cut" | "recomp" | "lean_gain" | "maintain"
  calorie_floor: string // number, default 1200

  // PED Protocol (Step 4 advanced — visible only when ped_use is true)
  ped_stack: PedStackEntry[]
}

const DEFAULT_FORM: WizardFormData = {
  name: "",
  age: "",
  dob: "",
  gender: "",
  height_feet: "",
  height_inches: "",
  height_cm: "",
  current_weight: "",
  current_bf: "",
  waist: "",
  hip: "",
  neck: "",
  goal_weight: "",
  goal_bf: "20",
  timeline_weeks: "16",
  activity_level: "2",
  workout_type: "",
  workout_days: "3",
  resistance_training: false,
  exercise_type: "resistance",
  experience_level: "Beginner",
  is_athlete: false,
  is_bodybuilder: false,
  job_activity: "1",
  leisure_activity: "1",
  volume_score: "5",
  intensity_score: "5",
  frequency_score: "3",
  ped_use: false,
  ped_stack: [],
  diet_type: "balanced",
  eating_pattern: "standard",
  protein_intake: "",
  sleep_quality: "good",
  goal_type: "cut",
  calorie_floor: "1200",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeDateInput(value?: string | null): string {
  if (!value) return ""
  if (value.includes("-")) return value
  if (value.includes("/")) {
    const [month, day, year] = value.split("/")
    if (month && day && year) {
      const y = year.length === 2 ? `20${year}` : year.padStart(4, "0")
      return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }
  return value
}

function computeEstimatedDate(weeks: number): string {
  const d = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000)
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewProgram = searchParams.get("newProgram") === "true"
  const { setUserData, createNewProgram, state } = useApp()
  const { current_user } = state

  const eatingPatternOptions = useMemo(() => getEatingPatternOptions(), [])

  // ── State ────────────────────────────────────────────────────────────────

  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [form, setForm] = useState<WizardFormData>(() => {
    if (current_user) {
      return {
        name: current_user.name || "",
        age: current_user.age?.toString() || "",
        dob: normalizeDateInput(current_user.dob) || "",
        gender: current_user.gender || "",
        height_feet: current_user.height_feet?.toString() || "",
        height_inches: current_user.height_inches?.toString() || "",
        height_cm: current_user.height_cm?.toString() || "",
        current_weight: current_user.current_weight?.toString() || "",
        current_bf: current_user.current_bf?.toString() || "",
        waist: current_user.waist?.toString() || "",
        hip: current_user.hip?.toString() || "",
        neck: current_user.neck?.toString() || "",
        goal_weight: current_user.goal_weight?.toString() || "",
        goal_bf: current_user.goal_bf?.toString() || "20",
        timeline_weeks: current_user.timeline_weeks?.toString() || "16",
        activity_level: current_user.activity_level?.toString() || "2",
        workout_type: current_user.workout_type || "",
        workout_days: current_user.workout_days?.toString() || "3",
        resistance_training: current_user.resistance_training || false,
        exercise_type: current_user.exercise_type || "resistance",
        experience_level: current_user.experience_level || "Beginner",
        is_athlete: current_user.is_athlete || false,
        is_bodybuilder: current_user.is_bodybuilder || false,
        job_activity: current_user.job_activity?.toString() || "1",
        leisure_activity: current_user.leisure_activity?.toString() || "1",
        volume_score: current_user.volume_score?.toString() || "5",
        intensity_score: current_user.intensity_score?.toString() || "5",
        frequency_score: current_user.frequency_score?.toString() || "3",
        ped_use: current_user.ped_use || false,
        ped_stack: current_user.ped_stack || [],
        diet_type: current_user.diet_type || "balanced",
        eating_pattern: current_user.eating_pattern || "standard",
        protein_intake: current_user.protein_intake?.toString() || "",
        sleep_quality: current_user.sleep_quality || "good",
        goal_type: current_user.goal_type || "cut",
        calorie_floor: current_user.calorie_floor?.toString() || "1200",
      }
    }
    return { ...DEFAULT_FORM }
  })

  // ── Form updaters ────────────────────────────────────────────────────────

  /** Setter for the ped_stack array (separate from scalar updateField). */
  const updatePedStack = useCallback((stack: PedStackEntry[]) => {
    setForm((prev) => ({ ...prev, ped_stack: stack }))
  }, [])

  const updateField = useCallback(
    (field: keyof WizardFormData, value: string | boolean | number) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value }

        // Auto-calculate age from DOB
        if (field === "dob" && typeof value === "string") {
          const dob = new Date(value)
          const today = new Date()
          let age = today.getFullYear() - dob.getFullYear()
          const md = today.getMonth() - dob.getMonth()
          if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--
          next.age = age.toString()
        }

        // Height conversions (feet/inches -> cm)
        if (field === "height_feet" || field === "height_inches") {
          const ft = parseFloat(field === "height_feet" ? (value as string) : prev.height_feet) || 0
          const inch = parseFloat(field === "height_inches" ? (value as string) : prev.height_inches) || 0
          next.height_cm = ((ft * 12 + inch) * 2.54).toFixed(2)
        }

        return next
      })
    },
    []
  )

  // ── Template selection ───────────────────────────────────────────────────

  const applyTemplate = useCallback(
    (template: ProfileTemplate) => {
      setSelectedTemplate(template.id)
      const d = template.defaults
      setForm((prev) => ({
        ...prev,
        // Step 2 partial
        current_bf: d.current_bf,
        // Step 3
        goal_weight: d.goal_weight,
        goal_bf: d.goal_bf,
        timeline_weeks: d.timeline_weeks,
        // Step 4
        activity_level: d.activity_level,
        workout_type: d.workout_type,
        workout_days: d.workout_days,
        resistance_training: d.resistance_training,
        exercise_type: d.exercise_type,
        experience_level: d.experience_level,
        is_athlete: d.is_athlete,
        is_bodybuilder: d.is_bodybuilder,
        job_activity: d.job_activity,
        leisure_activity: d.leisure_activity,
        volume_score: d.volume_score,
        intensity_score: d.intensity_score,
        frequency_score: d.frequency_score,
        ped_use: d.ped_use,
        // Step 5
        diet_type: d.diet_type,
        eating_pattern: d.eating_pattern,
        protein_intake: d.protein_intake,
        sleep_quality: d.sleep_quality,
      }))
    },
    []
  )

  // ── Navigation ───────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return form.name.trim() !== "" && form.gender !== "" && form.dob !== ""
      case 2:
        return (
          form.height_feet !== "" &&
          form.height_inches !== "" &&
          form.current_weight !== "" &&
          form.current_bf !== ""
        )
      case 3:
        return form.goal_weight !== "" && form.goal_bf !== ""
      case 4:
        return form.workout_type !== ""
      case 5:
        return true // all have defaults
      default:
        return true
    }
  }, [step, form])

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS && canGoNext) setStep((s) => s + 1)
  }, [step, canGoNext])

  const goBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1)
  }, [step])

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    const normalizedDob = normalizeDateInput(form.dob) || ""
    const weeks = parseInt(form.timeline_weeks, 10) || 16
    const startDateIso = new Date().toISOString().split("T")[0]
    const endDateIso = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
    const derivedAge = normalizedDob ? calculateAge(normalizedDob) : parseInt(form.age || "", 10)

    const processedData = {
      name: form.name,
      age: Number.isNaN(derivedAge) ? 0 : derivedAge,
      gender: form.gender as "m" | "f",
      dob: normalizedDob,
      height_feet: parseInt(form.height_feet) || 0,
      height_inches: parseFloat(form.height_inches) || 0,
      height_cm: parseFloat(form.height_cm) || 0,
      current_weight: parseFloat(form.current_weight) || 0,
      current_bf: parseFloat(form.current_bf) || 0,
      goal_weight: parseFloat(form.goal_weight) || 0,
      goal_bf: parseFloat(form.goal_bf) || 0,
      timeline_weeks: weeks,
      start_date: startDateIso,
      end_date: endDateIso,
      activity_level: parseInt(form.activity_level) || 1,
      resistance_training: form.resistance_training,
      is_athlete: form.is_athlete,
      workout_type: form.workout_type,
      workout_days: parseInt(form.workout_days) || 3,
      job_activity: parseInt(form.job_activity) || 1,
      leisure_activity: parseInt(form.leisure_activity) || 1,
      experience_level: form.experience_level,
      volume_score: parseFloat(form.volume_score) || 5,
      intensity_score: parseFloat(form.intensity_score) || 5,
      frequency_score: parseFloat(form.frequency_score) || 3,
      is_bodybuilder: form.is_bodybuilder,
      protein_intake: parseFloat(form.protein_intake) || 0,
      diet_type: form.diet_type,
      eating_pattern: form.eating_pattern || "standard",
      eating_window_hours: getEatingWindowHours(form.eating_pattern),
      ped_use: form.ped_use,
      // Send ped_stack only when non-empty so callers that don't know the field get undefined.
      // Empty array → undefined → engine falls back to ped_use bool path unchanged.
      ped_stack: form.ped_stack.length > 0 ? form.ped_stack : undefined,
      exercise_type: form.exercise_type,
      sleep_quality: form.sleep_quality,
      waist: parseFloat(form.waist) || undefined,
      hip: parseFloat(form.hip) || undefined,
      neck: parseFloat(form.neck) || undefined,
      goal_type: (form.goal_type || "cut") as "cut" | "recomp" | "lean_gain" | "maintain",
      calorie_floor: parseInt(form.calorie_floor) || 1200,
    }

    setUserData(processedData as any)

    if (isNewProgram) {
      createNewProgram(processedData.current_weight, processedData.current_bf)
    }

    router.push("/")
  }, [form, isNewProgram, setUserData, createNewProgram, router])

  // ── Progress ─────────────────────────────────────────────────────────────

  const progressPercent = (step / TOTAL_STEPS) * 100

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="container max-w-3xl mx-auto space-y-6 pb-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {current_user && !isNewProgram ? "Update Profile" : "Create Your Profile"}
        </h1>
        <p className="text-muted-foreground">
          Step {step} of {TOTAL_STEPS} &mdash; {STEP_META[step - 1].label}
        </p>
      </div>

      {/* ── Progress Bar ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between">
          {STEP_META.map((meta, i) => {
            const Icon = meta.icon
            const isActive = i + 1 === step
            const isComplete = i + 1 < step
            return (
              <button
                key={meta.label}
                type="button"
                onClick={() => {
                  // Allow clicking completed steps to navigate back
                  if (i + 1 < step) setStep(i + 1)
                }}
                className={`flex flex-col items-center gap-1 text-xs transition-colors
                  ${isActive ? "text-primary font-semibold" : ""}
                  ${isComplete ? "text-primary/70 cursor-pointer hover:text-primary" : ""}
                  ${!isActive && !isComplete ? "text-muted-foreground" : ""}
                `}
                disabled={i + 1 > step}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                    ${isActive ? "border-primary bg-primary text-primary-foreground" : ""}
                    ${isComplete ? "border-primary/70 bg-primary/10 text-primary" : ""}
                    ${!isActive && !isComplete ? "border-muted-foreground/30 text-muted-foreground" : ""}
                  `}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="hidden sm:block">{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Step Content ───────────────────────────────────────────────── */}
      <div className="min-h-[420px]">
        {step === 1 && (
          <StepPersonalInfo
            form={form}
            updateField={updateField}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={applyTemplate}
          />
        )}
        {step === 2 && <StepBodyMeasurements form={form} updateField={updateField} />}
        {step === 3 && <StepGoals form={form} updateField={updateField} />}
        {step === 4 && <StepActivity form={form} updateField={updateField} updatePedStack={updatePedStack} />}
        {step === 5 && (
          <StepDiet
            form={form}
            updateField={updateField}
            eatingPatternOptions={eatingPatternOptions}
          />
        )}
        {step === 6 && <StepReview form={form} selectedTemplate={selectedTemplate} />}
      </div>

      {/* ── Navigation Buttons ─────────────────────────────────────────── */}
      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 1}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {step < TOTAL_STEPS ? (
          <Button type="button" onClick={goNext} disabled={!canGoNext}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button type="button" onClick={handleFinish}>
            <Rocket className="w-4 h-4 mr-2" />
            Start Tracking
          </Button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Personal Info
// ═══════════════════════════════════════════════════════════════════════════════

function StepPersonalInfo({
  form,
  updateField,
  selectedTemplate,
  onSelectTemplate,
}: {
  form: WizardFormData
  updateField: (field: keyof WizardFormData, value: string | boolean | number) => void
  selectedTemplate: string | null
  onSelectTemplate: (t: ProfileTemplate) => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Tell us about yourself</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wiz-name">Full Name</Label>
              <Input
                id="wiz-name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wiz-dob">Date of Birth</Label>
              <Input
                id="wiz-dob"
                type="date"
                value={form.dob}
                onChange={(e) => updateField("dob", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wiz-age">Age (calculated)</Label>
              <Input id="wiz-age" value={form.age} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup
                value={form.gender}
                onValueChange={(v) => updateField("gender", v)}
                className="flex gap-4 pt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="m" id="gender-m" />
                  <Label htmlFor="gender-m" className="font-normal cursor-pointer">
                    Male
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="f" id="gender-f" />
                  <Label htmlFor="gender-f" className="font-normal cursor-pointer">
                    Female
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Choose a profile template (optional) — pre-fills steps 2-5
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {profileTemplates.map((tpl) => {
            const Icon = TEMPLATE_ICONS[tpl.icon]
            const isSelected = selectedTemplate === tpl.id
            return (
              <Card
                key={tpl.id}
                className={`cursor-pointer transition-all hover:shadow-md ${tpl.bgClass} ${
                  isSelected ? `ring-2 ${tpl.colorClass} shadow-md` : "border-border"
                }`}
                onClick={() => onSelectTemplate(tpl)}
              >
                <CardContent className="pt-4 pb-3 px-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${tpl.textClass}`} />
                    <span className={`font-semibold text-sm ${tpl.textClass}`}>{tpl.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tpl.description}
                  </p>
                  {isSelected && (
                    <div className={`text-xs font-medium ${tpl.textClass}`}>Selected</div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Body Measurements
// ═══════════════════════════════════════════════════════════════════════════════

function StepBodyMeasurements({
  form,
  updateField,
}: {
  form: WizardFormData
  updateField: (field: keyof WizardFormData, value: string | boolean | number) => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Height</CardTitle>
          <CardDescription>Enter your height in feet and inches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wiz-ft">Feet</Label>
              <Input
                id="wiz-ft"
                type="number"
                min="4"
                max="7"
                value={form.height_feet}
                onChange={(e) => updateField("height_feet", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-in">Inches</Label>
              <Input
                id="wiz-in"
                type="number"
                min="0"
                max="11"
                step="0.5"
                value={form.height_inches}
                onChange={(e) => updateField("height_inches", e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weight & Body Fat</CardTitle>
          <CardDescription>Your current body composition numbers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wiz-weight">Current Weight (lbs)</Label>
              <Input
                id="wiz-weight"
                type="number"
                step="0.1"
                value={form.current_weight}
                onChange={(e) => updateField("current_weight", e.target.value)}
                placeholder="e.g. 220"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-bf">Current Body Fat (%)</Label>
              <Input
                id="wiz-bf"
                type="number"
                step="0.1"
                min="5"
                max="50"
                value={form.current_bf}
                onChange={(e) => updateField("current_bf", e.target.value)}
                placeholder="e.g. 25"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optional Measurements</CardTitle>
          <CardDescription>
            These improve body fat estimation accuracy (Navy method)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wiz-waist">Waist (inches)</Label>
              <Input
                id="wiz-waist"
                type="number"
                step="0.5"
                value={form.waist}
                onChange={(e) => updateField("waist", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-hip">Hip (inches)</Label>
              <Input
                id="wiz-hip"
                type="number"
                step="0.5"
                value={form.hip}
                onChange={(e) => updateField("hip", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-neck">Neck (inches)</Label>
              <Input
                id="wiz-neck"
                type="number"
                step="0.5"
                value={form.neck}
                onChange={(e) => updateField("neck", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Goals
// ═══════════════════════════════════════════════════════════════════════════════

function StepGoals({
  form,
  updateField,
}: {
  form: WizardFormData
  updateField: (field: keyof WizardFormData, value: string | boolean | number) => void
}) {
  const goalBf = parseFloat(form.goal_bf) || 20
  const timelineWeeks = parseInt(form.timeline_weeks) || 16
  const estimatedDate = computeEstimatedDate(timelineWeeks)

  const currentWeight = parseFloat(form.current_weight) || 0
  const goalWeight = parseFloat(form.goal_weight) || 0
  const weightToLose = currentWeight > 0 && goalWeight > 0 ? currentWeight - goalWeight : 0
  const weeklyRate = timelineWeeks > 0 && weightToLose > 0 ? weightToLose / timelineWeeks : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Goals</CardTitle>
          <CardDescription>Define what you want to achieve</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="wiz-gw">Goal Weight (lbs)</Label>
            <Input
              id="wiz-gw"
              type="number"
              step="0.1"
              value={form.goal_weight}
              onChange={(e) => updateField("goal_weight", e.target.value)}
              placeholder="e.g. 180"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Goal Body Fat %</Label>
              <span className="text-sm font-semibold text-primary">{goalBf}%</span>
            </div>
            <Slider
              min={5}
              max={40}
              step={1}
              value={[goalBf]}
              onValueChange={(v) => updateField("goal_bf", v[0].toString())}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5% (Competition)</span>
              <span>20% (Fit)</span>
              <span>40%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Timeline</Label>
              <span className="text-sm font-semibold text-primary">{timelineWeeks} weeks</span>
            </div>
            <Slider
              min={8}
              max={24}
              step={1}
              value={[timelineWeeks]}
              onValueChange={(v) => updateField("timeline_weeks", v[0].toString())}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>8 weeks (Aggressive)</span>
              <span>16 weeks</span>
              <span>24 weeks (Gradual)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal Type + Calorie Floor */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Type &amp; Calorie Floor</CardTitle>
          <CardDescription>
            These inputs drive the engine&apos;s curve, partitioning model, and day-type calorie targets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wiz-goal-type">Goal Type</Label>
            <Select
              value={form.goal_type}
              onValueChange={(v) => updateField("goal_type", v)}
            >
              <SelectTrigger id="wiz-goal-type">
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cut">
                  Cut — aggressive fat loss, calorie deficit, PSMF anchor
                </SelectItem>
                <SelectItem value="recomp">
                  Recomp — lose fat while building muscle at or near maintenance
                </SelectItem>
                <SelectItem value="lean_gain">
                  Lean Gain — controlled calorie surplus, prioritize muscle with minimal fat
                </SelectItem>
                <SelectItem value="maintain">
                  Maintain — hold current weight and body composition
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              &ldquo;Cut&rdquo; uses a front-loaded deficit with Protein-Sparing Modified Fast (PSMF) days as the primary deficit vehicle.
              &ldquo;Recomp&rdquo; cycles calories around maintenance. &ldquo;Lean Gain&rdquo; ramps a modest surplus.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wiz-calorie-floor">
              Calorie Floor (kcal / day)
            </Label>
            <Input
              id="wiz-calorie-floor"
              type="number"
              min={800}
              max={2500}
              step={50}
              value={form.calorie_floor}
              onChange={(e) => updateField("calorie_floor", e.target.value)}
              placeholder="1200"
            />
            <p className="text-xs text-muted-foreground">
              The engine will not prescribe fewer calories than this floor on any day type.
              On a Protein-Sparing Modified Fast (PSMF) day the floor is automatically raised to
              at least <strong>protein&thinsp;&times;&thinsp;4 kcal + 250 kcal for fats &amp; vegetables</strong> if that
              value exceeds the floor you set here. Recommended minimum: <strong>1,200 kcal</strong>.
              Sub-RMR intake on rest / PSMF days is intentional on the PED-assisted protocol and will be
              flagged in-app — it is <em>not</em> an error.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Goal Projection Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Goal Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Estimated Completion</p>
              <p className="font-semibold">{estimatedDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Body Fat</p>
              <p className="font-semibold">{goalBf}%</p>
            </div>
            {weightToLose > 0 && (
              <>
                <div>
                  <p className="text-muted-foreground">Total Weight to Lose</p>
                  <p className="font-semibold">{weightToLose.toFixed(1)} lbs</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Weekly Rate</p>
                  <p className={`font-semibold ${weeklyRate > 2 ? "text-destructive" : "text-primary"}`}>
                    {weeklyRate.toFixed(1)} lbs/week
                    {weeklyRate > 2 && " (aggressive)"}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Activity & Training
// ═══════════════════════════════════════════════════════════════════════════════

function StepActivity({
  form,
  updateField,
  updatePedStack,
}: {
  form: WizardFormData
  updateField: (field: keyof WizardFormData, value: string | boolean | number) => void
  updatePedStack: (stack: PedStackEntry[]) => void
}) {
  const activityDescriptions: Record<string, string> = {
    "1": "Sedentary (office job, no exercise)",
    "2": "Lightly Active (light exercise 1-3 days/week)",
    "3": "Moderately Active (moderate exercise 3-5 days/week)",
    "4": "Very Active (hard exercise 6-7 days/week)",
    "5": "Extremely Active (very hard exercise/training)",
  }
  const activityLevel = parseInt(form.activity_level) || 2

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Level</CardTitle>
          <CardDescription>How active are you on a typical day?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Activity Level</Label>
              <span className="text-sm font-semibold text-primary">Level {activityLevel}</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[activityLevel]}
              onValueChange={(v) => updateField("activity_level", v[0].toString())}
            />
            <p className="text-xs text-muted-foreground">
              {activityDescriptions[activityLevel.toString()]}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Details</CardTitle>
          <CardDescription>Your workout routine and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Workout Type</Label>
              <Select
                value={form.workout_type}
                onValueChange={(v) => updateField("workout_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workout type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bodybuilding">Bodybuilding</SelectItem>
                  <SelectItem value="Powerlifting">Powerlifting</SelectItem>
                  <SelectItem value="CrossFit">CrossFit</SelectItem>
                  <SelectItem value="Cardio Only">Cardio Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Workout Days per Week</Label>
              <Select
                value={form.workout_days}
                onValueChange={(v) => updateField("workout_days", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} {d === 1 ? "day" : "days"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exercise Type</Label>
              <Select
                value={form.exercise_type}
                onValueChange={(v) => updateField("exercise_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resistance">Resistance Training</SelectItem>
                  <SelectItem value="cardio">Cardio/Endurance</SelectItem>
                  <SelectItem value="hiit">HIIT Training</SelectItem>
                  <SelectItem value="mixed">Mixed Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select
                value={form.experience_level}
                onValueChange={(v) => updateField("experience_level", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner (0-1 years)</SelectItem>
                  <SelectItem value="Novice">Novice (1-2 years)</SelectItem>
                  <SelectItem value="Intermediate">Intermediate (2-4 years)</SelectItem>
                  <SelectItem value="Advanced">Advanced (4+ years)</SelectItem>
                  <SelectItem value="Elite">Elite (competitive level)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Resistance Training?</Label>
            <RadioGroup
              value={form.resistance_training ? "yes" : "no"}
              onValueChange={(v) => updateField("resistance_training", v === "yes")}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="rt-yes" />
                <Label htmlFor="rt-yes" className="font-normal cursor-pointer">
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="rt-no" />
                <Label htmlFor="rt-no" className="font-normal cursor-pointer">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* PED use toggle — shows the stack picker when on */}
          <div className="pt-2 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">PED / Compound Use</Label>
                <p className="text-xs text-muted-foreground">
                  Are you running any performance-enhancing compounds during this program?
                </p>
              </div>
              <RadioGroup
                value={form.ped_use ? "yes" : "no"}
                onValueChange={(v) => {
                  updateField("ped_use", v === "yes")
                  // Clear the stack when user turns PED use off
                  if (v === "no") updatePedStack([])
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="ped-yes" />
                  <Label htmlFor="ped-yes" className="font-normal cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="ped-no" />
                  <Label htmlFor="ped-no" className="font-normal cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PED Protocol — only visible when ped_use is true */}
      {form.ped_use && (
        <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/40">
          <CardHeader>
            <CardTitle className="text-base">PED Protocol Stack</CardTitle>
            <CardDescription>
              Add each compound you&apos;re running. Dose and phase are optional — the engine uses
              them to apply compound-specific partitioning modifiers. Hover any evidence badge for
              sourcing details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PedStackPicker value={form.ped_stack} onChange={updatePedStack} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Diet & Lifestyle
// ═══════════════════════════════════════════════════════════════════════════════

function StepDiet({
  form,
  updateField,
  eatingPatternOptions,
}: {
  form: WizardFormData
  updateField: (field: keyof WizardFormData, value: string | boolean | number) => void
  eatingPatternOptions: ReturnType<typeof getEatingPatternOptions>
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Diet Preferences</CardTitle>
          <CardDescription>Your nutritional approach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Diet Type</Label>
              <Select
                value={form.diet_type}
                onValueChange={(v) => updateField("diet_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced Diet</SelectItem>
                  <SelectItem value="keto">Ketogenic (Low Carb, High Fat)</SelectItem>
                  <SelectItem value="high_protein">High Protein</SelectItem>
                  <SelectItem value="high_carb">High Carb</SelectItem>
                  <SelectItem value="paleo">Paleo</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="carnivore">Carnivore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Eating Pattern</Label>
              <Select
                value={form.eating_pattern}
                onValueChange={(v) => updateField("eating_pattern", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select eating pattern" />
                </SelectTrigger>
                <SelectContent>
                  {eatingPatternOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wiz-protein">Daily Protein Intake (g)</Label>
              <Input
                id="wiz-protein"
                type="number"
                min="0"
                value={form.protein_intake}
                onChange={(e) => updateField("protein_intake", e.target.value)}
                placeholder="Leave blank for auto-calculation"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifestyle</CardTitle>
          <CardDescription>Factors that affect your metabolism and recovery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sleep Quality</Label>
            <Select
              value={form.sleep_quality}
              onValueChange={(v) => updateField("sleep_quality", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="poor">Poor (less than 6 hours, restless)</SelectItem>
                <SelectItem value="fair">Fair (6-7 hours, some issues)</SelectItem>
                <SelectItem value="good">Good (7-8 hours, restful)</SelectItem>
                <SelectItem value="excellent">Excellent (8+ hours, deep sleep)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Review & Start
// ═══════════════════════════════════════════════════════════════════════════════

function StepReview({
  form,
  selectedTemplate,
}: {
  form: WizardFormData
  selectedTemplate: string | null
}) {
  const weeks = parseInt(form.timeline_weeks) || 16
  const estimatedDate = computeEstimatedDate(weeks)
  const templateName = selectedTemplate
    ? profileTemplates.find((t) => t.id === selectedTemplate)?.name
    : null

  const dietLabels: Record<string, string> = {
    balanced: "Balanced",
    keto: "Ketogenic",
    high_protein: "High Protein",
    high_carb: "High Carb",
    paleo: "Paleo",
    vegan: "Vegan",
    vegetarian: "Vegetarian",
    carnivore: "Carnivore",
  }

  const sleepLabels: Record<string, string> = {
    poor: "Poor",
    fair: "Fair",
    good: "Good",
    excellent: "Excellent",
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Profile Summary
          </CardTitle>
          <CardDescription>
            Review your information before starting
            {templateName && (
              <span className="ml-1 text-primary font-medium">
                (Template: {templateName})
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Personal Info
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Name:</span> {form.name}</p>
            <p><span className="text-muted-foreground">Age:</span> {form.age} years</p>
            <p><span className="text-muted-foreground">Gender:</span> {form.gender === "m" ? "Male" : "Female"}</p>
          </CardContent>
        </Card>

        {/* Body */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" /> Body Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Height:</span>{" "}
              {form.height_feet}&apos;{form.height_inches}&quot;
            </p>
            <p><span className="text-muted-foreground">Weight:</span> {form.current_weight} lbs</p>
            <p><span className="text-muted-foreground">Body Fat:</span> {form.current_bf}%</p>
            {form.waist && (
              <p><span className="text-muted-foreground">Waist:</span> {form.waist}&quot;</p>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Goal Weight:</span> {form.goal_weight} lbs</p>
            <p><span className="text-muted-foreground">Goal Body Fat:</span> {form.goal_bf}%</p>
            <p><span className="text-muted-foreground">Timeline:</span> {form.timeline_weeks} weeks</p>
            <p><span className="text-muted-foreground">Est. Completion:</span> {estimatedDate}</p>
            <p>
              <span className="text-muted-foreground">Goal Type:</span>{" "}
              {{ cut: "Cut", recomp: "Recomp", lean_gain: "Lean Gain", maintain: "Maintain" }[form.goal_type] ?? form.goal_type}
            </p>
            <p><span className="text-muted-foreground">Calorie Floor:</span> {form.calorie_floor} kcal/day</p>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5" /> Activity & Training
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Activity Level:</span> {form.activity_level}/5</p>
            <p><span className="text-muted-foreground">Workout:</span> {form.workout_type}</p>
            <p><span className="text-muted-foreground">Days/Week:</span> {form.workout_days}</p>
            <p>
              <span className="text-muted-foreground">Resistance:</span>{" "}
              {form.resistance_training ? "Yes" : "No"}
            </p>
            <p>
              <span className="text-muted-foreground">PED Use:</span>{" "}
              {form.ped_use ? "Yes" : "No"}
            </p>
            {form.ped_use && form.ped_stack.length > 0 && (
              <div>
                <span className="text-muted-foreground">Stack:</span>{" "}
                <span>
                  {form.ped_stack
                    .filter((e) => e.compound)
                    .map((e) =>
                      [e.compound, e.dose_mg ? `${e.dose_mg}mg` : null, e.phase]
                        .filter(Boolean)
                        .join(" · ")
                    )
                    .join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diet */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" /> Diet & Lifestyle
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
              <p><span className="text-muted-foreground">Diet:</span> {dietLabels[form.diet_type] || form.diet_type}</p>
              <p><span className="text-muted-foreground">Eating:</span> {form.eating_pattern}</p>
              <p>
                <span className="text-muted-foreground">Protein:</span>{" "}
                {form.protein_intake ? `${form.protein_intake}g` : "Auto"}
              </p>
              <p><span className="text-muted-foreground">Sleep:</span> {sleepLabels[form.sleep_quality] || form.sleep_quality}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
