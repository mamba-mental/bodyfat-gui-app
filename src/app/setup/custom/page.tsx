"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { calculateAge } from "@/lib/date-utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { useApp } from "@/contexts/app-context"
import { getEatingPatternOptions, getEatingWindowHours } from "@/lib/eating-patterns"
import { PedStackPicker } from "@/components/setup/ped-stack-picker"


export default function CustomSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewProgram = searchParams.get('newProgram') === 'true'
  const requestedWeeks = [12, 15, 22].includes(Number(searchParams.get('weeks')))
    ? String(Number(searchParams.get('weeks')))
    : null
  const { setUserData, createNewProgram, state } = useApp()
  const { current_user } = state

  const normalizeDateInput = (value?: string | null) => {
    if (!value) return ""
    if (value.includes('-')) {
      return value
    }
    if (value.includes('/')) {
      const [month, day, year] = value.split('/')
      if (month && day && year) {
        const normalizedYear = year.length === 2 ? `20${year}` : year.padStart(4, '0')
        return `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    if (value.length === 6) {
      const month = value.slice(0, 2)
      const day = value.slice(2, 4)
      const year = value.slice(4)
      const normalizedYear = year.length === 2 ? `20${year}` : year
      return `${normalizedYear}-${month}-${day}`
    }
    if (value.length === 8) {
      const month = value.slice(0, 2)
      const day = value.slice(2, 4)
      const year = value.slice(4)
      return `${year}-${month}-${day}`
    }
    return value
  }

  // Pre-populate form with existing user data if available
  const [formData, setFormData] = useState({
    name: current_user?.name || "",
    age: current_user?.age?.toString() || "",
    dob: normalizeDateInput(current_user?.dob) || "",
    gender: current_user?.gender || "",
    height_feet: current_user?.height_feet?.toString() || "",
    height_inches: current_user?.height_inches?.toString() || "",
    height_cm: current_user?.height_cm?.toString() || "",

    current_weight: current_user?.current_weight?.toString() || "",
    current_bf: current_user?.current_bf?.toString() || "",

    goal_weight: current_user?.goal_weight?.toString() || "",
    goal_bf: current_user?.goal_bf?.toString() || "",
    timeline_weeks: requestedWeeks || current_user?.timeline_weeks || "16",

    activity_level: current_user?.activity_level?.toString() || "1",
    resistance_training: current_user?.resistance_training || false,
    is_athlete: current_user?.is_athlete || false,
    workout_type: current_user?.workout_type || "",
    workout_days: current_user?.workout_days?.toString() || "3",
    job_activity: current_user?.job_activity?.toString() || "1",
    leisure_activity: current_user?.leisure_activity?.toString() || "1",
    experience_level: current_user?.experience_level || "Beginner",
    volume_score: current_user?.volume_score?.toString() || "5",
    intensity_score: current_user?.intensity_score?.toString() || "5",
    frequency_score: current_user?.frequency_score?.toString() || "3",
    is_bodybuilder: current_user?.is_bodybuilder || false,

    protein_intake: current_user?.protein_intake?.toString() || "",
    diet_type: current_user?.diet_type || "balanced",
    eating_pattern: current_user?.eating_pattern || "standard",


    ped_use: current_user?.ped_use || false,
    ped_stack: current_user?.ped_stack || [],
    exercise_type: current_user?.exercise_type || "resistance",
    sleep_quality: current_user?.sleep_quality || "good"
  })

  const [useMetric, setUseMetric] = useState(false)
  const eatingPatternOptions = React.useMemo(() => getEatingPatternOptions(), [])
 
  // Update form data when current_user becomes available

  useEffect(() => {
    if (current_user) {
      setFormData({
        name: current_user.name || "",
        age: current_user.age?.toString() || "",
        dob: normalizeDateInput(current_user.dob) || "",
        gender: current_user.gender || "",
        height_feet: current_user.height_feet?.toString() || "",
        height_inches: current_user.height_inches?.toString() || "",
        height_cm: current_user.height_cm?.toString() || "",

        current_weight: current_user.current_weight?.toString() || "",
        current_bf: current_user.current_bf?.toString() || "",

        goal_weight: current_user.goal_weight?.toString() || "",
        goal_bf: current_user.goal_bf?.toString() || "",
        timeline_weeks: requestedWeeks || current_user.timeline_weeks || "16",

        activity_level: current_user.activity_level?.toString() || "1",
        resistance_training: current_user.resistance_training || false,
        is_athlete: current_user.is_athlete || false,
        workout_type: current_user.workout_type || "",
        workout_days: current_user.workout_days?.toString() || "3",
        job_activity: current_user.job_activity?.toString() || "1",
        leisure_activity: current_user.leisure_activity?.toString() || "1",
        experience_level: current_user.experience_level || "Beginner",
        volume_score: current_user.volume_score?.toString() || "5",
        intensity_score: current_user.intensity_score?.toString() || "5",
        frequency_score: current_user.frequency_score?.toString() || "3",
        is_bodybuilder: current_user.is_bodybuilder || false,

        protein_intake: current_user.protein_intake?.toString() || "",
        diet_type: current_user.diet_type || "balanced",
        eating_pattern: current_user.eating_pattern || "standard",

        ped_use: current_user.ped_use || false,
        ped_stack: current_user.ped_stack || [],

        exercise_type: current_user.exercise_type || "resistance",
        sleep_quality: current_user.sleep_quality || "good"
      })
    }
  }, [current_user, requestedWeeks])

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Auto-calculate age from DOB
    if (field === 'dob') {
      const dob = new Date(value as string)
      const today = new Date()
      const age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age
      setFormData(prev => ({ ...prev, age: finalAge.toString() }))
    }

    // Auto-calculate height conversions
    if (field === 'height_feet' || field === 'height_inches') {
      const feet = parseFloat(field === 'height_feet' ? value as string : formData.height_feet) || 0
      const inches = parseFloat(field === 'height_inches' ? value as string : formData.height_inches) || 0
      const totalInches = (feet * 12) + inches
      const cm = totalInches * 2.54
      setFormData(prev => ({ ...prev, height_cm: cm.toFixed(2) }))
    }

    if (field === 'height_cm') {
      const cm = parseFloat(value as string) || 0
      const totalInches = cm / 2.54
      const feet = Math.floor(totalInches / 12)
      const inches = totalInches % 12
      setFormData(prev => ({
        ...prev,
        height_feet: feet.toString(),
        height_inches: inches.toFixed(1)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Convert string numbers to actual numbers
    const normalizedDob = normalizeDateInput(formData.dob) || ""
    const timelineWeeksNumber = parseInt(formData.timeline_weeks?.toString() || '16', 10) || 16
    const startDateIso = new Date().toISOString().split('T')[0]
    const endDateIso = new Date(Date.now() + timelineWeeksNumber * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const derivedAge = normalizedDob
      ? calculateAge(normalizedDob)
      : parseInt(formData.age || '', 10)

    const processedData = {
      ...formData,
      age: Number.isNaN(derivedAge) ? 0 : derivedAge,
      gender: formData.gender as "m" | "f",
      height_feet: parseInt(formData.height_feet),
      height_inches: parseFloat(formData.height_inches),
      height_cm: parseFloat(formData.height_cm),
      current_weight: parseFloat(formData.current_weight),
      current_bf: parseFloat(formData.current_bf),
      goal_weight: parseFloat(formData.goal_weight),
      goal_bf: parseFloat(formData.goal_bf),
      activity_level: parseInt(formData.activity_level),
      workout_days: parseInt(formData.workout_days),
      job_activity: parseInt(formData.job_activity),
      leisure_activity: parseInt(formData.leisure_activity),
      volume_score: parseFloat(formData.volume_score),
      intensity_score: parseFloat(formData.intensity_score),
      frequency_score: parseFloat(formData.frequency_score),
      protein_intake: parseFloat(formData.protein_intake) || 0,
      timeline_weeks: timelineWeeksNumber,
      start_date: startDateIso,
      end_date: endDateIso,
      dob: normalizedDob || "",
      eating_pattern: formData.eating_pattern || "standard",
      eating_window_hours: getEatingWindowHours(formData.eating_pattern),
      ped_stack: formData.ped_stack && formData.ped_stack.length > 0 ? formData.ped_stack : undefined,
    }

    if (isNewProgram) {
      const programId = await createNewProgram(processedData as any)
      if (!programId) return
    } else {
      setUserData(processedData)
    }

    router.push("/")
  }

  // Determine title and description based on context
  const getPageTitle = () => {
    if (isNewProgram) return 'Start New Program'
    if (current_user) return 'Update Profile'
    return 'Custom Profile Setup'
  }

  const getPageDescription = () => {
    if (isNewProgram) return 'Enter your current stats to start a fresh program. Your new weight and body fat percentage will become the baseline for tracking progress.'
    if (current_user) return 'Update your personalized body composition tracking profile'
    return 'Create your personalized body composition tracking profile'
  }

  return (
    <div className="container max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {getPageTitle()}
        </h1>
        <p className="text-muted-foreground">
          {getPageDescription()}
        </p>
      </div>

      {isNewProgram && (
        <Alert>
          <AlertDescription>
            Update your <strong>Current Weight</strong> and <strong>Current Body Fat %</strong> below.
            These values will become your new program baseline for tracking progress.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age (calculated)</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Male</SelectItem>
                    <SelectItem value="f">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Height */}
        <Card>
          <CardHeader>
            <CardTitle>Height</CardTitle>
            <CardDescription>Enter your height in your preferred units</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={useMetric}
                onCheckedChange={setUseMetric}
              />
              <Label>Use metric (cm)</Label>
            </div>

            {useMetric ? (
              <div className="space-y-2">
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  step="0.1"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height_feet">Feet</Label>
                  <Input
                    id="height_feet"
                    type="number"
                    min="4"
                    max="7"
                    value={formData.height_feet}
                    onChange={(e) => handleInputChange('height_feet', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height_inches">Inches</Label>
                  <Input
                    id="height_inches"
                    type="number"
                    min="0"
                    max="11"
                    step="0.1"
                    value={formData.height_inches}
                    onChange={(e) => handleInputChange('height_inches', e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Current Stats</CardTitle>
            <CardDescription>Your current body composition</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_weight">Current Weight (lbs)</Label>
                <Input
                  id="current_weight"
                  type="number"
                  step="0.1"
                  value={formData.current_weight}
                  onChange={(e) => handleInputChange('current_weight', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_bf">Current Body Fat (%)</Label>
                <Input
                  id="current_bf"
                  type="number"
                  step="0.1"
                  min="5"
                  max="50"
                  value={formData.current_bf}
                  onChange={(e) => handleInputChange('current_bf', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
            <CardDescription>What do you want to achieve?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal_weight">Goal Weight (lbs)</Label>
                <Input
                  id="goal_weight"
                  type="number"
                  step="0.1"
                  value={formData.goal_weight}
                  onChange={(e) => handleInputChange('goal_weight', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal_bf">Goal Body Fat (%)</Label>
                <Input
                  id="goal_bf"
                  type="number"
                  step="0.1"
                  min="5"
                  max="35"
                  value={formData.goal_bf}
                  onChange={(e) => handleInputChange('goal_bf', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline_weeks">Timeline (weeks)</Label>
                <Select value={formData.timeline_weeks?.toString()} onValueChange={(value) => handleInputChange('timeline_weeks', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 weeks</SelectItem>
                    <SelectItem value="12">12 weeks</SelectItem>
                    <SelectItem value="15">15 weeks</SelectItem>
                    <SelectItem value="16">16 weeks</SelectItem>
                    <SelectItem value="20">20 weeks</SelectItem>
                    <SelectItem value="22">22 weeks</SelectItem>
                    <SelectItem value="24">24 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Level */}
        <Card>
          <CardHeader>
            <CardTitle>Activity & Training</CardTitle>
            <CardDescription>Tell us about your activity level and training</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity_level">General Activity Level</Label>
                <Select value={formData.activity_level} onValueChange={(value) => handleInputChange('activity_level', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Sedentary (office job, no exercise)</SelectItem>
                    <SelectItem value="2">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                    <SelectItem value="3">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                    <SelectItem value="4">Very Active (hard exercise 6-7 days/week)</SelectItem>
                    <SelectItem value="5">Extremely Active (very hard exercise/training)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_activity">Job Activity Level</Label>
                <Select value={formData.job_activity} onValueChange={(value) => handleInputChange('job_activity', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Sedentary (desk job)</SelectItem>
                    <SelectItem value="2">Light Activity (teacher, nurse)</SelectItem>
                    <SelectItem value="3">Moderate Activity (retail, waiter)</SelectItem>
                    <SelectItem value="4">High Activity (construction, farmer)</SelectItem>
                    <SelectItem value="5">Very High Activity (athlete, laborer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leisure_activity">Leisure Activity Level</Label>
                <Select value={formData.leisure_activity} onValueChange={(value) => handleInputChange('leisure_activity', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low (TV, reading)</SelectItem>
                    <SelectItem value="2">Light (walking, light sports)</SelectItem>
                    <SelectItem value="3">Moderate (hiking, recreational sports)</SelectItem>
                    <SelectItem value="4">High (competitive sports)</SelectItem>
                    <SelectItem value="5">Very High (extreme sports, daily athletics)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exercise_type">Primary Exercise Type</Label>
                <Select value={formData.exercise_type} onValueChange={(value) => handleInputChange('exercise_type', value)}>
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
                <Label htmlFor="workout_days">Workout Days per Week</Label>
                <Select value={formData.workout_days} onValueChange={(value) => handleInputChange('workout_days', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 days</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="4">4 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="6">6 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience_level">Training Experience</Label>
                <Select value={formData.experience_level} onValueChange={(value) => handleInputChange('experience_level', value)}>
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

              <div className="space-y-2">
                <Label htmlFor="workout_type">Primary Workout Type</Label>
                <Select value={formData.workout_type} onValueChange={(value) => handleInputChange('workout_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary workout type" />
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
                <Label htmlFor="sleep_quality">Sleep Quality</Label>
                <Select value={formData.sleep_quality} onValueChange={(value) => handleInputChange('sleep_quality', value)}>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resistance_training">Resistance Training</Label>
                <Select
                  value={formData.resistance_training ? "yes" : "no"}
                  onValueChange={(value) => handleInputChange('resistance_training', value === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_athlete">Competitive Athlete</Label>
                <Select
                  value={formData.is_athlete ? "yes" : "no"}
                  onValueChange={(value) => handleInputChange('is_athlete', value === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_bodybuilder">Bodybuilder</Label>
                <Select
                  value={formData.is_bodybuilder ? "yes" : "no"}
                  onValueChange={(value) => handleInputChange('is_bodybuilder', value === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ped_use">Performance Enhancing Substances</Label>
                <Select
                  value={formData.ped_use ? "yes" : "no"}
                  onValueChange={(value) => handleInputChange('ped_use', value === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.ped_use && (
              <div className="space-y-2 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <Label>PED Protocol Stack</Label>
                <p className="text-xs text-muted-foreground">
                  Add the specific compounds you&apos;re running per phase. The TYPE of compound materially
                  changes the fat-loss / lean-retention prediction — each shows an evidence-confidence badge
                  (green = RCT-grade, grey = estimated). Leave empty to use a generic &quot;PEDs on&quot; signal.
                </p>
                <PedStackPicker
                  value={formData.ped_stack}
                  onChange={(stack) => setFormData((prev) => ({ ...prev, ped_stack: stack }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diet */}
        <Card>
          <CardHeader>
            <CardTitle>Nutrition</CardTitle>
            <CardDescription>Your dietary preferences and protein intake</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="diet_type">Diet Type</Label>
                <Select value={formData.diet_type} onValueChange={(value) => handleInputChange('diet_type', value)}>
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
                <Label htmlFor="eating_pattern">Eating Pattern</Label>
                <Select value={formData.eating_pattern} onValueChange={(value) => handleInputChange('eating_pattern', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select eating pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {eatingPatternOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label htmlFor="protein_intake">Daily Protein Intake (g)</Label>
                <Input
                  id="protein_intake"
                  type="number"
                  min="0"
                  value={formData.protein_intake}
                  onChange={(e) => handleInputChange('protein_intake', e.target.value)}
                  placeholder="Optional - leave blank for calculation"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/setup')}
          >
            Back
          </Button>
          <Button type="submit" variant="default">
            {isNewProgram ? 'Start New Program' : current_user ? 'Update Profile' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}
