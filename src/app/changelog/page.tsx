"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Wrench, Bug, Sparkles, History, Package, Database, Server, GitBranch } from "lucide-react"

interface ChangelogEntry {
  version: string
  date: string
  type: "feature" | "fix" | "improvement" | "breaking" | "deployment"
  changes: string[]
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.5.0",
    date: "2025-11-16",
    type: "fix",
    changes: [
      "Fixed report generation flow - removed blocking useMountedRef guards from critical paths",
      "Added live status tracking for report generation with detailed progress updates",
      "Implemented Turndown library for proper HTML-to-Markdown conversion in report downloads",
      "Unified PDF generation to use Python HTML as single source for consistent output quality",
      "Fixed profile banner display with object-cover CSS for proper image scaling without distortion",
      "Added profile banner upload tooltip with sizing guidance (recommended 1500x400px, max 5MB)",
      "Verified and completed Task 19 - lifecycle guards already properly implemented via useSafeAnimationCallback",
      "Added 'Coming Soon' section in Settings showcasing planned MyFitnessPal integration",
      "Enhanced download buttons - all formats (HTML, MD, PDF) now produce identical, high-quality output",
      "Added report diagnostics widget on Reports page showing generation status and entry date",
      "Updated OpenSpec documentation with comprehensive fix details and flow diagrams",
      "Created detailed MyFitnessPal integration analysis with implementation roadmap",
      "Updated project documentation tracking all recent improvements and learnings"
    ]
  },
  {
    version: "1.4.0",
    date: "2025-09-08",
    type: "deployment",
    changes: [
      "Fixed Docker container deployment with proper data persistence",
      "Resolved volume mount conflicts between apex-fit and bodyfat-gui-app containers",
      "Fixed Python API database integration - now using SQLite instead of broken JSON operations",
      "Corrected database path resolution to /app/data/bodyfat.db",
      "Fixed entry history retrieval - now showing all 12 entries and 32 reports",
      "Changed docker-compose.dev.yml from named volumes to bind mounts for local data access",
      "Temporarily disabled PRIME module exit in main.py for testing",
      "Enabled AI Insights and AI Chats pages (previously disabled)",
      "Converted changelog from popup dialog to dedicated page for better readability",
      "Created GitHub repository and established feature/ui-updates branch",
      "Successfully deployed to Docker with Next.js (port 7899), Python API (port 8013), and Redis (port 6380)"
    ]
  },
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
      "Resolved TypeScript errors in data deletion confirmation dialogs",
      "Enhanced BodyFatDataDisplay with proper metrics calculations",
      "Implemented dark mode theme persistence",
      "Fixed ModeToggle component functionality"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-07-05",
    type: "feature",
    changes: [
      "Added comprehensive AI provider configuration",
      "Implemented report generation with multiple AI models",
      "Added body fat calculation methods (Navy, BMI, 3-site, 7-site)",
      "Created entry history management system",
      "Implemented progress tracking charts",
      "Added calorie calculator with metabolic insights"
    ]
  },
  {
    version: "1.0.0",
    date: "2025-06-29",
    type: "feature",
    changes: [
      "Initial release of Body Fat GUI Application",
      "Profile management system",
      "Dashboard with real-time widgets",
      "Data persistence with SQLite database",
      "Responsive design with Tailwind CSS",
      "Dark/Light theme support"
    ]
  }
]

const getTypeIcon = (type: ChangelogEntry["type"]) => {
  switch (type) {
    case "feature":
      return <Sparkles className="h-4 w-4" />
    case "fix":
      return <Bug className="h-4 w-4" />
    case "improvement":
      return <Wrench className="h-4 w-4" />
    case "deployment":
      return <Server className="h-4 w-4" />
    case "breaking":
      return <Package className="h-4 w-4" />
    default:
      return <CheckCircle className="h-4 w-4" />
  }
}

const getTypeBadgeVariant = (type: ChangelogEntry["type"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case "feature":
      return "default"
    case "fix":
      return "secondary"
    case "improvement":
      return "outline"
    case "deployment":
      return "default"
    case "breaking":
      return "destructive"
    default:
      return "outline"
  }
}

export default function ChangelogPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8" />
          Changelog
        </h1>
        <p className="text-muted-foreground mt-2">
          Track all updates, improvements, and fixes to the Body Fat Estimator application
        </p>
      </div>

      <div className="space-y-6">
        {changelog.map((entry, index) => (
          <Card key={entry.version} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">Version {entry.version}</CardTitle>
                  <Badge variant={getTypeBadgeVariant(entry.type)} className="flex items-center gap-1">
                    {getTypeIcon(entry.type)}
                    {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">{entry.date}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {entry.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{change}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            {index < changelog.length - 1 && <Separator className="mt-4" />}
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Body Fat Estimator &copy; 2025</p>
        <p>Continuously improving your fitness tracking experience</p>
      </div>
    </div>
  )
}