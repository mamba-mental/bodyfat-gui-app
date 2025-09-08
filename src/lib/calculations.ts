// Frontend calculation service that communicates with Python PRIME API

import { UserData, CalculationResult, WeeklyProgression } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8000'

export class CalculationError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'CalculationError'
  }
}

export interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
  detail?: string
}

/**
 * Calculate weight loss progression using PRIME engine
 */
export async function calculateProgression(userData: UserData): Promise<CalculationResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new CalculationError(
        errorData.detail || `API request failed with status ${response.status}`,
        response.status
      )
    }

    const result: CalculationResult = await response.json()
    return result
  } catch (error) {
    if (error instanceof CalculationError) {
      throw error
    }
    
    // Handle network errors or API unavailable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CalculationError(
        'Unable to connect to calculation service. Please ensure the Python API is running.',
        503
      )
    }
    
    throw new CalculationError(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Recalculate progression with a new entry
 */
export async function recalculateWithEntry(
  userData: UserData,
  entry: { date: string; weight: number; body_fat_percentage?: number; notes?: string }
): Promise<CalculationResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_data: userData, entry }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new CalculationError(
        errorData.detail || `Recalculation failed with status ${response.status}`,
        response.status
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof CalculationError) {
      throw error
    }
    throw new CalculationError(`Recalculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate report using PRIME report generator
 */
export async function generateReport(userData: UserData): Promise<{
  success: boolean
  markdown_path?: string
  pdf_path?: string
  html_content?: string
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new CalculationError(
        errorData.detail || `Report generation failed with status ${response.status}`,
        response.status
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof CalculationError) {
      throw error
    }
    throw new CalculationError(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate Resting Metabolic Rate (RMR)
 */
export async function calculateRMR(
  weight: number,
  height: number,
  age: number,
  gender: string
): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/rmr/${weight}/${height}/${age}/${gender}`)
    
    if (!response.ok) {
      throw new CalculationError(`RMR calculation failed with status ${response.status}`)
    }

    const result = await response.json()
    return result.rmr
  } catch (error) {
    if (error instanceof CalculationError) {
      throw error
    }
    throw new CalculationError(`RMR calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 */
export async function calculateTDEE(rmr: number, activityLevel: number): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/tdee/${rmr}/${activityLevel}`)
    
    if (!response.ok) {
      throw new CalculationError(`TDEE calculation failed with status ${response.status}`)
    }

    const result = await response.json()
    return result.tdee
  } catch (error) {
    if (error instanceof CalculationError) {
      throw error
    }
    throw new CalculationError(`TDEE calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if Python API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get current calorie recommendation based on user data and current progress
 */
export async function getCurrentCalorieRecommendation(
  userData: UserData,
  currentWeight?: number,
  currentBF?: number
): Promise<number> {
  try {
    // If current measurements provided, update user data
    const updatedData = { ...userData }
    if (currentWeight) updatedData.current_weight = currentWeight
    if (currentBF) updatedData.current_bf = currentBF

    // Calculate progression to get current calorie needs
    const result = await calculateProgression(updatedData)
    
    // Return the current week's calorie recommendation
    const currentWeek = result.progression[0]
    return currentWeek?.daily_calorie_intake || 2000
  } catch (error) {
    console.error('Failed to get calorie recommendation:', error)
    // Fallback to basic calculation
    const rmr = await calculateRMR(userData.current_weight, userData.height_cm, userData.age, userData.gender)
    const tdee = await calculateTDEE(rmr, userData.activity_level)
    return Math.round(tdee * 0.8) // Basic 20% deficit
  }
}

/**
 * Calculate progress percentage towards goals
 */
export function calculateProgressPercentage(
  initial: number,
  current: number,
  goal: number
): number {
  if (initial === goal) return 100
  const totalChange = goal - initial
  const currentChange = current - initial
  return Math.max(0, Math.min(100, (currentChange / totalChange) * 100))
}

/**
 * Estimate time to goal based on program length and current progress
 */
export function estimateTimeToGoal(
  progression: WeeklyProgression[],
  goalWeight: number,
  goalBF: number,
  programLengthWeeks?: number
): { weeks: number; completion_date: Date } {
  if (progression.length === 0) {
    return { weeks: 0, completion_date: new Date() }
  }

  // If program length is specified, use it as the primary timeline
  let estimatedWeeks: number
  
  if (programLengthWeeks && programLengthWeeks > 0) {
    // Use the original program timeline
    estimatedWeeks = programLengthWeeks
  } else {
    // Fallback to calculation based on progression
    const lastEntry = progression[progression.length - 1]
    const avgWeightLossPerWeek = progression.reduce((sum, week, index) => {
      if (index === 0) return 0
      return sum + (progression[index - 1].weight - week.weight)
    }, 0) / Math.max(1, progression.length - 1)

    const remainingWeightLoss = lastEntry.weight - goalWeight
    const weeksToWeightGoal = remainingWeightLoss / Math.max(0.5, avgWeightLossPerWeek)

    const avgBFReductionPerWeek = progression.reduce((sum, week, index) => {
      if (index === 0) return 0
      return sum + (progression[index - 1].body_fat_percentage - week.body_fat_percentage)
    }, 0) / Math.max(1, progression.length - 1)

    const remainingBFReduction = lastEntry.body_fat_percentage - goalBF
    const weeksToBFGoal = remainingBFReduction / Math.max(0.1, avgBFReductionPerWeek)

    // Take the longer of the two goals
    estimatedWeeks = Math.ceil(Math.max(weeksToWeightGoal, weeksToBFGoal))
  }

  const completionDate = new Date()
  completionDate.setDate(completionDate.getDate() + (estimatedWeeks * 7))

  return {
    weeks: estimatedWeeks,
    completion_date: completionDate
  }
}