import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Report } from '@/types'

const DATA_FILE = path.join(process.cwd(), 'data', 'apexfit-data.json')

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const report: Report = await request.json()
    
    // Read existing data
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8')
    const data = JSON.parse(fileContent)
    
    // Add or update report
    if (!data.reports) {
      data.reports = []
    }
    
    // Check if report already exists
    const existingIndex = data.reports.findIndex((r: Report) => r.id === report.id)
    if (existingIndex >= 0) {
      data.reports[existingIndex] = report
    } else {
      data.reports.unshift(report) // Add to beginning
    }
    
    // Sort reports by date (newest first)
    data.reports.sort((a: Report, b: Report) => 
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    )
    
    // Save back to file
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
    
    return NextResponse.json(report, { headers: corsHeaders })
  } catch (error) {
    console.error('Error saving report:', error)
    return NextResponse.json(
      { error: 'Failed to save report' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const reportId = url.pathname.split('/').pop()
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    // Read existing data
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8')
    const data = JSON.parse(fileContent)
    
    // Remove report
    if (data.reports) {
      data.reports = data.reports.filter((r: Report) => r.id !== reportId)
    }
    
    // Save back to file
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
    
    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500, headers: corsHeaders }
    )
  }
}