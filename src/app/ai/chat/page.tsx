"use client"

import * as React from "react"
import { Brain, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AIChatWidget } from "@/components/ai/ai-chat-widget"
import { useApp } from "@/contexts/app-context"

export default function AIChatPage() {
  const { state } = useApp()
  const hasProfile = Boolean(state.current_user)

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Coach Chat</h1>
          <p className="text-muted-foreground">
            Ask nutrition, training, or progress questions powered by your saved data.
          </p>
        </div>
      </div>

      {!hasProfile && (
        <Alert>
          <AlertDescription>
            Complete your profile setup to unlock contextual AI coaching and personalized responses.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Conversation
          </CardTitle>
          <CardDescription>
            Your most recent entries and calculations inform every response. API providers are used when available, with smart fallbacks otherwise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIChatWidget defaultExpanded maxHeight="600px" />
        </CardContent>
      </Card>
    </div>
  )
}
