/**
 * AI Prompts Configuration
 * Centralized management of all AI prompts used throughout the application
 * Supports editing, validation, and reverting to defaults
 */

export interface AIPromptConfig {
  id: string
  name: string
  description: string
  category: 'analysis' | 'chat' | 'insights' | 'report'
  prompt: string
  variables: string[] // List of variables that will be interpolated
  defaultPrompt: string
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface AIPromptsSettings {
  prompts: AIPromptConfig[]
  globalSettings: {
    defaultModel: string
    defaultTemperature: number
    defaultMaxTokens: number
  }
}

// Default prompts configuration
export const DEFAULT_AI_PROMPTS: AIPromptConfig[] = [
  {
    id: 'confidence-analysis',
    name: 'Confidence Analysis',
    description: 'Analyzes body transformation plans and provides confidence scores',
    category: 'analysis',
    variables: ['current_weight', 'goal_weight', 'current_bf', 'goal_bf', 'timeframe_weeks', 'tdee', 'daily_calories', 'weekly_weight_loss'],
    prompt: `You are an expert body composition analyst. Analyze the following body transformation plan and provide a confidence assessment.

INPUT PARAMETERS:
- Current Weight: {{current_weight}} lbs
- Goal Weight: {{goal_weight}} lbs  
- Current Body Fat: {{current_bf}}%
- Goal Body Fat: {{goal_bf}}%
- Timeframe: {{timeframe_weeks}} weeks
- TDEE: {{tdee}} calories
- Recommended Daily Calories: {{daily_calories}}
- Target Weekly Weight Loss: {{weekly_weight_loss}} lbs

Please provide your analysis in the following JSON format:
{
    "overall_confidence": <score 0-100>,
    "overall_confidence_explanation": "<detailed explanation>",
    "input_reliability": <score 0-100>,
    "input_reliability_explanation": "<explanation>",
    "calculation_accuracy": <score 0-100>,
    "calculation_accuracy_explanation": "<explanation>",
    "goal_feasibility": <score 0-100>,
    "goal_feasibility_explanation": "<explanation>",
    "warnings": ["<warning1>", "<warning2>"],
    "suggestions": ["<suggestion1>", "<suggestion2>"],
    "confidence_factors": {
        "timeframe_realism": <score>,
        "calorie_deficit_sustainability": <score>,
        "body_composition_feasibility": <score>,
        "data_quality": <score>
    }
}

Focus on practical, evidence-based assessment. Be specific about potential issues and actionable improvements.`,
    defaultPrompt: '', // Will be set to same as prompt
    maxTokens: 1500,
    temperature: 0.3,
    model: 'claude-3-5-sonnet-20241022'
  },
  {
    id: 'confidence-analysis-optimized',
    name: 'Confidence Analysis (Optimized)',
    description: 'Faster version of confidence analysis with reduced token usage',
    category: 'analysis',
    variables: ['weight_change', 'bf_change', 'weeks', 'deficit', 'tdee', 'age', 'gender', 'activity_factor'],
    prompt: `Analyze body transformation feasibility. Response must be valid JSON only.

Plan: {{weight_change}}lbs loss, {{bf_change}}% BF reduction in {{weeks}} weeks
Daily: {{deficit}}cal deficit from {{tdee}}cal TDEE
Profile: {{age}}yo {{gender}}, activity level {{activity_factor}}/5

Return this exact JSON:
{
  "overall_confidence": <0-100>,
  "input_reliability": <0-100>,
  "calculation_accuracy": <0-100>,
  "goal_feasibility": <0-100>,
  "warnings": ["warning1", "warning2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "confidence_factors": {
    "timeframe_realism": <0-100>,
    "deficit_sustainability": <0-100>
  },
  "summary": "<50 word analysis>"
}`,
    defaultPrompt: '', // Will be set to same as prompt
    maxTokens: 500,
    temperature: 0.1,
    model: 'claude-3-haiku-20240307'
  },
  {
    id: 'fitness-coach-chat',
    name: 'Fitness Coach Chat',
    description: 'AI fitness coach for interactive chat sessions',
    category: 'chat',
    variables: ['user_name', 'user_age', 'goal_weight', 'goal_bf', 'entries_count'],
    prompt: `You are an AI fitness coach helping users track their body fat and achieve their fitness goals. 

User details: {{user_name}}, {{user_age}} years old, goal: {{goal_weight}} lbs at {{goal_bf}}% body fat
Current progress: {{entries_count}} entries logged

Be supportive, knowledgeable, and provide actionable advice.`,
    defaultPrompt: '',
    maxTokens: 1000,
    temperature: 0.7
  },
  {
    id: 'fitness-insights',
    name: 'Fitness Insights Generator',
    description: 'Generates personalized fitness insights based on user data',
    category: 'insights',
    variables: ['user_profile', 'entries_count'],
    prompt: `You are an AI fitness coach analyzing user data to provide actionable insights.

User Profile:
{{user_profile}}

Progress: {{entries_count}} entries logged

Generate 3-5 specific, actionable insights in JSON format. Each insight should have:
- id: unique identifier
- category: one of (progress, nutrition, workout, goal, health, motivation)
- priority: one of (high, medium, low)
- title: short title
- content: detailed message with specific advice
- icon: emoji representing the insight
- timestamp: current ISO timestamp

Focus on:
1. Current progress analysis
2. Specific recommendations based on their data
3. Potential issues or warnings
4. Motivational support
5. Next steps

Return ONLY a JSON array of insights.`,
    defaultPrompt: '',
    maxTokens: 1200,
    temperature: 0.7
  },
  {
    id: 'workout-recommendations',
    name: 'Workout Recommendations',
    description: 'Generates personalized workout recommendations',
    category: 'insights',
    variables: ['workout_type', 'experience_level', 'workout_days', 'current_weight', 'goal_weight'],
    prompt: `Generate personalized workout recommendations for:
- Workout Type: {{workout_type}}
- Experience: {{experience_level}}
- Days/Week: {{workout_days}}
- Current Weight: {{current_weight}} lbs
- Goal Weight: {{goal_weight}} lbs

Provide specific exercises, sets, reps, and progression strategies.`,
    defaultPrompt: '',
    maxTokens: 800,
    temperature: 0.6
  },
  {
    id: 'nutrition-guidance',
    name: 'Nutrition Guidance',
    description: 'Provides nutrition advice based on goals',
    category: 'insights',
    variables: ['diet_type', 'protein_intake', 'daily_calories', 'tdee'],
    prompt: `Provide nutrition guidance for:
- Diet Type: {{diet_type}}
- Current Protein: {{protein_intake}}g/day
- Recommended Calories: {{daily_calories}}
- TDEE: {{tdee}}

Include meal timing, macronutrient distribution, and food suggestions.`,
    defaultPrompt: '',
    maxTokens: 800,
    temperature: 0.6
  }
]

// Initialize default prompts
DEFAULT_AI_PROMPTS.forEach(prompt => {
  prompt.defaultPrompt = prompt.prompt
})

// Default global settings
export const DEFAULT_GLOBAL_AI_SETTINGS = {
  defaultModel: 'claude-3-5-sonnet-20241022',
  defaultTemperature: 0.7,
  defaultMaxTokens: 1000
}

// Validation functions
export function validatePrompt(prompt: string, variables: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if prompt is not empty
  if (!prompt || prompt.trim().length === 0) {
    errors.push('Prompt cannot be empty')
  }
  
  // Check if all required variables are present
  for (const variable of variables) {
    const pattern = new RegExp(`{{${variable}}}`, 'g')
    if (!pattern.test(prompt)) {
      errors.push(`Missing required variable: {{${variable}}}`)
    }
  }
  
  // Check for unclosed variable brackets
  const openBrackets = (prompt.match(/{{/g) || []).length
  const closeBrackets = (prompt.match(/}}/g) || []).length
  if (openBrackets !== closeBrackets) {
    errors.push('Unclosed variable brackets detected')
  }
  
  // Check prompt length (reasonable limits)
  if (prompt.length > 10000) {
    errors.push('Prompt is too long (max 10,000 characters)')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Function to interpolate variables in a prompt
export function interpolatePrompt(template: string, variables: Record<string, any>): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(pattern, String(value))
  }
  
  return result
}

// Function to extract variables from a prompt template
export function extractVariables(template: string): string[] {
  const matches = template.match(/{{(\w+)}}/g) || []
  return [...new Set(matches.map(match => match.slice(2, -2)))]
}

// Export utility to get prompt by ID
export function getPromptById(prompts: AIPromptConfig[], id: string): AIPromptConfig | undefined {
  return prompts.find(p => p.id === id)
}

// Export utility to reset a prompt to default
export function resetPromptToDefault(prompt: AIPromptConfig): AIPromptConfig {
  return {
    ...prompt,
    prompt: prompt.defaultPrompt
  }
}

// Export utility to get prompts by category
export function getPromptsByCategory(prompts: AIPromptConfig[], category: AIPromptConfig['category']): AIPromptConfig[] {
  return prompts.filter(p => p.category === category)
}