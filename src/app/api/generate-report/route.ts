import { NextRequest, NextResponse } from 'next/server'
import { UserData } from '@/types'

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8001'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const userData: UserData = await request.json()
    
    // Log incoming request data
    console.log('=== Generate Report Request ===')
    console.log('Raw user data:', JSON.stringify(userData, null, 2))
    
    // Calculate timeline weeks from dates
    const startDate = new Date(userData.start_date || Date.now())
    const endDate = new Date(userData.end_date || Date.now() + 16 * 7 * 24 * 60 * 60 * 1000)
    const timelineWeeks = Math.round((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
    
    // Ensure all required fields are present for Python API
    const apiData = {
      ...userData,
      // Ensure dates are in the correct format (MM/DD/YY)
      start_date: userData.start_date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      end_date: userData.end_date || new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      // Add timeline_weeks
      timeline_weeks: timelineWeeks || 16,
      // Ensure all numeric fields have defaults
      height_cm: userData.height_cm || (userData.height_feet * 30.48 + userData.height_inches * 2.54),
      volume_score: userData.volume_score || 7.0,
      intensity_score: userData.intensity_score || 7.0,
      frequency_score: userData.frequency_score || 7.0,
      protein_intake: userData.protein_intake || (userData.current_weight * 1.0),
      workout_days: userData.workout_days || 3,
      job_activity: userData.job_activity || 2,
      leisure_activity: userData.leisure_activity || 2,
      // Body measurements defaults
      waist: userData.waist || 40,
      hip: userData.hip || 44,
      neck: userData.neck || 17,
      // Ensure string fields have defaults
      experience_level: userData.experience_level || "Intermediate",
      workout_type: userData.workout_type || "General Fitness",
      diet_type: userData.diet_type || "balanced",
      exercise_type: userData.exercise_type || "resistance",
      sleep_quality: userData.sleep_quality || "good"
    }
    
    console.log('Processed API data:', JSON.stringify(apiData, null, 2))
    console.log('Python API URL:', PYTHON_API_URL)
    
    // First check if Python API is accessible - skip health check and go directly to report
    // The health check endpoint doesn't exist in the Python API
    let pythonApiAvailable = true
    
    // Call the Python API to generate the report
    try {
      console.log('Calling Python API at:', `${PYTHON_API_URL}/generate-report`)
      console.log('Request body:', JSON.stringify(apiData, null, 2))
      
      const response = await fetch(`${PYTHON_API_URL}/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
        signal: AbortSignal.timeout(30000) // 30 second timeout - should be plenty without AI analysis
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Python API error response:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText
        })
        
        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          console.error('Failed to parse error response as JSON:', errorText)
        }
        
        throw new Error((errorData as any)?.detail || (errorData as any)?.message || `Python API returned status ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const result = await response.json()
      console.log('Python API success response:', result)
      
      return NextResponse.json(result, { headers: corsHeaders })
    } catch (pythonApiError) {
      console.error('Python API report generation failed:', pythonApiError)
      console.error('Error details:', {
        name: pythonApiError instanceof Error ? pythonApiError.name : 'Unknown',
        message: pythonApiError instanceof Error ? pythonApiError.message : String(pythonApiError),
        stack: pythonApiError instanceof Error ? pythonApiError.stack : 'No stack trace'
      })
      
      // Fallback HTML report generation if Python API is unavailable
      console.log('Using fallback report generator')
      const fallbackReport = generateFallbackReport(apiData)
      
      return NextResponse.json({
        html_content: fallbackReport,
        markdown_path: '',
        pdf_path: ''
      }, { headers: corsHeaders })
    }
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate report. Please ensure the Python API is running on port 8001.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

function generateFallbackReport(userData: any): string {
  console.log('Generating fallback report with data:', JSON.stringify(userData, null, 2))
  const now = new Date()
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fitness Progress Report - ${userData.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        h1 {
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        .metric-label {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 5px;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            transition: width 0.3s ease;
        }
        .section {
            margin: 30px 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .info-item {
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .info-label {
            font-weight: bold;
            color: #495057;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }
        .ai-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Ap³𝘹Fit.ai Progress Report</h1>
        <p style="color: #6c757d;">Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}</p>
        
        <div class="section">
            <h2>Personal Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Name:</span> ${userData.name}
                </div>
                <div class="info-item">
                    <span class="info-label">Age:</span> ${userData.age} years
                </div>
                <div class="info-item">
                    <span class="info-label">Height:</span> ${userData.height_feet || 0}'${userData.height_inches || 0}" (${(userData.height_cm || 0).toFixed(1)} cm)
                </div>
                <div class="info-item">
                    <span class="info-label">Activity Level:</span> ${getActivityLevelText(userData.activity_level)}
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Current Status</h2>
            <div class="metrics">
                <div class="metric-card">
                    <div class="metric-value">${(userData.current_weight || 0).toFixed(1)}</div>
                    <div class="metric-label">Current Weight (lbs)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(userData.current_bf || 0).toFixed(1)}%</div>
                    <div class="metric-label">Body Fat Percentage</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(((userData.current_weight || 0) * (1 - (userData.current_bf || 0) / 100))).toFixed(1)}</div>
                    <div class="metric-label">Lean Mass (lbs)</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Goals</h2>
            <div class="metrics">
                <div class="metric-card">
                    <div class="metric-value">${(userData.goal_weight || 0).toFixed(1)}</div>
                    <div class="metric-label">Target Weight (lbs)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(userData.goal_bf || 0).toFixed(1)}%</div>
                    <div class="metric-label">Target Body Fat</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${userData.timeline_weeks}</div>
                    <div class="metric-label">Timeline (weeks)</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Progress Overview</h2>
            <div>
                <h3>Weight Progress</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${calculateProgress(userData.current_weight, userData.goal_weight, userData.current_weight)}%"></div>
                </div>
                <p>Target weight loss: ${((userData.current_weight || 0) - (userData.goal_weight || 0)).toFixed(1)} lbs</p>
            </div>
            
            <div style="margin-top: 20px;">
                <h3>Body Fat Progress</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${calculateProgress(userData.current_bf, userData.goal_bf, userData.current_bf)}%"></div>
                </div>
                <p>Target body fat reduction: ${((userData.current_bf || 0) - (userData.goal_bf || 0)).toFixed(1)}%</p>
            </div>
        </div>

        <div class="section">
            <h2>Training Profile</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Workout Type:</span> ${userData.workout_type || 'Not specified'}
                </div>
                <div class="info-item">
                    <span class="info-label">Workout Days:</span> ${userData.workout_days || 0} days/week
                </div>
                <div class="info-item">
                    <span class="info-label">Experience Level:</span> ${userData.experience_level || 'Not specified'}
                </div>
                <div class="info-item">
                    <span class="info-label">Is Athlete:</span> ${userData.is_athlete ? 'Yes' : 'No'}
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Nutrition Profile</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Diet Type:</span> ${userData.diet_type || 'Not specified'}
                </div>
                <div class="info-item">
                    <span class="info-label">Protein Intake:</span> ${userData.protein_intake || 0}g/day
                </div>
                <div class="info-item">
                    <span class="info-label">Sleep Quality:</span> ${userData.sleep_quality || 'Not specified'}
                </div>
                <div class="info-item">
                    <span class="info-label">Exercise Type:</span> ${userData.exercise_type || 'Not specified'}
                </div>
            </div>
        </div>

        <div class="ai-note">
            <strong>Note:</strong> This is a fallback report generated without full AI analysis. For complete AI-powered insights and personalized recommendations, ensure the Python API server is running.
        </div>

        <div class="footer">
            <p>Generated by Ap³𝘹Fit.ai – 𝛼 (Alpha)</p>
            <p>Advanced AI-Powered Fitness Analytics</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

function getActivityLevelText(level: number): string {
  const levels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extremely Active']
  return levels[level] || 'Unknown'
}

function calculateProgress(current: number, goal: number, start: number): number {
  if (start === goal) return 100
  const progress = ((start - current) / (start - goal)) * 100
  return Math.max(0, Math.min(100, progress))
}