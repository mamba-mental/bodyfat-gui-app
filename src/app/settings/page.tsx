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
import { Settings, Download, Trash2, Save, User, Globe, Bell, Shield, AlertCircle, CheckCircle, Brain, Sparkles, Calendar, Apple } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import { useApp } from "@/contexts/app-context"
import { useTheme } from "@/contexts/theme-context"
import { ProfileHeader } from "@/components/profile/profile-header"
import { FontSelector } from "@/components/settings/font-selector"
import { SyncStatus } from "@/components/settings/sync-status"
import { useRouter } from "next/navigation"
import { withBasePath } from "@/lib/api-path"

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
    dateFormat: "US" | "EU" | "ISO"
    font: string
  }
}

export default function SettingsPage() {
  const { state, setUserData, clearAllData } = useApp()
  const { current_user, entries, reports } = state
  const { theme, setTheme, font, setFont } = useTheme()
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
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings))
      localStorage.setItem('profileData', JSON.stringify(profileData))
      // Apply theme change
      if (settings.display.theme !== theme) {
        setTheme(settings.display.theme)
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
        setSettings(parsed)
        // Sync theme with current theme context
        if (parsed.display?.theme && parsed.display.theme !== theme) {
          parsed.display.theme = theme
          setSettings(parsed)
        }
      } else {
        // Initialize with current theme and font
        setSettings(prev => ({
          ...prev,
          display: { ...prev.display, theme, font }
        }))
      }

      const savedProfile = localStorage.getItem('profileData')
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile))
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [theme, font])

  return (
    <div className="container max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Customize your application preferences and account settings
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {saved && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
          <Button variant="default" onClick={handleSaveSettings}>
            <ClientIcon icon={Save} className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="coming-soon">Coming Soon</TabsTrigger>
        </TabsList>

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
                        <div className="w-full h-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded border"></div>
                        <div className="text-xs font-medium">☀️ Light</div>
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
                        <div className="w-full h-6 bg-gradient-to-r from-slate-800 to-slate-900 rounded border"></div>
                        <div className="text-xs font-medium">🌙 Dark</div>
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
                        <div className="w-full h-6 bg-gradient-to-r from-slate-100 via-slate-400 to-slate-800 rounded border"></div>
                        <div className="text-xs font-medium">🖥️ System</div>
                      </div>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred color scheme. System matches your device's settings.
                  </p>
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
                      <Button variant="default" className="w-full bg-blue-600 hover:bg-blue-700">
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
                        <AlertDialogAction onClick={handleStartNewProgram} className="bg-blue-600 text-white hover:bg-blue-700">
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

        <TabsContent value="coming-soon" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={Sparkles} className="h-5 w-5" />
                Coming Soon
              </CardTitle>
              <CardDescription>Exciting features we're working on for future releases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* MyFitnessPal Integration */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ClientIcon icon={Apple} className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">MyFitnessPal Integration</h3>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Planned
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Track your actual calorie intake and compare it against your PRIME progression plan target calories.
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>CSV Import: Upload your MyFitnessPal export data</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Manual Entry: Log daily calories directly in the app</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Variance Tracking: See daily/weekly differences vs. targets</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Dashboard Widget: Visual comparison charts</span>
                      </div>
                    </div>
                    <Alert className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Note:</strong> MyFitnessPal discontinued their public API in 2020. We're designing a user-friendly CSV import system and manual entry option to bring this functionality to you.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>

              {/* Additional Future Features */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <ClientIcon icon={Calendar} className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Progress Photos Timeline</h3>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Under Consideration
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Track visual progress alongside your metrics with timestamped photos and side-by-side comparisons.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <ClientIcon icon={Brain} className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Advanced AI Insights</h3>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Research Phase
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enhanced AI-powered analysis of your progress patterns, including anomaly detection, personalized recommendations, and predictive success modeling.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-center space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">
                  Have a feature request or feedback?
                </p>
                <p className="text-xs text-muted-foreground">
                  These features are based on user feedback and development roadmap priorities. Implementation timelines may vary.
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
