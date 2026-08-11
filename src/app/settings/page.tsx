"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeighInScheduleCard } from "@/components/cycle/weighin-schedule-card"
import { WeighInWebhookCard } from "@/components/cycle/weighin-webhook-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Settings, Download, Trash2, Save, User, Globe, Bell, Shield, AlertCircle, CheckCircle, Brain, Sparkles, Calendar, Apple, Database, Palette } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import { useApp } from "@/contexts/app-context"
import { useTheme } from "@/contexts/theme-context"
import { ProfileHeader } from "@/components/profile/profile-header"
import { FontSelector } from "@/components/settings/font-selector"
import { SyncStatus } from "@/components/settings/sync-status"
import { useRouter } from "next/navigation"
import { withBasePath } from "@/lib/api-path"
import { DEFAULT_PALETTE, PALETTE_OPTIONS, type PaletteId } from "@/lib/palettes"
import type { CloudSyncStatus } from "@/lib/cloud-sync"
import { WorkspacePageHeader } from "@/components/layout/workspace-page-header"

interface UserSettings {
  units: "imperial" | "metric"
  notifications: {
    weeklyReports: boolean
    goalReminders: boolean
    entryReminders: boolean
  }
  privacy: {
    dataSharing: boolean
    analyticsTracking: boolean
  }
  display: {
    theme: "light" | "dark" | "system"
    palette: PaletteId
    dateFormat: "US" | "EU" | "ISO"
    font: string
  }
}

export default function SettingsPage() {
  const { state, setUserData, clearAllData } = useApp()
  const { current_user, entries, reports } = state
  const { theme, setTheme, palette, setPalette, font, setFont } = useTheme()
  const router = useRouter()

  const formattedHeight = React.useMemo(() => {
    if (!current_user) return "Not set"

    const feet = current_user.height_feet
    const inches = current_user.height_inches
    const feetDisplay = feet != null && inches != null ? `${feet}'${inches}"` : "N/A"

    const cm = current_user.height_cm
    const cmDisplay = typeof cm === "number" ? `${cm.toFixed(1)} cm` : "N/A"

    if (feetDisplay === "N/A" && cmDisplay === "N/A") {
      return "Not set"
    }

    return `${feetDisplay} (${cmDisplay})`
  }, [current_user])

  const [settings, setSettings] = useState<UserSettings>({
    units: "imperial",
    notifications: {
      weeklyReports: true,
      goalReminders: true,
      entryReminders: false
    },
    privacy: {
      dataSharing: false,
      analyticsTracking: true
    },
    display: {
      theme: "system",
      palette: DEFAULT_PALETTE,
      dateFormat: "US",
      font: "roboto"
    }
  })

  const [profileData, setProfileData] = useState({
    name: current_user?.name || "",
    email: "",
    timezone: "America/New_York"
  })

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus | null>(null)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings))
      localStorage.setItem('profileData', JSON.stringify(profileData))
      // Apply theme change
      if (settings.display.theme !== theme) {
        setTheme(settings.display.theme)
      }
      if (settings.display.palette !== palette) {
        setPalette(settings.display.palette)
      }
      // Apply font change
      if (settings.display.font !== font) {
        setFont(settings.display.font)
      }
      setSaved(true)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError("Failed to save settings")
    }
  }

  const handleExportData = () => {
    const exportData = {
      user: current_user,
      entries: entries,
      reports: reports,
      settings: settings,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `body-fat-tracker-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearAllData = async () => {
    try {
      await clearAllData()
      // Clear AI settings from server
      await fetch(withBasePath('/api/ai/settings'), { method: 'DELETE' })
      // Clear all localStorage items
      localStorage.removeItem('userSettings')
      localStorage.removeItem('profileData')
      localStorage.removeItem('ai_settings')
      window.location.href = '/'
    } catch (err) {
      setError("Failed to clear data")
    }
  }

  const handleStartNewProgram = async () => {
    if (!current_user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const updatedUser = {
        ...current_user,
        start_date: today,
        program_reference: {
          start_date: today,
          initial_weight: current_user.current_weight,
          initial_bf: current_user.current_bf
        }
      }

      setUserData(updatedUser)

      // Force save to localStorage immediately to ensure persistence
      localStorage.setItem('bodyfat_user_data', JSON.stringify(updatedUser))

      // Also update via API if possible (though setUserData usually handles this via context)
      try {
        await fetch('/api/data/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser)
        })
      } catch (e) {
        console.warn('Failed to sync new program to API', e)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      // Redirect to dashboard to see changes
      router.push('/')
    } catch (err) {
      setError("Failed to start new program")
    }
  }

  const getDataSize = () => {
    const dataStr = JSON.stringify({ current_user, entries, reports })
    return (new Blob([dataStr]).size / 1024).toFixed(2) + ' KB'
  }

  React.useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('userSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        // Deep-merge onto defaults so older/partial stored shapes (e.g. missing
        // `notifications`) never drop required keys and crash the render.
        setSettings(prev => ({
          ...prev,
          ...parsed,
          notifications: { ...prev.notifications, ...(parsed?.notifications ?? {}) },
          privacy: { ...prev.privacy, ...(parsed?.privacy ?? {}) },
          display: {
            ...prev.display,
            ...(parsed?.display ?? {}),
            // Live theme context wins over whatever was persisted.
            theme,
            palette,
          },
        }))
      } else {
        // Initialize with current theme and font
        setSettings(prev => ({
          ...prev,
          display: { ...prev.display, theme, palette, font }
        }))
      }

      const savedProfile = localStorage.getItem('profileData')
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile))
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [theme, palette, font])

  React.useEffect(() => {
    fetch(withBasePath('/api/sync/status'))
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => payload && setCloudStatus(payload))
      .catch(() => undefined)
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:px-8">
      <WorkspacePageHeader
        eyebrow="Control room"
        title="Make Apex Fit work your way."
        description="Manage appearance, profile data, check-ins, AI providers, privacy, backups, and feature readiness from one durable settings workspace."
        icon={Settings}
        actions={
          <>
          {saved && (
            <Badge variant="default">
              <CheckCircle className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
          <Button variant="default" onClick={handleSaveSettings}>
            <ClientIcon icon={Save} className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="preferences" orientation="vertical" className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <TabsList className="h-auto w-full flex-col items-stretch justify-start gap-1 bg-muted/45 p-2 lg:sticky lg:top-24 [&_[role=tab]]:w-full [&_[role=tab]]:justify-start">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="coming-soon">Feature Lab</TabsTrigger>
        </TabsList>

        <div className="min-w-0">

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={Globe} className="h-5 w-5" />
                Display Preferences
              </CardTitle>
              <CardDescription>Customize how data is displayed in the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="units">Unit System</Label>
                  <Select value={settings.units} onValueChange={(value) => setSettings(prev => ({ ...prev, units: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imperial">Imperial (lbs, inches)</SelectItem>
                      <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="theme">Theme Preference</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, display: { ...prev.display, theme: 'light' } }))}
                      className={`p-3 border-2 rounded-lg transition-all ${settings.display.theme === 'light'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="space-y-2">
                        <div className="grid h-6 w-full grid-cols-[2fr_1fr] overflow-hidden rounded border" aria-hidden="true">
                          <span className="bg-slate-50" /><span className="bg-slate-200" />
                        </div>
                        <div className="text-xs font-medium">Light</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, display: { ...prev.display, theme: 'dark' } }))}
                      className={`p-3 border-2 rounded-lg transition-all ${settings.display.theme === 'dark'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="space-y-2">
                        <div className="grid h-6 w-full grid-cols-[2fr_1fr] overflow-hidden rounded border" aria-hidden="true">
                          <span className="bg-slate-900" /><span className="bg-slate-700" />
                        </div>
                        <div className="text-xs font-medium">Dark</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, display: { ...prev.display, theme: 'system' } }))}
                      className={`p-3 border-2 rounded-lg transition-all ${settings.display.theme === 'system'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="space-y-2">
                        <div className="grid h-6 w-full grid-cols-3 overflow-hidden rounded border" aria-hidden="true">
                          <span className="bg-slate-100" /><span className="bg-slate-400" /><span className="bg-slate-900" />
                        </div>
                        <div className="text-xs font-medium">System</div>
                      </div>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose brightness independently. System follows your device setting.
                  </p>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <ClientIcon icon={Palette} className="h-4 w-4 text-primary" />
                    <Label>Color palette</Label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Color palette">
                    {PALETTE_OPTIONS.map((option) => {
                      const selected = settings.display.palette === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          data-testid={`palette-${option.id}`}
                          onClick={() => {
                            setSettings(prev => ({ ...prev, display: { ...prev.display, palette: option.id } }))
                            setPalette(option.id)
                          }}
                          className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/60'}`}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold">{option.name}</span>
                            {option.recommended && <Badge variant="secondary" className="text-[10px]">Recommended</Badge>}
                          </span>
                          <span className="mt-2 grid h-7 grid-cols-4 overflow-hidden rounded-md border border-black/10" aria-hidden="true">
                            {option.swatches.map((swatch) => <span key={swatch} style={{ backgroundColor: swatch }} />)}
                          </span>
                          <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Palette changes preview immediately and remain available in Light, Dark, and System modes.</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <FontSelector
                    value={settings.display.font}
                    onChange={(font) => setSettings(prev => ({
                      ...prev,
                      display: { ...prev.display, font }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select value={settings.display.dateFormat} onValueChange={(value) => setSettings(prev => ({ ...prev, display: { ...prev.display, dateFormat: value as any } }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">MM/DD/YYYY (US)</SelectItem>
                      <SelectItem value="EU">DD/MM/YYYY (EU)</SelectItem>
                      <SelectItem value="ISO">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <ProfileHeader className="mb-6" showEditButtons={true} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={User} className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={profileData.timezone} onValueChange={(value) => setProfileData(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {current_user && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Current Profile Summary</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Age:</span>
                      <span>{current_user.age} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gender:</span>
                      <span>{current_user.gender === 'm' ? 'Male' : 'Female'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height:</span>
                      <span>{formattedHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Starting Weight:</span>
                      <span>{current_user.current_weight} lbs</span>
                    </div>
                  </div>
                  <Button variant="secondary" className="mt-3" onClick={() => window.location.href = '/setup/custom'}>
                    Update Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={Bell} className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose what notifications you'd like to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> These are preference settings only. This application currently runs entirely locally in your browser and does not send actual notifications or emails. Enable these settings to indicate your preferences for future features.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base">Weekly Progress Reports</div>
                    <div className="text-sm text-muted-foreground">
                      Receive weekly summaries of your progress
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReports}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, weeklyReports: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base">Goal Reminders</div>
                    <div className="text-sm text-muted-foreground">
                      Get reminded when you're close to achieving goals
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.goalReminders}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, goalReminders: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base">Entry Reminders</div>
                    <div className="text-sm text-muted-foreground">
                      Daily reminders to log your progress
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.entryReminders}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, entryReminders: checked }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={Shield} className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>Control how your data is used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Current Status:</strong> This application operates entirely locally in your browser. No data is currently sent to external servers. These settings control your preferences for potential future features that may involve data sharing.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base">Data Sharing</div>
                    <div className="text-sm text-muted-foreground">
                      Allow anonymous data sharing for research (all personal info removed)
                    </div>
                  </div>
                  <Switch
                    checked={settings.privacy.dataSharing}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, dataSharing: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base">Analytics Tracking</div>
                    <div className="text-sm text-muted-foreground">
                      Help improve the app by sharing usage analytics
                    </div>
                  </div>
                  <Switch
                    checked={settings.privacy.analyticsTracking}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, analyticsTracking: checked }
                    }))}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Data Storage</h4>
                <p className="text-sm text-muted-foreground">
                  All your data is stored locally in your browser. No personal information is sent to external servers without your explicit consent.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <SyncStatus />

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export, backup, or clear your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Data Summary</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Entries:</span>
                      <span>{entries.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reports:</span>
                      <span>{reports.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Size:</span>
                      <span>{getDataSize()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Account Created:</span>
                      <span>{current_user ? 'Active' : 'Not Set'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button onClick={handleExportData} className="w-full" variant="secondary">
                    <ClientIcon icon={Download} className="mr-2 h-4 w-4" />
                    Export All Data
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="default" className="w-full">
                        <ClientIcon icon={Sparkles} className="mr-2 h-4 w-4" />
                        Start New Program
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Start New Program</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset your program start date and initial stats to today's values.
                          Your existing entries and reports will be preserved as history.
                          This allows you to track a new transformation phase without losing your data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStartNewProgram}>
                          Start New Program
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <ClientIcon icon={Trash2} className="mr-2 h-4 w-4" />
                        Clear All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your data including profile, entries, reports, and settings.
                          This action cannot be undone. Consider exporting your data first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={Brain} className="h-5 w-5" />
                AI Settings
              </CardTitle>
              <CardDescription>Configure AI providers and model assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Manage your AI providers, API keys, and model assignments for different areas of the application.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure AI providers including Anthropic (Claude), OpenAI, Google Gemini, and more. Assign specific models to different areas of the app for optimized performance.
                </p>

                <Button
                  variant="secondary"
                  onClick={() => router.push('/settings/ai')}
                  className="w-full md:w-auto"
                >
                  <ClientIcon icon={Brain} className="mr-2 h-4 w-4" />
                  Open AI Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkins" className="space-y-4">
          <WeighInScheduleCard />
          <WeighInWebhookCard />
        </TabsContent>

        <TabsContent value="coming-soon" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={Sparkles} className="h-5 w-5" />
                Feature Lab
              </CardTitle>
              <CardDescription>What is available now, and what still needs external infrastructure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Managed Postgres + multi-user cloud sync (roadmap) */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ClientIcon icon={Database} className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Managed Postgres + Multi-User Cloud Sync</h3>
                      <Badge variant="outline">
                        {cloudStatus?.phase === 'ready_for_migration' ? 'Migration validation required' : 'Provider setup required'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The application has a single-user local data layer and portable exports today. The
                      managed Postgres migration boundary is documented, but enabling accounts, encrypted
                      remote storage, and coach access requires choosing and configuring a cloud provider.
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                        <span>Cross-device access to entries, reports, and cycles</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                        <span>Multi-user accounts (coach + athlete) on one workspace</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                        <span>Automatic encrypted backups</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant={cloudStatus?.database_configured ? 'secondary' : 'outline'}>Database {cloudStatus?.database_configured ? 'configured' : 'not configured'}</Badge>
                      <Badge variant={cloudStatus?.authentication_configured ? 'secondary' : 'outline'}>Authentication {cloudStatus?.authentication_configured ? 'configured' : 'not configured'}</Badge>
                      <Badge variant={cloudStatus?.sync_enabled ? 'secondary' : 'outline'}>Cloud writes {cloudStatus?.sync_enabled ? 'enabled' : 'disabled'}</Badge>
                    </div>
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="mr-2 h-4 w-4" /> Export a local backup now
                    </Button>
                  </div>
                </div>
              </div>

              {/* MyFitnessPal Integration */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ClientIcon icon={Apple} className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">MyFitnessPal Integration</h3>
                      <Badge variant="secondary">
                        Available now
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Track your actual calorie intake and compare it against your PRIME progression plan target calories.
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                        <span>CSV Import: Upload your MyFitnessPal export data</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                        <span>Manual Entry: Log daily calories directly in the app</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                        <span>Variance Tracking: See daily/weekly differences vs. targets</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                        <span>Dashboard Widget: Visual comparison charts</span>
                      </div>
                    </div>
                    <Button onClick={() => router.push('/nutrition')}>
                      <Apple className="mr-2 h-4 w-4" /> Open nutrition workspace
                    </Button>
                  </div>
                </div>
              </div>

              {/* Additional Future Features */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-accent p-2">
                    <ClientIcon icon={Calendar} className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Progress Photos Timeline</h3>
                      <Badge variant="secondary">
                        Available now
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Track visual progress alongside your metrics with timestamped photos and side-by-side comparisons.
                    </p>
                    <Button variant="outline" onClick={() => router.push('/charts#progress-photos')}>Open photo timeline</Button>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-accent p-2">
                    <ClientIcon icon={Brain} className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Advanced AI Insights</h3>
                      <Badge variant="secondary">
                        Available now
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enhanced AI-powered analysis of your progress patterns, including anomaly detection, personalized recommendations, and predictive success modeling.
                    </p>
                    <Button variant="outline" onClick={() => router.push('/ai/insights')}><Brain className="mr-2 h-4 w-4" /> Open AI Insights</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-center space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">
                  Have a feature request or feedback?
                </p>
                <p className="text-xs text-muted-foreground">
                  Cloud sync remains intentionally gated until a provider, authentication model, retention policy, and migration window are approved.
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
