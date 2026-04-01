"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useApp } from "@/contexts/app-context"

export default function SetupPage() {
  const router = useRouter()
  const { state, setUserData } = useApp()
  const { current_user } = state
  
  // Check if user is already set up
  const isUserSetUp = !!current_user

  const handleStartNewProgram = async () => {
    // Start a new program while keeping entries and reports
    if (window.confirm('This will start a new goal/program. Your existing entries and reports will be preserved. Continue?')) {
      try {
        // Only clear user profile data and calculation, keep entries and reports
        const entriesToKeep = localStorage.getItem('bodyfat_entries')
        const reportsToKeep = localStorage.getItem('bodyfat_reports')
        const settingsToKeep = localStorage.getItem('theme-preferences')
        const aiSettingsToKeep = localStorage.getItem('ai-settings')
        
        // Clear user data in localStorage
        localStorage.removeItem('bodyfat_user_data')
        localStorage.removeItem('bodyfat_calculation_result')
        
        // Clear user data via API (which handles Redis)
        try {
          await fetch('/api/data/user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (apiError) {
          console.warn('Could not clear user via API, continuing...', apiError)
        }
        
        // Use context method to clear user data
        setUserData(null as any)
        
        // Redirect to setup to create new profile
        router.push('/setup/custom')
      } catch (error) {
        console.error('Error starting new program:', error)
        alert('There was an error starting a new program. Please try again.')
      }
    }
  }

  const handleQuickSetup = () => {
    // Use the existing test data for quick setup
    const testUserData = {
      name: "Test User",
      age: 47,
      gender: "m" as const,
      height_feet: 5,
      height_inches: 9,
      height_cm: 175.26,
      dob: "070578",
      
      current_weight: 266.8,
      current_bf: 36.0,
      
      goal_weight: 217.0,
      goal_bf: 10.0,
      start_date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      end_date: new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      
      activity_level: 1,
      resistance_training: true,
      is_athlete: true,
      workout_type: "Bodybuilding",
      workout_days: 3,
      job_activity: 1,
      leisure_activity: 1,
      experience_level: "Advanced",
      volume_score: 8.0,
      intensity_score: 9.0,
      frequency_score: 6.0,
      is_bodybuilder: true,
      
      protein_intake: 265.0,
      diet_type: "keto",
      eating_pattern: "standard",
      eating_window_hours: 12,
      
      ped_use: true,

      exercise_type: "resistance",
      sleep_quality: "poor"
    }

    setUserData(testUserData)
    router.push("/")
  }

  return (
    <div className="container max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Ap³𝘹Fit.ai – 𝛼</h1>
        <p className="text-muted-foreground">
          Set up your profile to start tracking your body composition progress with AI-powered insights
        </p>
      </div>

      {isUserSetUp ? (
        <>
          {/* User Already Set Up - Show Completion Status */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                ✅ Profile Complete
              </CardTitle>
              <CardDescription className="text-green-700">
                Your profile was set up on {current_user.start_date ? new Date(current_user.start_date).toLocaleDateString() : 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Current Profile:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• {current_user.name}</li>
                  <li>• {current_user.age} years old, {current_user.height_feet}&apos;{current_user.height_inches}&quot;</li>
                  <li>• Current: {current_user.current_weight} lbs, {current_user.current_bf}% BF</li>
                  <li>• Goal: {current_user.goal_weight} lbs, {current_user.goal_bf}% BF</li>
                  <li>• {current_user.workout_type} program</li>
                </ul>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => router.push('/setup/custom')}
                >
                  Update Profile
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleStartNewProgram}
                >
                  Start New Program
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* User Not Set Up - Show Setup Options */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  ⚡ Quick Setup
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Get started immediately with a pre-configured demo profile to explore all features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Instant access to all application features</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Pre-loaded with realistic transformation data</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Advanced bodybuilding program configuration</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>16-week aggressive cut timeline</span>
                  </div>
                </div>
                
                <Button variant="default" onClick={handleQuickSetup} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                  Start with Demo Profile
                </Button>
                
                <p className="text-xs text-blue-600 text-center">
                  Perfect for exploring the PRIME calculation engine
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  🎯 Custom Setup
                </CardTitle>
                <CardDescription className="text-emerald-700">
                  Create your personalized transformation plan with your specific data and goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span>Personalized for your body composition</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span>Tailored workout and diet preferences</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span>Custom timeline and goal setting</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span>AI-optimized progression calculations</span>
                  </div>
                </div>
                
                <Button
                  variant="secondary"
                  className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                  onClick={() => router.push('/setup/wizard')}
                >
                  Create Personal Profile
                </Button>

                <p className="text-xs text-emerald-600 text-center">
                  Recommended for your actual transformation journey
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Note: This application uses the proven PRIME calculation engine with AI-powered confidence analysis.
          All calculations are performed locally for privacy.
        </p>
      </div>
    </div>
  )
}