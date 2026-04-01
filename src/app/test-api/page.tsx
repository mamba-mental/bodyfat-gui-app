"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useApp } from "@/contexts/app-context"

export default function TestAPIPage() {
  const { state } = useApp()
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [error, setError] = useState<string>("")

  const testCalculateAPI = async () => {
    // Create a complete test user data matching Python API expectations
    const testData = {
      name: "Test User",
      age: 47,
      gender: "m", // Python API expects 'gender', not 'sex'
      height_feet: 5,
      height_inches: 9,
      height_cm: 175.26,
      dob: "070578",
      
      current_weight: 266.8,
      current_bf: 36.0,
      
      goal_weight: 217.0,
      goal_bf: 10.0,
      start_date: "01/07/25",
      end_date: "04/28/25",
      
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
      
      ped_use: true,
      exercise_type: "resistance",
      sleep_quality: "poor"
    }

    try {
      setError("")
      
      // Test direct Python API
      const response = await fetch("http://127.0.0.1:8313/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        setError(`Python API Error: ${response.status} - ${errorData}`)
        return
      }

      const result = await response.json()
      setApiResponse(result)
    } catch (err: any) {
      setError(`Network Error: ${err.message}`)
    }
  }

  const testViaNextAPI = async () => {
    if (!state.current_user) {
      setError("No user data available")
      return
    }

    try {
      setError("")
      
      // Test via Next.js API route
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.current_user)
      })

      const result = await response.json()
      setApiResponse(result)
    } catch (err: any) {
      setError(`API Error: ${err.message}`)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold">Test Python API Connection</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Current User Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto p-4 bg-muted rounded">
            {JSON.stringify(state.current_user, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button onClick={testCalculateAPI}>
              Test Direct Python API Call
            </Button>
            <Button onClick={testViaNextAPI} variant="outline">
              Test via Next.js API Route
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded">
              <pre className="text-xs">{error}</pre>
            </div>
          )}

          {apiResponse && (
            <div className="p-4 bg-green-50 rounded">
              <p className="text-green-800 font-medium mb-2">Success! Calculation Result:</p>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(apiResponse, null, 2).substring(0, 1000)}...
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}