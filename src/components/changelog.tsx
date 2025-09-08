"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { History, CheckCircle, Wrench, Bug, Sparkles } from "lucide-react"

interface ChangelogEntry {
  version: string
  date: string
  type: "feature" | "fix" | "improvement" | "breaking"
  changes: string[]
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "2025-07-22",
    type: "improvement",
    changes: [
      "Implemented comprehensive dashboard widget refresh system with subscription pattern",
      "Enhanced recomposition roadmap with improved date calculations and progress tracking",
      "Fixed profile management button labels to show contextually appropriate text",
      "Updated progress charts with automatic data refresh capabilities",
      "Resolved settings module component dependencies and import issues",
      "Enhanced theme persistence with dual localStorage and server storage",
      "Verified comprehensive AI chat functionality with 12+ provider support",
      "Completed sidebar navigation with all required features (Changelog, AI Settings, Report Generation)",
      "Added comprehensive widget refresh event system across all dashboard components",
      "Improved calorie management and metabolic insights widgets with real-time updates"
    ]
  },
  {
    version: "1.2.0",
    date: "2025-07-07",
    type: "fix",
    changes: [
      "Fixed AI settings not being sent with API requests",
      "Fixed Python API connection for report generation",
      "Fixed update profile to show existing user data",
      "Fixed missing entry history display",
      "Added changelog visibility in sidebar"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-07-06",
    type: "feature",
    changes: [
      "Added AI provider configuration with 12+ providers",
      "Implemented AI chat widget with live responses",
      "Added AI insights panel with personalized recommendations",
      "Integrated multiple AI models including Claude, GPT-4, Gemini",
      "Added fallback support for AI features"
    ]
  },
  {
    version: "1.0.0",
    date: "2025-07-01",
    type: "feature",
    changes: [
      "Initial release of Ap³𝘹Fit.ai Alpha",
      "Body fat tracking and progress monitoring",
      "PRIME calculation algorithm integration",
      "Report generation with AI analysis",
      "Progress charts and visualizations",
      "Entry management system"
    ]
  }
]

export function ChangelogDialog() {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <Sparkles className="h-4 w-4" />
      case "fix":
        return <Bug className="h-4 w-4" />
      case "improvement":
        return <Wrench className="h-4 w-4" />
      case "breaking":
        return <History className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "feature":
        return "default"
      case "fix":
        return "destructive"
      case "improvement":
        return "secondary"
      case "breaking":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <History className="mr-2 h-4 w-4" />
          Changelog
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Changelog</DialogTitle>
          <DialogDescription>
            Track updates and improvements to Ap³𝘅Fit.ai
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {changelog.map((entry, index) => (
              <div key={entry.version}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(entry.type)}
                    <h3 className="text-lg font-semibold">Version {entry.version}</h3>
                    <Badge variant={getTypeBadgeVariant(entry.type)}>
                      {entry.type}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {change}
                    </li>
                  ))}
                </ul>
                {index < changelog.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}