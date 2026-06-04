import { UserData, BodyFatEntry, Report, CalculationResult } from '@/types'
import { dataSync, initializeDataSync } from './data-sync'

const API_BASE_URL = '/api' // Next.js API routes

// Re-export sync utilities for app initialization
export { dataSync, initializeDataSync } from './data-sync'
export { DataSync } from './data-sync'

// Sync status for UI components
export async function getSyncStatus() {
  return dataSync.getSyncStatus()
}

// Manual sync trigger
export async function syncData() {
  return dataSync.syncFromSQLite()
}

// Helper function for API calls
// Timeout increased to 120s to accommodate PRIME calculation time
async function callApi<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API call to ${endpoint} failed with status ${response.status}`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

// --- User Data ---
// Uses DataSync for write-through caching (Redis cache + SQLite persistence)
export async function getUserData(): Promise<UserData | null> {
  try {
    return await dataSync.getUserData()
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

export async function saveUserData(userData: UserData): Promise<UserData> {
  const result = await dataSync.saveUserData(userData)
  if (!result.success) {
    console.error('saveUserData partial failure:', result.error)
  }
  return userData
}

// --- Entries ---
// Uses DataSync for write-through caching (Redis cache + SQLite persistence)
export async function getEntries(): Promise<BodyFatEntry[]> {
  try {
    return await dataSync.getEntries()
  } catch (error) {
    console.error('Error fetching entries:', error)
    return []
  }
}

export async function saveEntry(entry: BodyFatEntry): Promise<BodyFatEntry> {
  const result = await dataSync.saveEntry(entry)
  if (!result.success) {
    throw new Error(result.error || 'Failed to save entry')
  }
  // F2: return the SERVER-persisted row when available — it carries the
  // canonical cycle_id the repository assigned. The reducer dispatch downstream
  // depends on this so cycle-scoped views see the weigh-in immediately. Fall
  // back to the input only if the server didn't echo a row.
  return result.entry ?? entry
}

export async function deleteEntry(entryId: string): Promise<void> {
  const result = await dataSync.deleteEntry(entryId)
  if (!result.success) {
    console.error('deleteEntry partial failure:', result.error)
  }
}

// --- Reports ---
// Uses DataSync for write-through caching (Redis cache + SQLite persistence)
export async function getReports(): Promise<Report[]> {
  try {
    return await dataSync.getReports()
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}

export async function saveReport(report: Report): Promise<Report> {
  const result = await dataSync.saveReport(report)
  if (!result.success) {
    throw new Error(result.error || 'Failed to save report')
  }
  return report
}

export async function saveReports(reports: Report[]): Promise<Report[]> {
  // Save each report with write-through sync — fail on first error
  for (const report of reports) {
    const result = await dataSync.saveReport(report)
    if (!result.success) {
      throw new Error(result.error || 'Failed to save report')
    }
  }
  return reports
}

export async function deleteReport(reportId: string): Promise<void> {
  return await callApi<void>('/data/reports', 'DELETE', { id: reportId })
}

// --- Calculations ---
export async function getLastCalculationResult(): Promise<CalculationResult | null> {
  try {
    return await callApi<CalculationResult>('/data/calculation')
  } catch (error) {
    console.error('Error fetching last calculation result:', error)
    return null
  }
}

export async function saveCalculationResult(calculation: CalculationResult): Promise<CalculationResult> {
  return await callApi<CalculationResult>('/data/calculation', 'POST', calculation)
}

// --- AI/Calculations (specific endpoints) ---
export async function fetchCalculation(userData: UserData): Promise<CalculationResult> {
  const response = await callApi<{ success: boolean; data: CalculationResult }>('/calculate', 'POST', userData)
  return response.data
}

export async function fetchRecalculation(userData: UserData, newEntry: any): Promise<CalculationResult> {
  return await callApi<CalculationResult>('/calculate/recalculate', 'POST', { userData, newEntry })
}

export async function fetchAIInsights(category: string, data: any): Promise<string[]> {
  return await callApi<string[]>(`/ai/insights/${category}`, 'POST', data)
}

export async function fetchAIChatResponse(messages: { role: string; content: string }[]): Promise<string> {
  return await callApi<string>('/ai/chat', 'POST', { messages })
}

// --- Utility ---
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function clearAllData(): Promise<void> {
  return await callApi<void>('/data/clear', 'POST')
}

export async function migrateFromLocalStorage(): Promise<boolean> {
  // This function would typically read from localStorage and then call save functions
  // For now, it's a placeholder that always returns false if no migration logic is present.
  // In a real scenario, it would check for localStorage data and migrate it to the server.
  console.warn('Migration from localStorage not fully implemented in storage-api.ts')
  return false
}

export async function fetchGeneratedReport(
  userData: UserData
): Promise<{
  html_content: string;
  markdown_path?: string;
  pdf_path?: string;
  html_path?: string;
  file_base?: string;
}> {
  return await callApi<{
    html_content: string;
    markdown_path?: string;
    pdf_path?: string;
    html_path?: string;
    file_base?: string;
  }>('/generate-report', 'POST', userData);
}
