import type { Metadata } from "next"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { History, CheckCircle, Wrench, Bug, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface ChangelogEntry {
  version: string
  date: string
  type: "feature" | "fix" | "improvement" | "breaking"
  changes: string[]
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.6.0",
    date: "2026-01-07",
    type: "improvement",
    changes: [
      "Production-Ready Overhaul: Reduced app-context.tsx from 867 to 270 lines via modular action extraction",
      "Production-Ready Overhaul: Split dashboard.tsx (660 lines) into modular component structure",
      "Performance: Implemented lazy loading for jsPDF and html2canvas (~350KB bundle reduction)",
      "Performance: Fixed N+1 Redis queries using pipeline batching (13+ calls reduced to 2)",
      "Performance: Added parallel chart generation in PRIME using ThreadPoolExecutor",
      "Reliability: Created resilient-fetch.ts with exponential backoff and circuit breaker pattern",
      "Security: Fixed CORS configuration to use environment-based allowed origins",
      "Infrastructure: Created centralized config.ts for environment variables",
      "Infrastructure: Added data backup system (backup_system.py) for zero data loss guarantee",
      "Cleanup: Removed unused Python dependencies (redis, aioredis, psutil)"
    ]
  },
  {
    version: "1.5.0",
    date: "2025-11-16",
    type: "fix",
    changes: [
      "Fixed report generation flow by removing blocking useMountedRef guards",
      "Added comprehensive status tracking for report generation with live updates",
      "Implemented Turndown library for proper HTML-to-Markdown conversion in downloads",
      "Unified PDF generation to use Python HTML source for consistent quality",
      "Fixed profile banner display with object-cover CSS for proper image fill",
      "Added profile banner sizing guidance tooltip (recommended 1500x400px)",
      "Completed Task 19: Verified lifecycle guards already implemented in chart components",
      "Added 'Coming Soon' section in Settings with MyFitnessPal integration roadmap",
      "Enhanced download buttons to produce consistent output across HTML, MD, and PDF formats",
      "Added report diagnostics widget showing generation status and entry date used",
      "Updated OpenSpec documentation with recent fixes and technical architecture",
      "Created comprehensive MyFitnessPal integration analysis document"
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
      "Initial release of Ap³𝘅Fit.ai Alpha",
      "Body fat tracking and progress monitoring",
      "PRIME calculation algorithm integration",
      "Report generation with AI analysis",
      "Progress charts and visualizations",
      "Entry management system"
    ]
  }
]

export const metadata: Metadata = {
  title: "Changelog | ApexFit AI",
  description: "Follow every Ap³𝘅Fit.ai release with detailed notes on new features, fixes, and improvements.",
  openGraph: {
    title: "ApexFit AI Changelog",
    description: "View the latest features, fixes, and improvements shipped to Ap³𝘅Fit.ai.",
    url: "https://apexfit.ai/changelog",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ApexFit AI Changelog",
    description: "Stay informed about the newest features and improvements in Ap³𝘅Fit.ai."
  }
}

export default function ChangelogPage() {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <Sparkles className="h-5 w-5" aria-hidden="true" />
      case "fix":
        return <Bug className="h-5 w-5" aria-hidden="true" />
      case "improvement":
        return <Wrench className="h-5 w-5" aria-hidden="true" />
      case "breaking":
        return <History className="h-5 w-5" aria-hidden="true" />
      default:
        return <CheckCircle className="h-5 w-5" aria-hidden="true" />
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
    <main
      className="container max-w-4xl mx-auto space-y-8 p-6"
      role="main"
      aria-labelledby="changelog-heading"
      aria-describedby="changelog-description"
    >
      <div className="space-y-2">
        <h1 id="changelog-heading" className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8" aria-hidden="true" />
          Changelog
        </h1>
        <p id="changelog-description" className="text-muted-foreground text-lg">
          Track updates, improvements, and fixes to Ap³𝘅Fit.ai
        </p>
        <Separator className="max-w-xl" aria-hidden="true" />
      </div>

      <section role="feed" aria-labelledby="changelog-heading" aria-live="polite">
        {changelog.map((entry) => (
          <article
            key={entry.version}
            role="article"
            aria-labelledby={`changelog-${entry.version}`}
            className="mb-6"
          >
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-full shadow-sm" aria-hidden="true">
                      {getTypeIcon(entry.type)}
                    </div>
                    <div>
                      <CardTitle id={`changelog-${entry.version}`} className="text-xl">
                        Version {entry.version}
                      </CardTitle>
                      <CardDescription>Released on {entry.date}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={getTypeBadgeVariant(entry.type) as any}
                    className="text-sm px-3 py-1 capitalize"
                    aria-label={`Change type: ${entry.type}`}
                  >
                    {entry.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3" aria-label={`Changes included in version ${entry.version}`}>
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                      <span className="leading-relaxed">{change}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </article>
        ))}
      </section>
    </main>
  )
}
