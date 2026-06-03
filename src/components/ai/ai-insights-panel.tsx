"use client"

import * as React from "react"
import { Brain, TrendingUp, Zap, AlertTriangle, CheckCircle, Lightbulb, X } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useApp } from "@/contexts/app-context"
import { AIService, AIInsight } from "@/lib/ai-service"
import { useAISettings } from "@/hooks/use-ai-settings"

// Module-level constant: a STABLE reference. Previously this default array was
// inlined in the parameter list, so it was recreated on every render -> loadInsights
// (which lists `categories` in its deps) got a new identity each render -> the
// effect depending on loadInsights re-fired -> setState -> render -> repeat. That
// infinite refetch loop is the "flashing" AI Insights screen.
const DEFAULT_CATEGORIES = ['progress', 'nutrition', 'workout', 'goal', 'health']

interface AIInsightsPanelProps {
  title?: string
  showHeader?: boolean
  maxInsights?: number
  categories?: string[]
}

export function AIInsightsPanel({
  title = "AI Insights & Guidance",
  showHeader = true,
  maxInsights = 5,
  categories = DEFAULT_CATEGORIES
}: AIInsightsPanelProps) {
  const { state } = useApp()
  const { current_user, current_calculation, entries, loading } = state
  
  const [insights, setInsights] = React.useState<AIInsight[]>([])
  const [dismissedInsights, setDismissedInsights] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const aiService = AIService.getInstance()
  const { settings: aiSettings, loading: settingsLoading } = useAISettings()
  const inFlightRef = React.useRef(false)

  const loadInsights = React.useCallback(async () => {
    if (!current_user) return

    // Don't try to load insights until settings are ready
    if (settingsLoading) {
      console.log('AI settings still loading, skipping insights generation')
      return
    }
    // Guard against overlapping/looping loads (belt-and-suspenders with stable deps).
    if (inFlightRef.current) return
    inFlightRef.current = true

    setIsLoading(true)
    setError(null)

    try {
      const newInsights = await aiService.generateInsights(
        current_user,
        entries,
        current_calculation || undefined
      )

      // Filter by categories + limit. Dismissals are applied at RENDER time
      // (visibleInsights), NOT here — so dismissing never triggers a reload and
      // dismissedInsights is not a dependency of this callback.
      const filteredInsights = newInsights
        .filter(insight => categories.includes(insight.category))
        .slice(0, maxInsights)

      setInsights(filteredInsights)
    } catch (err) {
      console.error('Error loading AI insights:', err)
      setError('Unable to load AI insights at this time')
    } finally {
      setIsLoading(false)
      inFlightRef.current = false
    }
  }, [current_user, entries, current_calculation, categories, maxInsights, aiService, settingsLoading])
  
  // Force re-render when AI settings are loaded
  React.useEffect(() => {
    const handleSettingsLoaded = () => {
      // Reload insights with new settings
      if (current_user && entries.length > 0) {
        loadInsights()
      }
    }
    
    window.addEventListener('ai-settings-loaded', handleSettingsLoaded)
    return () => window.removeEventListener('ai-settings-loaded', handleSettingsLoaded)
  }, [current_user, entries, loadInsights])

  // Load insights when data changes
  React.useEffect(() => {
    if (current_user && entries.length > 0 && !loading && !settingsLoading) {
      loadInsights()
    }
  }, [current_user, entries, current_calculation, loading, settingsLoading, loadInsights])

  const dismissInsight = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]))
  }

  // Dismissals are applied at render time so they survive reloads and never
  // feed back into loadInsights' dependencies (which would re-loop).
  const visibleInsights = insights.filter(insight => !dismissedInsights.has(insight.id))

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'celebration':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'guidance':
        return <Lightbulb className="h-4 w-4 text-blue-600" />
      case 'motivation':
        return <Zap className="h-4 w-4 text-purple-600" />
      case 'tip':
        return <TrendingUp className="h-4 w-4 text-indigo-600" />
      default:
        return <Brain className="h-4 w-4 text-gray-600" />
    }
  }

  const getInsightVariant = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      progress: 'bg-green-100 text-green-800',
      nutrition: 'bg-orange-100 text-orange-800',
      workout: 'bg-blue-100 text-blue-800',
      goal: 'bg-purple-100 text-purple-800',
      health: 'bg-red-100 text-red-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (!current_user) {
    return null
  }

  if (error) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card role="region" aria-labelledby="ai-insights-title" aria-describedby="ai-insights-description">
      {showHeader && (
        <CardHeader>
          <CardTitle id="ai-insights-title" className="flex items-center gap-2">
            <Brain className="h-5 w-5" aria-hidden="true" />
            {title}
          </CardTitle>
          <CardDescription id="ai-insights-description">
            Personalized guidance based on your progress and data
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <div className="sr-announcer">Loading AI insights...</div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : visibleInsights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No insights available</p>
            <p className="text-sm">Add more entries to receive personalized guidance</p>
          </div>
        ) : (
          <div className="space-y-4" role="feed" aria-live="polite" aria-label="AI insights and recommendations">
            <div className="sr-announcer" aria-live="polite">
              {visibleInsights.length > 0 ? `${visibleInsights.length} AI insights loaded` : ''}
            </div>
            {visibleInsights.map((insight, index) => (
              <div key={insight.id}>
                <article 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  role="article"
                  aria-labelledby={`insight-title-${insight.id}`}
                  aria-describedby={`insight-message-${insight.id}`}
                  tabIndex={0}
                >
                  <div className="mt-0.5" aria-hidden="true">
                    {getInsightIcon(insight.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 
                        id={`insight-title-${insight.id}`}
                        className="text-sm font-medium"
                      >
                        {insight.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getCategoryColor(insight.category)}`}
                          aria-label={`Category: ${insight.category}`}
                        >
                          {insight.category}
                        </Badge>
                        <Badge 
                          variant={getInsightVariant(insight.priority)} 
                          className="text-xs"
                          aria-label={`Priority: ${insight.priority}`}
                        >
                          {insight.priority}
                        </Badge>
                        {insight.dismissible && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => dismissInsight(insight.id)}
                            aria-label={`Dismiss insight: ${insight.title}`}
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <p 
                      id={`insight-message-${insight.id}`}
                      className="text-sm text-muted-foreground"
                    >
                      {insight.message}
                    </p>
                    
                    {insight.actionable && insight.action && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            if (insight.action?.path) {
                              window.location.href = insight.action.path
                            } else if (insight.action?.callback) {
                              insight.action.callback()
                            }
                          }}
                          aria-describedby={`insight-message-${insight.id}`}
                        >
                          {insight.action.label}
                        </Button>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      <time dateTime={insight.timestamp.toISOString()}>
                        Generated at {insight.timestamp.toLocaleTimeString()}
                      </time>
                    </div>
                  </div>
                </article>
                
                {index < visibleInsights.length - 1 && <Separator className="my-2" aria-hidden="true" />}
              </div>
            ))}
            
            {visibleInsights.length > 0 && (
              <div className="text-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadInsights}
                  disabled={isLoading}
                  aria-label="Refresh AI insights to get new recommendations"
                >
                  <Brain className="h-3 w-3 mr-1" aria-hidden="true" />
                  {isLoading ? 'Refreshing...' : 'Refresh Insights'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}