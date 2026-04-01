/**
 * Report Actions - Report generation logic
 *
 * Handles PRIME report generation via Python backend
 */

import { UserData, Report, CalculationResult, AppAction, BodyFatEntry } from '@/types'
import {
  saveCalculationResult,
  saveReport,
  generateId,
  fetchGeneratedReport,
  fetchCalculation
} from '@/lib/storage-api'
import { getEatingWindowHours } from '@/lib/eating-patterns'

const REPORT_GENERATION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const REPORT_GENERATION_TIMEOUT_BUFFER_MS = REPORT_GENERATION_TIMEOUT_MS + 5000

export const ensureEatingPattern = (userData: UserData | null): UserData | null => {
  if (!userData) return userData
  const eatingPattern = userData.eating_pattern || 'standard'
  const eating_window_hours = userData.eating_window_hours ?? getEatingWindowHours(eatingPattern)
  return {
    ...userData,
    eating_pattern: eatingPattern,
    eating_window_hours,
  }
}

interface ReportGenerationDeps {
  dispatch: React.Dispatch<AppAction>
  entries: BodyFatEntry[]
  reports: Report[]
  announceInfo: (message: string) => void
  announceSuccess: (message: string) => void
  announceError: (message: string) => void
}

export async function generateReport(
  userData: UserData | null,
  deps: ReportGenerationDeps
): Promise<void> {
  const { dispatch, entries, reports, announceInfo, announceSuccess, announceError } = deps

  console.log('[ReportActions] generateReport invoked')

  if (!userData) {
    console.warn('[ReportActions] No user data available, aborting report generation')
    dispatch({ type: 'SET_ERROR', payload: 'No user data available for report generation' })
    dispatch({
      type: 'SET_REPORT_GENERATION_STATUS',
      payload: { status: 'Report generation failed: missing user profile.' },
    })
    return
  }

  // Filter entries for current program (by program_id or start_date)
  const today = new Date().toISOString().split('T')[0]
  const programStartDate = userData.program_reference?.start_date || userData.start_date || today

  let currentProgramEntriesForReport = entries
  if (userData.current_program_id) {
    // First try to filter by program_id
    const byProgramId = entries.filter(e => e.program_id === userData.current_program_id)
    if (byProgramId.length > 0) {
      currentProgramEntriesForReport = byProgramId
    } else {
      // Fallback: filter by date >= program start
      currentProgramEntriesForReport = entries.filter(e => {
        try {
          const dateObj = new Date(e.date)
          if (isNaN(dateObj.getTime())) return false
          const entryDate = dateObj.toISOString().split('T')[0]
          return entryDate >= programStartDate
        } catch {
          return false
        }
      })
    }
  }

  // Determine which entry will be used and record its date for diagnostics
  // Use filtered entries for current program, or show today's date if no entries
  const latestEntryForReport = currentProgramEntriesForReport[0]
  let entryDateForStatus = today
  if (latestEntryForReport) {
    try {
      const dateObj = new Date(latestEntryForReport.date)
      if (!isNaN(dateObj.getTime())) {
        entryDateForStatus = dateObj.toISOString().split('T')[0]
      }
    } catch {
      // Use today as fallback
    }
  }

  dispatch({
    type: 'SET_REPORT_GENERATION_STATUS',
    payload: { status: 'Starting report generation...', entryDate: entryDateForStatus },
  })

  try {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'CLEAR_ERROR' })
    console.log('[ReportActions] Report generation started; latest entry date:', entryDateForStatus)
    announceInfo('Generating report. This may take up to 5 minutes.')

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Report generation timed out. Please ensure the Python API is running.')),
        REPORT_GENERATION_TIMEOUT_BUFFER_MS
      )
    )

    dispatch({
      type: 'SET_REPORT_GENERATION_STATUS',
      payload: { status: 'Calculating progression for report...', entryDate: entryDateForStatus },
    })

    // Prepare user data for report
    let updatedUserData = { ...userData }
    const today = new Date().toISOString().split('T')[0]
    const programStartDate = userData.start_date || today

    console.log('[ReportActions] entries available:', entries.length, 'program start:', programStartDate)

    if (entries.length > 0) {
      const currentProgramEntries = entries.filter(entry => {
        try {
          const dateObj = new Date(entry.date)
          if (isNaN(dateObj.getTime())) return false
          const entryDate = dateObj.toISOString().split('T')[0]
          return entryDate >= programStartDate
        } catch {
          return false
        }
      })

      if (currentProgramEntries.length > 0) {
        const latestEntry = currentProgramEntries[0]
        console.log('[ReportActions] Using entry from current program:', latestEntry.date, latestEntry.weight)
        updatedUserData.current_weight = latestEntry.weight
        if (latestEntry.body_fat_percentage) {
          updatedUserData.current_bf = latestEntry.body_fat_percentage
        }
      } else {
        console.log('[ReportActions] No entries in current program, using profile data:', updatedUserData.current_weight)
      }
    }

    updatedUserData.start_date = today
    updatedUserData = ensureEatingPattern(updatedUserData)!
    console.log('[ReportActions] Using updated user data for report:', updatedUserData)

    // Get calculation
    let calculationToUse: CalculationResult
    try {
      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: { status: 'Requesting progression calculation from backend...', entryDate: entryDateForStatus },
      })

      console.log('[ReportActions] Calling fetchCalculation for report...')
      const result = await fetchCalculation(updatedUserData)

      console.log('[ReportActions] Calculation received for report generation')
      saveCalculationResult(result)
      dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })
      calculationToUse = result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate progression for report'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: { status: `Failed while calculating progression: ${errorMessage}`, entryDate: entryDateForStatus },
      })
      return
    }

    if (!calculationToUse) {
      const message = 'Unable to generate calculation for report'
      dispatch({ type: 'SET_ERROR', payload: message })
      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: { status: `Failed before report request: ${message}`, entryDate: entryDateForStatus },
      })
      return
    }

    const now = new Date()
    const reportNumber = reports.length + 1
    const report: Report = {
      id: generateId(),
      user_id: updatedUserData.name,
      title: `Progress Report #${reportNumber} - ${now.toLocaleDateString()}`,
      generated_at: now,
      entry_date: entryDateForStatus, // Store which entry was used for this report
      calculation_result: calculationToUse,
      html_content: "",
    }

    dispatch({
      type: 'SET_REPORT_GENERATION_STATUS',
      payload: { status: 'Requesting detailed report from Python service...', entryDate: entryDateForStatus },
    })

    // Complete user data for Python API
    // Safely calculate DOB from age, defaulting to 30 years old if age is invalid
    const safeAge = typeof updatedUserData.age === 'number' && !isNaN(updatedUserData.age) ? updatedUserData.age : 30
    const dobDate = new Date(Date.now() - (safeAge * 365.25 * 24 * 60 * 60 * 1000))
    const safeDob = !isNaN(dobDate.getTime()) ? dobDate.toISOString().split('T')[0] : '1994-01-01'

    const nowDate = new Date()
    const safeStartDate = nowDate.toISOString().split('T')[0]
    const endDate = new Date(Date.now() + (16 * 7 * 24 * 60 * 60 * 1000))
    const safeEndDate = !isNaN(endDate.getTime()) ? endDate.toISOString().split('T')[0] : safeStartDate

    const completeUserData = {
      ...updatedUserData,
      gender: updatedUserData.gender || 'm',
      height_feet: updatedUserData.height_feet || 5,
      height_inches: updatedUserData.height_inches || 10,
      height_cm: updatedUserData.height_cm || 177.8,
      dob: updatedUserData.dob || safeDob,
      start_date: updatedUserData.start_date || safeStartDate,
      end_date: updatedUserData.end_date || safeEndDate,
      activity_level: updatedUserData.activity_level ?? 2,
      resistance_training: updatedUserData.resistance_training ?? true,
      is_athlete: updatedUserData.is_athlete ?? false,
      workout_type: updatedUserData.workout_type || 'General Fitness',
      workout_days: updatedUserData.workout_days ?? 3,
      job_activity: updatedUserData.job_activity ?? 2,
      leisure_activity: updatedUserData.leisure_activity ?? 2,
      protein_intake: updatedUserData.protein_intake ?? Math.round(updatedUserData.current_weight * 0.8),
      diet_type: updatedUserData.diet_type || 'balanced',
      ped_use: updatedUserData.ped_use ?? false,
      exercise_type: updatedUserData.exercise_type || 'resistance',
      sleep_quality: updatedUserData.sleep_quality || 'good',
      timeline_weeks: typeof updatedUserData.timeline_weeks === 'string' ? parseInt(updatedUserData.timeline_weeks) : updatedUserData.timeline_weeks || 16
    }

    console.log('[ReportActions] Requesting Python-generated report...')
    const generatedReportData = await Promise.race([
      fetchGeneratedReport(completeUserData),
      timeoutPromise
    ]) as {
      html_content: string
      markdown_path?: string
      pdf_path?: string
      html_path?: string
      file_base?: string
    }

    console.log('[ReportActions] Report data received from Python service')

    const deriveFileBase = (data: { file_base?: string; pdf_path?: string }): string | undefined => {
      if (data.file_base) return data.file_base
      if (data.pdf_path) {
        const filename = data.pdf_path.split('/').pop()
        if (filename) return filename.replace(/\.[^/.]+$/, "")
      }
      return undefined
    }

    if (!generatedReportData?.html_content) {
      throw new Error('Report service did not return HTML content')
    }

    report.html_content = generatedReportData.html_content
    const fileBase = deriveFileBase(generatedReportData)
    report.file_base = fileBase
    report.file_path = generatedReportData.pdf_path
    report.pdf_path = generatedReportData.pdf_path
    report.markdown_path = generatedReportData.markdown_path
    report.html_path = generatedReportData.html_path

    const persistedReport = await saveReport(report)

    console.log('[ReportActions] Report saved successfully with id:', persistedReport.id)
    dispatch({ type: 'ADD_REPORT', payload: persistedReport })
    announceSuccess('Report generated successfully.')
    dispatch({
      type: 'SET_REPORT_GENERATION_STATUS',
      payload: { status: 'Report generated and saved successfully.', entryDate: entryDateForStatus },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report'
    console.error('[ReportActions] Report generation failed:', errorMessage)
    dispatch({ type: 'SET_ERROR', payload: errorMessage })
    announceError(errorMessage)
    dispatch({
      type: 'SET_REPORT_GENERATION_STATUS',
      payload: { status: `Report generation failed: ${errorMessage}`, entryDate: entryDateForStatus },
    })
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false })
  }
}

/**
 * Generate HTML report content (fallback for local reports)
 */
export function generateReportHTML(calculation: CalculationResult): string {
  const { progression, confidence_score, ai_analysis } = calculation

  return `
    <div class="report-container">
      <h1>Body Fat Progress Report</h1>
      <h2>User: ${calculation.user_data?.name || 'User'}</h2>

      <section class="summary">
        <h3>Summary</h3>
        <ul>
          <li>Total Weight Loss: ${calculation.summary?.total_weight_loss?.toFixed(1) || 'N/A'} lbs</li>
          <li>Body Fat Reduction: ${calculation.summary?.body_fat_reduction?.toFixed(1) || 'N/A'}%</li>
          <li>Muscle Gain: ${calculation.summary?.muscle_gain?.toFixed(1) || 'N/A'} lbs</li>
          <li>Timeline: ${calculation.summary?.timeline_weeks || 'N/A'} weeks</li>
        </ul>
      </section>

      ${confidence_score ? `
        <section class="confidence">
          <h3>AI Confidence Score: ${confidence_score}/100</h3>
          ${ai_analysis ? `<p>${ai_analysis}</p>` : ''}
        </section>
      ` : ''}

      <section class="progression">
        <h3>Weekly Progression</h3>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Weight (lbs)</th>
              <th>Body Fat %</th>
              <th>Daily Calories</th>
            </tr>
          </thead>
          <tbody>
            ${progression.map((week, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${week.weight.toFixed(1)}</td>
                <td>${week.body_fat_percentage.toFixed(1)}</td>
                <td>${Math.round(week.daily_calorie_intake)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `
}
