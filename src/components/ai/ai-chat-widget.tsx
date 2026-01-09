"use client"

import * as React from "react"
import { Send, Brain, User, Loader2, Minimize2, Maximize2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/contexts/app-context"
import { AIService } from "@/lib/ai-service"
import { AISettingsService } from "@/lib/ai-settings-service"
import { useAISettings } from "@/hooks/use-ai-settings"

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  category?: string
}

interface AIChatWidgetProps {
  defaultExpanded?: boolean
  maxHeight?: string
}

export function AIChatWidget({ 
  defaultExpanded = false,
  maxHeight = "400px"
}: AIChatWidgetProps) {
  const { state } = useApp()
  const { current_user, current_calculation, entries } = state
  
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const aiService = AIService.getInstance()
  const aiSettingsService = AISettingsService.getInstance()
  const { settings: aiSettings, loading: settingsLoading } = useAISettings()

  const getPersonalizedGreeting = React.useCallback(() => {
    if (!current_user) return "Hello! I'm your AI fitness assistant."
    
    const greetings = [
      `Hi ${current_user.name}! I'm here to help you reach your fitness goals. How can I assist you today?`,
      `Welcome back, ${current_user.name}! Ready to make progress toward your ${current_user.goal_weight} lb goal?`,
      `Hello ${current_user.name}! I'm your AI coach. Ask me anything about your progress, nutrition, or workout tips.`,
    ]
    
    return greetings[Math.floor(Math.random() * greetings.length)]
  }, [current_user])

  // Initial AI greeting
  React.useEffect(() => {
    if (current_user && messages.length === 0) {
      const greeting = getPersonalizedGreeting()
      setMessages([{
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: greeting,
        timestamp: new Date(),
        category: 'greeting'
      }])
    }
  }, [current_user, messages.length, getPersonalizedGreeting])

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !current_user) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Wait for settings to load
      if (settingsLoading || !aiSettings) {
        console.log('AI settings not loaded yet')
        // Use local response while settings load
        const localResponse = await generateAIResponse(userMessage.content)
        const aiMessage: ChatMessage = {
          id: `ai-local-${Date.now()}`,
          type: 'ai',
          content: localResponse,
          timestamp: new Date(),
          category: 'response'
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }
      
      // Check if we have a configured AI for chat
      const chatConfig = aiSettingsService.getAreaConfig('chat_assistant')
      console.log('Chat config:', chatConfig)
      console.log('All settings:', aiSettings)
      console.log('Settings loading state:', settingsLoading)
      
      if (chatConfig.provider && chatConfig.apiKey && chatConfig.model) {
        // Make API call with configured AI
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage.content,
            history: messages.slice(-10), // Send last 10 messages for context
            user: current_user,
            entries,
            calculation: current_calculation,
            aiProvider: chatConfig.provider,
            aiModel: chatConfig.model,
            aiApiKey: chatConfig.apiKey
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: data.response,
            timestamp: new Date(),
            category: 'response'
          }
          setMessages(prev => [...prev, aiMessage])
        } else {
          throw new Error('API response not ok')
        }
      } else {
        // Use local response generation
        const response = await generateAIResponse(userMessage.content)
        
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: response,
          timestamp: new Date(),
          category: 'response'
        }

        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Check if fallback is enabled
      if (aiSettingsService.isFallbackEnabled('chat_assistant')) {
        const fallbackResponse = await generateAIResponse(userMessage.content)
        const aiMessage: ChatMessage = {
          id: `ai-fallback-${Date.now()}`,
          type: 'ai',
          content: fallbackResponse,
          timestamp: new Date(),
          category: 'response'
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        const errorMessage: ChatMessage = {
          id: `ai-error-${Date.now()}`,
          type: 'ai',
          content: "I'm sorry, I'm having trouble responding right now. Please check your AI settings or try again later.",
          timestamp: new Date(),
          category: 'error'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = async (userInput: string): Promise<string> => {
    const input = userInput.toLowerCase()
    
    // Simple keyword-based responses for now
    if (input.includes('progress') || input.includes('how am i doing')) {
      if (entries.length >= 2) {
        const latestEntry = entries[0]
        const previousEntry = entries[1]
        const weightChange = latestEntry.weight - previousEntry.weight
        
        if (weightChange < -1) {
          return `Great question! You've made excellent progress, losing ${Math.abs(weightChange).toFixed(1)} lbs since your last entry. You're ${calculateProgressPercentage()}% of the way to your goal weight of ${current_user?.goal_weight} lbs. Keep up the fantastic work!`
        } else if (weightChange > 1) {
          return `I see your weight increased by ${weightChange.toFixed(1)} lbs since your last entry. This could be normal fluctuation due to hydration, sleep, or recent meals. The key is to look at trends over time rather than day-to-day changes. Would you like some tips on managing weight fluctuations?`
        } else {
          return `Your weight has remained stable since your last entry, which can be normal during body recomposition. Your body might be building muscle while losing fat. Consider taking body measurements or progress photos to track changes the scale might not show.`
        }
      } else {
        return `You're just getting started! I'll be able to provide more detailed progress insights once you have a few more entries. For now, focus on consistency with your tracking and following your calculated calorie targets.`
      }
    }
    
    if (input.includes('calories') || input.includes('eat') || input.includes('nutrition')) {
      const currentCalories = current_calculation?.progression?.[0]?.daily_calorie_intake || 0
      const tdee = current_calculation?.progression?.[0]?.tdee || 0
      const deficit = tdee - currentCalories
      
      return `Based on your current plan, you should aim for ${Math.round(currentCalories)} calories per day. This creates a ${Math.round(deficit)} calorie deficit from your TDEE of ${Math.round(tdee)} calories. This deficit should result in sustainable fat loss while preserving muscle mass. Remember to prioritize protein intake and eat nutrient-dense foods!`
    }
    
    if (input.includes('workout') || input.includes('exercise') || input.includes('training')) {
      return `Based on your activity level, resistance training is crucial for preserving muscle mass during fat loss. Aim for 3-4 strength training sessions per week, focusing on compound movements. Combine this with ${current_user?.activity_level && current_user.activity_level >= 3 ? 'your current cardio routine' : 'some moderate cardio'} for optimal results. Would you like specific workout recommendations?`
    }
    
    if (input.includes('goal') || input.includes('target')) {
      const remainingWeight = (entries[0]?.weight || current_user?.current_weight || 0) - (current_user?.goal_weight || 0)
      return `Your goal is to reach ${current_user?.goal_weight} lbs and ${current_user?.goal_bf}% body fat. You have approximately ${remainingWeight.toFixed(1)} lbs remaining to your weight goal. Based on your current rate of progress, this is definitely achievable! Stay consistent with your plan and trust the process.`
    }
    
    if (input.includes('plateau') || input.includes('stuck') || input.includes('not losing')) {
      return `Plateaus are completely normal and often indicate your body is adapting. Here are some strategies: 1) Take a diet break for 1-2 weeks at maintenance calories, 2) Increase your daily activity (more steps), 3) Reassess your calorie intake - you might need a slight adjustment, 4) Be patient - body composition changes don't always show on the scale immediately. Remember, progress isn't always linear!`
    }
    
    if (input.includes('motivation') || input.includes('give up') || input.includes('hard')) {
      const motivationalMessage = await aiService.getMotivationalMessage(
        current_user!,
        entries,
        'daily'
      )
      return `${motivationalMessage} Remember, every small choice you make is building toward your bigger goal. You've already taken the hardest step by starting. I believe in you! What specific challenge are you facing right now?`
    }
    
    if (input.includes('thank') || input.includes('thanks')) {
      return `You're very welcome! I'm here to support you every step of the way. Remember, consistency beats perfection. Keep logging your entries and following your plan - you've got this! Feel free to ask me anything else.`
    }
    
    // Default response
    return `That's a great question! While I'm still learning to provide more detailed responses, I can help you with questions about your progress, nutrition targets, workout tips, and motivation. You can also check your dashboard for detailed insights, or try asking me about your current progress, calorie targets, or workout recommendations. What specific area would you like guidance on?`
  }

  const calculateProgressPercentage = (): number => {
    if (!current_user || entries.length === 0) return 0
    
    const currentWeight = entries[0].weight
    const startWeight = current_user.current_weight
    const goalWeight = current_user.goal_weight
    
    if (startWeight === goalWeight) return 100
    
    const totalLossNeeded = startWeight - goalWeight
    const progressMade = startWeight - currentWeight
    
    return Math.max(0, Math.min(100, (progressMade / totalLossNeeded) * 100))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!current_user) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <CardTitle className="text-lg">AI Coach</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
        {!isExpanded && (
          <CardDescription>
            Click to chat with your AI fitness coach
          </CardDescription>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {/* Messages Area */}
            <ScrollArea className="h-64 w-full border rounded-lg p-4" style={{ maxHeight }}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Brain className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className={`rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                        <Brain className="h-4 w-4" />
                      </div>
                      <div className="bg-muted text-muted-foreground rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your progress, nutrition, or workouts..."
                disabled={isLoading}
              />
              <Button
                variant="default"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInputValue("How am I doing with my progress?")}
                disabled={isLoading}
              >
                Check Progress
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInputValue("What should my daily calories be?")}
                disabled={isLoading}
              >
                Calorie Help
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInputValue("Give me some motivation")}
                disabled={isLoading}
              >
                Motivate Me
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}