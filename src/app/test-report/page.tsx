"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestReportPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const testData = {
    name: "Test User",
    age: 47,
    gender: "m",
    height_feet: 5,
    height_inches: 9,
    height_cm: 175.26,
    dob: "07/05/78",
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
    sleep_quality: "poor",
    waist: 40,
    hip: 44,
    neck: 17,
    timeline_weeks: 16
  }

  const generateReport = async () => {
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      console.log("Sending test data:", testData)
      
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      console.log("Report generated successfully:", data)
      setReportData(data)
      setSuccess(true)
    } catch (err: any) {
      console.error("Report generation error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold">Test Report Generation</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto p-4 bg-muted rounded">
            {JSON.stringify(testData, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateReport} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Generating..." : "Generate Test Report"}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && reportData && (
            <div className="p-4 bg-green-50 text-green-800 rounded space-y-2">
              <p className="font-medium">Success!</p>
              <p className="text-sm">Report generated successfully</p>
              {reportData.html_content && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const win = window.open("", "_blank")
                    if (win) {
                      win.document.write(reportData.html_content)
                      win.document.close()
                    }
                  }}
                >
                  View Report in New Tab
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Make sure the Python API is running on port 8313</p>

          <p>2. Click "Generate Test Report"</p>
          <p>3. Check the browser console for detailed logs</p>
          <p>4. If successful, click "View Report in New Tab" to see the generated report</p>
        </CardContent>
      </Card>
    </div>
  )
}