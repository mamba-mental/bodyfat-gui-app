"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"
import { AISettingsService } from "@/lib/ai-settings-service"
import { useRouter } from "next/navigation"

export default function TestFixesPage() {
  const [results, setResults] = useState<Record<string, any>>({})
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    // Test 1: Check localStorage
    const userSettings = localStorage.getItem("userSettings")
    const aiSettings = localStorage.getItem("ai_settings")
    
    // Test 2: Check AI Settings Service
    const aiService = AISettingsService.getInstance()
    const currentSettings = aiService.getSettings()
    
    // Test 3: Check theme
    const currentTheme = document.documentElement.className
    
    setResults({
      userSettings: userSettings ? JSON.parse(userSettings) : null,
      aiSettings: aiSettings ? JSON.parse(aiSettings) : null,
      aiServiceSettings: currentSettings,
      currentTheme: currentTheme,
      themeFromContext: theme
    })
  }, [theme])

  const testAISave = async () => {
    const response = await fetch("/api/ai/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providers: {
          anthropic: {
            apiKey: "test-from-frontend-" + Date.now(),
            enabled: true
          }
        }
      })
    })
    const result = await response.json()
    alert("Save result: " + JSON.stringify(result))
    window.location.reload()
  }

  const testAILoad = async () => {
    const response = await fetch("/api/ai/settings")
    const data = await response.json()
    alert("Load result: " + JSON.stringify(data, null, 2).substring(0, 500))
  }

  const testFullAISave = async () => {
    const fullSettings = {
      providers: {
        anthropic: {
          provider: "anthropic",
          apiKey: "sk-test-" + Date.now(),
          enabled: true,
          models: [
            { id: "claude-3-opus", name: "Claude 3 Opus", available: true },
            { id: "claude-3-sonnet", name: "Claude 3 Sonnet", available: true }
          ]
        },
        openai: {
          provider: "openai",
          apiKey: "sk-openai-test-" + Date.now(),
          enabled: true,
          models: [
            { id: "gpt-4", name: "GPT-4", available: true },
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", available: true }
          ]
        }
      },
      areas: [
        {
          id: "chat_assistant",
          name: "Chat Assistant",
          description: "Interactive AI coach for Q&A",
          fallbackEnabled: true,
          currentProvider: "anthropic",
          currentModel: "claude-3-opus"
        },
        {
          id: "progress_insights",
          name: "Progress Insights",
          description: "Generates personalized progress insights",
          fallbackEnabled: true,
          currentProvider: "openai",
          currentModel: "gpt-4"
        }
      ],
      globalFallbackEnabled: true
    }

    const response = await fetch("/api/ai/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullSettings)
    })
    const result = await response.json()
    
    // Also save to localStorage via AISettingsService
    const aiService = AISettingsService.getInstance()
    aiService.saveSettings(fullSettings as any)
    
    alert("Full save complete! Check AI Settings page now.")
    router.push("/settings/ai")
  }

  return (
    <div className="container max-w-4xl mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold">Fix Verification Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto p-4 bg-muted rounded">
            {JSON.stringify(results, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Current theme: {theme}</p>
          <div className="flex gap-2">
            <Button onClick={() => setTheme("light")}>Light</Button>
            <Button onClick={() => setTheme("dark")}>Dark</Button>
            <Button onClick={() => setTheme("system")}>System</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Settings Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={testAISave}>Test Save AI Settings</Button>
          <Button onClick={testAILoad} variant="outline">Test Load AI Settings</Button>
          <Button onClick={testFullAISave} variant="secondary">Save Full AI Config & Go to Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => router.push("/settings/ai")} variant="outline">
            Go to AI Settings
          </Button>
          <Button onClick={() => router.push("/ai/chat")} variant="outline">
            Go to AI Chat
          </Button>
          <Button onClick={() => router.push("/ai/insights")} variant="outline">
            Go to AI Insights
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}