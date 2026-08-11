"use client"

import * as React from "react"
import { Brain, MessageCircle, ShieldCheck, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AIChatWidget } from "@/components/ai/ai-chat-widget"
import { useApp } from "@/contexts/app-context"
import { WorkspacePageHeader } from "@/components/layout/workspace-page-header"

export default function AIChatPage() {
  const { state } = useApp()
  const hasProfile = Boolean(state.current_user)

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:px-8">
      <WorkspacePageHeader
        eyebrow="Coach workspace"
        title="Ask a better question. Get a grounded answer."
        description="Your coach can use your saved profile, PRIME calculations, and recent entries to discuss nutrition, training, recovery, and progress."
        icon={MessageCircle}
      />

      {!hasProfile && (
        <Alert>
          <AlertDescription>
            Complete your profile setup to unlock contextual AI coaching and personalized responses.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <AIChatWidget defaultExpanded maxHeight="600px" />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Context in this chat
              </CardTitle>
              <CardDescription>The coach grounds responses in the records available now.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Profile</span><strong>{hasProfile ? 'Ready' : 'Needed'}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Entries</span><strong>{state.entries.length}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">PRIME plan</span><strong>{state.current_calculation ? 'Available' : 'Not generated'}</strong></div>
            </CardContent>
          </Card>

          <Card className="border-primary/25 bg-accent/45">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Decision support</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Coaching is informational. The 14-day report preserves the selected source protocol separately so chat cannot silently rewrite it.
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
