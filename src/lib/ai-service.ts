/**
 * AI Service Layer for Body Fat Tracker GUI
 * Provides AI-driven insights, notifications, and personalized guidance
 */

import { UserData, BodyFatEntry, CalculationResult } from '@/types'
import { AISettingsService } from './ai-settings-service'

const API_BASE_URL = '/api'

export interface AIInsight {
  id: string
  type: 'tip' | 'warning' | 'celebration' | 'guidance' | 'motivation'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  actionable: boolean
  action?: {
    label: string
    path?: string
    callback?: () => void
  }
  dismissible: boolean
  timestamp: Date
  category: 'progress' | 'nutrition' | 'workout' | 'goal' | 'health'
}

export interface AIAnalysis {
  progress_analysis: string
  recommendations: string[]
  warnings: string[]
  motivational_message: string
  next_steps: string[]
  confidence_score: number
}

export interface AINotification {
  id: string
  type: 'progress' | 'streak' | 'goal' | 'plateau' | 'concern'
  title: string
  message: string
  timestamp: Date
  read: boolean
  important: boolean
}

export class AIService {
  private static instance: AIService
  private aiSettingsService: AISettingsService
  
  private constructor() {
    this.aiSettingsService = AISettingsService.getInstance()
  }
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  /**
   * Generate AI insights based on user progress and data
   */
  async generateInsights(
    user: UserData,
    entries: BodyFatEntry[],
    calculation?: CalculationResult
  ): Promise<AIInsight[]> {
    // Resolve the configured provider for this area up front so we can tell
    // "no provider assigned" apart from "provider failed". `status` drives the
    // actionable message the user sees instead of a silent blank panel.
    const aiConfig = this.aiSettingsService.getAreaConfig('progress_insights')
    console.log('AI Service - Insights config:', { ...aiConfig, apiKey: aiConfig.apiKey ? '[set]' : null })
    const hasWorkingProvider = aiConfig.status === 'ok'

    // Definitively no provider assigned (or it's disabled / missing a key):
    // surface the actionable "configure a provider" message up front rather than
    // falling through to the route's generic fallback insights, which would
    // hide the real problem. (`settings_unavailable` is a transient load race —
    // we still attempt the call and re-run on the ai-settings-loaded event.)
    if (aiConfig.status === 'no_provider' || aiConfig.status === 'provider_unavailable') {
      return [this.buildNoProviderInsight(aiConfig.status)]
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          entries,
          calculation,
          // Include AI configuration if available (baseUrl for custom endpoints)
          aiProvider: aiConfig.provider,
          aiModel: aiConfig.model,
          aiApiKey: aiConfig.apiKey,
          aiBaseUrl: aiConfig.baseUrl
        })
      })

      if (!response.ok) {
        // Surface the real server error instead of swallowing it.
        let detail = `status ${response.status}`
        try {
          const errBody = await response.json()
          if (errBody?.error) detail = errBody.error
        } catch {
          // non-JSON error body; keep the status-code detail
        }
        throw new Error(`Failed to generate AI insights: ${detail}`)
      }

      const payload = await response.json()

      // The route returns a bare array on success. If it ever returns an
      // { error } object with a 200, treat that as a real failure too.
      if (payload && !Array.isArray(payload) && payload.error) {
        throw new Error(`Failed to generate AI insights: ${payload.error}`)
      }

      const processed = this.processInsights(payload, user, entries, calculation)

      // If the panel would otherwise be blank AND no working provider is
      // assigned, give the user an actionable status insight instead of nothing.
      if (processed.length === 0 && !hasWorkingProvider) {
        return [this.buildNoProviderInsight(aiConfig.status)]
      }

      return processed
    } catch (error) {
      console.error('Error generating AI insights:', error)

      // Check if fallback is enabled — but only fall back when there genuinely
      // was a working provider that failed mid-flight. If no provider is
      // configured, the fallback insights hide the real (actionable) problem,
      // so surface the "configure a provider" message instead.
      if (hasWorkingProvider && this.aiSettingsService.isFallbackEnabled('progress_insights')) {
        return this.generateFallbackInsights(user, entries, calculation)
      }

      if (!hasWorkingProvider) {
        return [this.buildNoProviderInsight(aiConfig.status)]
      }

      // Working provider failed and fallback is disabled — surface the error.
      throw error instanceof Error ? error : new Error('Failed to generate AI insights')
    }
  }

  /**
   * Build a single actionable insight that tells the user to assign/configure
   * an AI provider for Progress Insights. The component recognizes the well-known
   * id `no-provider-configured` and renders a "go to AI Settings" call-to-action.
   */
  private buildNoProviderInsight(
    status: 'settings_unavailable' | 'no_provider' | 'provider_unavailable' | 'ok'
  ): AIInsight {
    const message =
      status === 'provider_unavailable'
        ? 'The AI provider assigned to Progress Insights is disabled or missing an API key. Open AI Settings to enable it or add your key.'
        : 'No AI provider is assigned to Progress Insights yet. Open AI Settings to choose a provider and model so your insights can be generated.'

    return {
      id: 'no-provider-configured',
      type: 'guidance',
      title: 'Configure an AI provider',
      message,
      priority: 'high',
      actionable: true,
      action: {
        label: 'Open AI Settings',
        path: '/settings/ai'
      },
      dismissible: true,
      timestamp: new Date(),
      category: 'progress'
    }
  }

  /**
   * Analyze current progress and provide personalized feedback
   */
  async analyzeProgress(
    user: UserData,
    entries: BodyFatEntry[],
    calculation?: CalculationResult
  ): Promise<AIAnalysis> {
    try {
      // Get configured AI settings for the confidence analysis area
      const aiConfig = this.aiSettingsService.getAreaConfig('confidence_analysis')
      
      const response = await fetch(`${API_BASE_URL}/ai/analyze-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user, 
          entries, 
          calculation,
          // Include AI configuration if available
          aiProvider: aiConfig.provider,
          aiModel: aiConfig.model,
          aiApiKey: aiConfig.apiKey
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze progress')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error analyzing progress:', error)
      
      // Check if fallback is enabled
      if (this.aiSettingsService.isFallbackEnabled('confidence_analysis')) {
        return this.generateFallbackAnalysis(user, entries, calculation)
      }
      
      // Return minimal analysis if fallback is disabled
      return {
        progress_analysis: 'Analysis unavailable',
        recommendations: [],
        warnings: [],
        motivational_message: '',
        next_steps: [],
        confidence_score: 0
      }
    }
  }

  /**
   * Get contextual AI feedback for entry forms
   */
  async getEntryFeedback(
    user: UserData,
    newEntry: Partial<BodyFatEntry>,
    recentEntries: BodyFatEntry[]
  ): Promise<AIInsight[]> {
    try {
      // Try to get any available AI provider
      const availableAI = this.aiSettingsService.getAvailableProvider()
      
      const response = await fetch(`${API_BASE_URL}/ai/entry-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user, 
          newEntry, 
          recentEntries,
          // Include any available AI configuration
          aiProvider: availableAI.provider,
          aiModel: availableAI.model,
          aiApiKey: availableAI.apiKey
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to get entry feedback')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting entry feedback:', error)
      
      // Always provide fallback for entry feedback
      return this.generateEntryFeedback(user, newEntry, recentEntries)
    }
  }

  /**
   * Generate motivational messages based on progress
   */
  async getMotivationalMessage(
    user: UserData,
    entries: BodyFatEntry[],
    context: 'daily' | 'weekly' | 'milestone' | 'plateau' | 'setback'
  ): Promise<string> {
    const messages = this.getMotivationalMessages(context, user, entries)
    return messages[Math.floor(Math.random() * messages.length)]
  }

  /**
   * Process raw insights and enhance with metadata
   */
  private processInsights(
    rawInsights: any,
    user: UserData,
    entries: BodyFatEntry[],
    calculation?: CalculationResult
  ): AIInsight[] {
    const insights: AIInsight[] = []
    const now = new Date()
    
    // First, add insights from AI if available
    if (rawInsights && Array.isArray(rawInsights)) {
      rawInsights.forEach((insight: any) => {
        insights.push({
          id: insight.id || `ai-${now.getTime()}-${Math.random()}`,
          type: insight.type || 'tip',
          title: insight.title || 'AI Insight',
          message: insight.content || insight.message || 'No content',
          priority: insight.priority || 'medium',
          actionable: insight.actionable ?? false,
          action: insight.action,
          dismissible: insight.dismissible ?? true,
          timestamp: insight.timestamp ? new Date(insight.timestamp) : now,
          category: insight.category || 'general'
        })
      })
      
      // If we have AI insights, return them directly
      if (insights.length > 0) {
        return insights
      }
    }

    // Fallback: Add progress-based insights if no AI insights
    if (entries.length >= 2) {
      const latestEntry = entries[0]
      const previousEntry = entries[1]
      const weightChange = latestEntry.weight - previousEntry.weight
      
      if (weightChange < -2) {
        insights.push({
          id: `progress-${now.getTime()}`,
          type: 'celebration',
          title: 'Great Progress!',
          message: `You've lost ${Math.abs(weightChange).toFixed(1)} lbs since your last entry. Keep up the excellent work!`,
          priority: 'high',
          actionable: false,
          dismissible: true,
          timestamp: now,
          category: 'progress'
        })
      } else if (weightChange > 1) {
        insights.push({
          id: `concern-${now.getTime()}`,
          type: 'guidance',
          title: 'Weight Increase Detected',
          message: `Your weight increased by ${weightChange.toFixed(1)} lbs. This could be normal fluctuation, but let's review your approach.`,
          priority: 'medium',
          actionable: true,
          action: {
            label: 'Review Plan',
            path: '/nutrition'
          },
          dismissible: true,
          timestamp: now,
          category: 'progress'
        })
      }
    }

    // Add goal-based insights
    if (calculation) {
      const currentWeight = entries[0]?.weight || user.current_weight
      const weightRemaining = currentWeight - user.goal_weight
      const progressPercentage = ((user.current_weight - currentWeight) / (user.current_weight - user.goal_weight)) * 100
      
      if (progressPercentage >= 75) {
        insights.push({
          id: `goal-${now.getTime()}`,
          type: 'motivation',
          title: 'Almost There!',
          message: `You're ${progressPercentage.toFixed(0)}% of the way to your goal. Only ${weightRemaining.toFixed(1)} lbs to go!`,
          priority: 'high',
          actionable: false,
          dismissible: true,
          timestamp: now,
          category: 'goal'
        })
      }
    }

    // Add workout-specific insights
    insights.push(...this.generateWorkoutSpecificInsights(user, entries, now, calculation))

    // Add nutrition insights
    if (calculation?.progression?.[0]) {
      const currentWeek = calculation.progression[0]
      const deficit = currentWeek.tdee - currentWeek.daily_calorie_intake
      
      if (deficit > 1000) {
        insights.push({
          id: `nutrition-${now.getTime()}`,
          type: 'warning',
          title: 'Large Calorie Deficit',
          message: `Your current deficit of ${deficit.toFixed(0)} calories may be too aggressive. Consider increasing your intake slightly.`,
          priority: 'high',
          actionable: true,
          action: {
            label: 'Adjust Calories',
            path: '/nutrition'
          },
          dismissible: false,
          timestamp: now,
          category: 'nutrition'
        })
      } else if (deficit < 200) {
        insights.push({
          id: `nutrition-slow-${now.getTime()}`,
          type: 'tip',
          title: 'Slow Progress Ahead',
          message: `Your deficit of ${deficit.toFixed(0)} calories will result in slow but steady progress. Consider increasing activity if you want faster results.`,
          priority: 'medium',
          actionable: true,
          action: {
            label: 'View Workout Tips',
            path: '/progress'
          },
          dismissible: true,
          timestamp: now,
          category: 'workout'
        })
      }
    }

    return insights
  }

  /**
   * Generate fallback insights when API is unavailable
   */
  private generateFallbackInsights(
    user: UserData,
    entries: BodyFatEntry[],
    calculation?: CalculationResult
  ): AIInsight[] {
    const insights: AIInsight[] = []
    const now = new Date()

    // Basic progress insight
    if (entries.length > 0) {
      insights.push({
        id: `fallback-progress-${now.getTime()}`,
        type: 'tip',
        title: 'Keep Tracking!',
        message: 'Consistent tracking is key to successful body composition changes. Log your weight regularly for best results.',
        priority: 'medium',
        actionable: true,
        action: {
          label: 'Add Entry',
          path: '/entries/new'
        },
        dismissible: true,
        timestamp: now,
        category: 'progress'
      })
    }

    // Basic goal insight
    if (user.goal_weight && user.current_weight) {
      const remaining = user.current_weight - user.goal_weight
      insights.push({
        id: `fallback-goal-${now.getTime()}`,
        type: 'guidance',
        title: 'Goal Reminder',
        message: `You have ${remaining.toFixed(1)} lbs remaining to reach your goal weight of ${user.goal_weight} lbs.`,
        priority: 'medium',
        actionable: false,
        dismissible: true,
        timestamp: now,
        category: 'goal'
      })
    }

    return insights
  }

  /**
   * Generate workout-specific insights based on user's training type
   */
  private generateWorkoutSpecificInsights(
    user: UserData,
    entries: BodyFatEntry[],
    timestamp: Date,
    calculation?: CalculationResult
  ): AIInsight[] {
    const insights: AIInsight[] = []
    
    // Bodybuilding specific insights
    if (user.workout_type === 'Bodybuilding') {
      if (user.protein_intake !== undefined && user.protein_intake < user.current_weight * 1.0) {
        insights.push({
          id: `bb-protein-${timestamp.getTime()}`,
          type: 'tip',
          title: 'Optimize Protein for Muscle Retention',
          message: `As a bodybuilder, aim for ${Math.round(user.current_weight * 1.2)}g+ protein daily to preserve muscle during your cut.`,
          priority: 'high',
          actionable: true,
          action: {
            label: 'Nutrition Plan',
            path: '/nutrition'
          },
          dismissible: true,
          timestamp,
          category: 'nutrition'
        })
      }
      
      if (entries.length >= 2) {
        const recentLoss = (entries[1].weight - entries[0].weight) * -1
        if (recentLoss > 2.5) {
          insights.push({
            id: `bb-fast-loss-${timestamp.getTime()}`,
            type: 'warning',
            title: 'Muscle Preservation Alert',
            message: `Losing ${recentLoss.toFixed(1)} lbs/week may compromise muscle retention. Consider a more moderate approach.`,
            priority: 'high',
            actionable: false,
            dismissible: true,
            timestamp,
            category: 'workout'
          })
        }
      }
    }

    // Powerlifting specific insights
    if (user.workout_type === 'Powerlifting') {
      insights.push({
        id: `pl-strength-${timestamp.getTime()}`,
        type: 'tip',
        title: 'Strength During Cut',
        message: 'Focus on maintaining your main lifts. Consider periodic refeed days to support performance.',
        priority: 'medium',
        actionable: false,
        dismissible: true,
        timestamp,
        category: 'workout'
      })
    }

    // CrossFit specific insights
    if (user.workout_type === 'CrossFit') {
      insights.push({
        id: `cf-performance-${timestamp.getTime()}`,
        type: 'guidance',
        title: 'Performance vs. Weight Loss',
        message: 'Monitor your WOD times and energy levels. Weight loss may temporarily affect high-intensity performance.',
        priority: 'medium',
        actionable: false,
        dismissible: true,
        timestamp,
        category: 'workout'
      })
    }

    // Cardio Only specific insights
    if (user.workout_type === 'Cardio Only') {
      insights.push({
        id: `cardio-muscle-${timestamp.getTime()}`,
        type: 'tip',
        title: 'Add Resistance Training',
        message: 'Consider adding 2-3 resistance training sessions weekly to preserve muscle mass during weight loss.',
        priority: 'high',
        actionable: true,
        action: {
          label: 'Learn More',
          path: '/progress'
        },
        dismissible: true,
        timestamp,
        category: 'workout'
      })
    }

    // Program timeline insights
    if (user.start_date && user.end_date) {
      const startDate = new Date(user.start_date)
      const endDate = new Date(user.end_date)
      const currentDate = new Date()
      const totalTime = endDate.getTime() - startDate.getTime()
      const elapsedTime = currentDate.getTime() - startDate.getTime()
      const progressPercent = Math.min(100, (elapsedTime / totalTime) * 100)
      
      if (progressPercent > 75 && entries.length > 0) {
        insights.push({
          id: `timeline-final-${timestamp.getTime()}`,
          type: 'motivation',
          title: 'Final Push Time!',
          message: `You're ${Math.round(progressPercent)}% through your program. Stay strong for the final stretch!`,
          priority: 'high',
          actionable: false,
          dismissible: true,
          timestamp,
          category: 'goal'
        })
      } else if (progressPercent > 50 && progressPercent <= 75) {
        insights.push({
          id: `timeline-mid-${timestamp.getTime()}`,
          type: 'guidance',
          title: 'Halfway Point Reached',
          message: 'Great job reaching the halfway mark! This is often where mental fatigue sets in. Stay focused.',
          priority: 'medium',
          actionable: false,
          dismissible: true,
          timestamp,
          category: 'goal'
        })
      }
    }

    return insights
  }

  /**
   * Generate fallback analysis when API is unavailable
   */
  private generateFallbackAnalysis(
    user: UserData,
    entries: BodyFatEntry[],
    calculation?: CalculationResult
  ): AIAnalysis {
    return {
      progress_analysis: 'Your progress is being tracked. Keep logging entries consistently for the best results.',
      recommendations: [
        'Log your weight and body fat measurements regularly',
        'Follow your calculated calorie targets',
        'Stay consistent with your workout routine'
      ],
      warnings: [],
      motivational_message: 'Every step forward is progress. Stay committed to your goals!',
      next_steps: [
        'Add your next entry when you have new measurements',
        'Review your progress charts to identify trends'
      ],
      confidence_score: 75
    }
  }

  /**
   * Generate contextual feedback for new entries
   */
  private generateEntryFeedback(
    user: UserData,
    newEntry: Partial<BodyFatEntry>,
    recentEntries: BodyFatEntry[]
  ): AIInsight[] {
    const insights: AIInsight[] = []
    const now = new Date()

    if (newEntry.weight && recentEntries.length > 0) {
      const lastEntry = recentEntries[0]
      const weightChange = newEntry.weight - lastEntry.weight
      const daysBetween = newEntry.date && lastEntry.date 
        ? Math.abs(new Date(newEntry.date).getTime() - new Date(lastEntry.date).getTime()) / (1000 * 60 * 60 * 24)
        : 1

      if (weightChange < -3 && daysBetween < 7) {
        insights.push({
          id: `entry-feedback-${now.getTime()}`,
          type: 'warning',
          title: 'Rapid Weight Loss',
          message: `You've lost ${Math.abs(weightChange).toFixed(1)} lbs in ${daysBetween.toFixed(0)} days. This is quite rapid - make sure you're eating enough and staying healthy.`,
          priority: 'high',
          actionable: false,
          dismissible: true,
          timestamp: now,
          category: 'health'
        })
      } else if (weightChange < -1) {
        insights.push({
          id: `entry-feedback-good-${now.getTime()}`,
          type: 'celebration',
          title: 'Great Progress!',
          message: `You've lost ${Math.abs(weightChange).toFixed(1)} lbs since your last entry. You're doing great!`,
          priority: 'medium',
          actionable: false,
          dismissible: true,
          timestamp: now,
          category: 'progress'
        })
      }
    }

    return insights
  }

  /**
   * Get motivational messages based on context
   */
  private getMotivationalMessages(
    context: string,
    user: UserData,
    entries: BodyFatEntry[]
  ): string[] {
    const messages = {
      daily: [
        'Every healthy choice you make today brings you closer to your goals!',
        'Consistency beats perfection. Keep showing up for yourself!',
        'Your body is adapting and changing with every positive choice.',
        'Small daily improvements lead to stunning yearly results.'
      ],
      weekly: [
        'Another week of commitment to your health journey!',
        'Your consistency this week is building lasting habits.',
        'Each week you complete successfully is a victory worth celebrating.',
        'You\'re proving to yourself that you can achieve anything you set your mind to.'
      ],
      milestone: [
        'Incredible milestone achieved! Your dedication is paying off.',
        'This is a moment to celebrate your hard work and consistency.',
        'You\'ve proven that you can achieve your goals. What\'s next?',
        'Amazing progress! Your transformation is inspiring.'
      ],
      plateau: [
        'Plateaus are normal and temporary. Your body is adjusting.',
        'This is your body\'s way of adapting. Stay consistent and trust the process.',
        'Plateaus often come before major breakthroughs. Keep going!',
        'Your body composition may still be improving even if the scale hasn\'t moved.'
      ],
      setback: [
        'Setbacks are part of the journey. What matters is getting back on track.',
        'Every expert was once a beginner who refused to give up.',
        'This is temporary. Your commitment to health is what defines you.',
        'Learn from this experience and use it to come back stronger.'
      ]
    }

    return messages[context as keyof typeof messages] || messages.daily
  }
}