import { NextRequest, NextResponse } from 'next/server'
import { AISettings } from '@/types/ai'
import fs from 'fs/promises'
import path from 'path'
import { DATA_DIR } from '@/lib/constants'

// Store settings in the data directory for Docker persistence
const SETTINGS_FILE = path.join(DATA_DIR, 'ai-settings.json')

export async function GET(request: NextRequest) {
  try {
    // Try to read settings from file
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
      const settings = JSON.parse(data)
      // Return the settings directly (not wrapped in success/settings)
      return NextResponse.json(settings)
    } catch (error) {
      // File doesn't exist, return null
      return NextResponse.json(null)
    }
  } catch (error) {
    console.error('Error reading AI settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to read settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: AISettings = await request.json()
    
    // Save settings to file
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving AI settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Delete settings file
    try {
      await fs.unlink(SETTINGS_FILE)
    } catch (error) {
      // File doesn't exist, that's ok
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AI settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete settings' },
      { status: 500 }
    )
  }
}