// Local storage utilities for persisting user data and entries

import { UserData, BodyFatEntry, Report, CalculationResult } from '@/types'

const STORAGE_KEYS = {
  USER_DATA: 'bodyfat_tracker_user_data',
  ENTRIES: 'bodyfat_tracker_entries',
  REPORTS: 'bodyfat_tracker_reports',
  LAST_CALCULATION: 'bodyfat_tracker_last_calculation',
} as const

// User Data Management
export function saveUserData(userData: UserData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData))
  }
}

export function getUserData(): UserData | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    return stored ? JSON.parse(stored) : null
  }
  return null
}

export function clearUserData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA)
  }
}

// Entries Management
export function saveEntry(entry: BodyFatEntry): void {
  if (typeof window !== 'undefined') {
    const entries = getEntries()
    const updatedEntries = [...entries.filter(e => e.id !== entry.id), entry]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries))
  }
}

export function getEntries(): BodyFatEntry[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES)
    return stored ? JSON.parse(stored) : []
  }
  return []
}

export function deleteEntry(entryId: string): void {
  if (typeof window !== 'undefined') {
    const entries = getEntries()
    const filteredEntries = entries.filter(e => e.id !== entryId)
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(filteredEntries))
  }
}

export function getEntry(entryId: string): BodyFatEntry | null {
  const entries = getEntries()
  return entries.find(e => e.id === entryId) || null
}

// Reports Management
export function saveReport(report: Report): void {
  if (typeof window !== 'undefined') {
    const reports = getReports()
    const updatedReports = [...reports.filter(r => r.id !== report.id), report]
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updatedReports))
  }
}

export function getReports(): Report[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.REPORTS)
    return stored ? JSON.parse(stored) : []
  }
  return []
}

export function getReport(reportId: string): Report | null {
  const reports = getReports()
  return reports.find(r => r.id === reportId) || null
}

export function saveReports(reports: Report[]): void {
  if (typeof window !== 'undefined') {
    const sortedReports = reports.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(sortedReports))
  }
}

export function deleteReport(reportId: string): void {
  if (typeof window !== 'undefined') {
    const reports = getReports()
    const filteredReports = reports.filter(r => r.id !== reportId)
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filteredReports))
  }
}

// Calculation Results
export function saveCalculationResult(result: CalculationResult): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.LAST_CALCULATION, JSON.stringify(result))
  }
}

export function getLastCalculationResult(): CalculationResult | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_CALCULATION)
    return stored ? JSON.parse(stored) : null
  }
  return null
}

// Utility functions
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function exportAllData(): {
  userData: UserData | null
  entries: BodyFatEntry[]
  reports: Report[]
  lastCalculation: CalculationResult | null
} {
  return {
    userData: getUserData(),
    entries: getEntries(),
    reports: getReports(),
    lastCalculation: getLastCalculationResult(),
  }
}

export function importAllData(data: {
  userData?: UserData
  entries?: BodyFatEntry[]
  reports?: Report[]
  lastCalculation?: CalculationResult
}): void {
  if (data.userData) saveUserData(data.userData)
  if (data.entries) {
    data.entries.forEach(entry => saveEntry(entry))
  }
  if (data.reports) {
    data.reports.forEach(report => saveReport(report))
  }
  if (data.lastCalculation) saveCalculationResult(data.lastCalculation)
}

export function clearAllData(): void {
  if (typeof window !== 'undefined') {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }
}