"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  RotateCcw, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Code, 
  MessageSquare, 
  BarChart, 
  FileText,
  Sparkles,
  Zap
} from 'lucide-react'
import {
  AIPromptConfig,
  AIPromptsSettings,
  DEFAULT_AI_PROMPTS,
  DEFAULT_GLOBAL_AI_SETTINGS,
  validatePrompt,
  extractVariables,
  resetPromptToDefault,
  getPromptsByCategory
} from '@/lib/ai-prompts-config'

interface AIPromptsEditorProps {
  onSave?: (settings: AIPromptsSettings) => void
}

export function AIPromptsEditor({ onSave }: AIPromptsEditorProps) {
  const [prompts, setPrompts] = useState<AIPromptConfig[]>(DEFAULT_AI_PROMPTS)
  const [globalSettings, setGlobalSettings] = useState(DEFAULT_GLOBAL_AI_SETTINGS)
  const [selectedPromptId, setSelectedPromptId] = useState<string>(DEFAULT_AI_PROMPTS[0].id)
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({})
  const [editedModels, setEditedModels] = useState<Record<string, { model?: string; temperature?: number; maxTokens?: number }>>({})
  const [validation, setValidation] = useState<Record<string, { valid: boolean; errors: string[] }>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Load saved prompts from localStorage
  useEffect(() => {
    const savedPrompts = localStorage.getItem('ai-prompts-config')
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts)
        setPrompts(parsed.prompts || DEFAULT_AI_PROMPTS)
        setGlobalSettings(parsed.globalSettings || DEFAULT_GLOBAL_AI_SETTINGS)
      } catch (error) {
        console.error('Failed to load saved prompts:', error)
      }
    }
  }, [])

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId)

  const handlePromptChange = (promptId: string, newPrompt: string) => {
    setEditedPrompts(prev => ({ ...prev, [promptId]: newPrompt }))
    
    // Validate the prompt
    const prompt = prompts.find(p => p.id === promptId)
    if (prompt) {
      const result = validatePrompt(newPrompt, prompt.variables)
      setValidation(prev => ({ ...prev, [promptId]: result }))
    }
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    
    try {
      // Apply edited prompts and model settings
      const updatedPrompts = prompts.map(prompt => ({
        ...prompt,
        prompt: editedPrompts[prompt.id] !== undefined ? editedPrompts[prompt.id] : prompt.prompt,
        model: editedModels[prompt.id]?.model !== undefined ? editedModels[prompt.id].model : prompt.model,
        temperature: editedModels[prompt.id]?.temperature !== undefined ? editedModels[prompt.id].temperature : prompt.temperature,
        maxTokens: editedModels[prompt.id]?.maxTokens !== undefined ? editedModels[prompt.id].maxTokens : prompt.maxTokens
      }))

      const settings: AIPromptsSettings = {
        prompts: updatedPrompts,
        globalSettings
      }

      // Save to localStorage
      localStorage.setItem('ai-prompts-config', JSON.stringify(settings))
      
      // Call onSave callback if provided
      if (onSave) {
        await onSave(settings)
      }

      setPrompts(updatedPrompts)
      setEditedPrompts({})
      setEditedModels({})
      setSaveStatus('saved')
      
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save prompts:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleResetPrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId)
    if (prompt) {
      setEditedPrompts(prev => ({ ...prev, [promptId]: prompt.defaultPrompt }))
      setEditedModels(prev => {
        const newModels = { ...prev }
        delete newModels[promptId]
        return newModels
      })
      const result = validatePrompt(prompt.defaultPrompt, prompt.variables)
      setValidation(prev => ({ ...prev, [promptId]: result }))
    }
  }

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all prompts to their defaults?')) {
      setPrompts(DEFAULT_AI_PROMPTS)
      setGlobalSettings(DEFAULT_GLOBAL_AI_SETTINGS)
      setEditedPrompts({})
      setEditedModels({})
      setValidation({})
      localStorage.removeItem('ai-prompts-config')
    }
  }

  const getCategoryIcon = (category: AIPromptConfig['category']) => {
    switch (category) {
      case 'analysis': return <BarChart className="h-4 w-4" />
      case 'chat': return <MessageSquare className="h-4 w-4" />
      case 'insights': return <Sparkles className="h-4 w-4" />
      case 'report': return <FileText className="h-4 w-4" />
    }
  }

  const hasChanges = Object.keys(editedPrompts).length > 0 || Object.keys(editedModels).length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Prompts Configuration</CardTitle>
            <CardDescription>
              Customize the prompts used for AI analysis, chat, and insights throughout the application
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {saveStatus !== 'idle' && (
          <Alert variant={saveStatus === 'saved' ? 'default' : saveStatus === 'error' ? 'destructive' : 'default'}>
            <AlertDescription className="flex items-center gap-2">
              {saveStatus === 'saving' && 'Saving prompts...'}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Prompts saved successfully!
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Failed to save prompts. Please try again.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={selectedPromptId} onValueChange={setSelectedPromptId}>
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
            {['analysis', 'chat', 'insights', 'report'].map(category => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="gap-2 capitalize"
                onClick={() => {
                  const firstPrompt = getPromptsByCategory(prompts, category as any)[0]
                  if (firstPrompt) setSelectedPromptId(firstPrompt.id)
                }}
              >
                {getCategoryIcon(category as any)}
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Select Prompt</Label>
              <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map(prompt => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(prompt.category)}
                        <span>{prompt.name}</span>
                        {prompt.model?.includes('haiku') && (
                          <Badge variant="secondary" className="ml-2">
                            <Zap className="h-3 w-3 mr-1" />
                            Fast
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPrompt && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedPrompt.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">
                      Model: {selectedPrompt.model || globalSettings.defaultModel}
                    </Badge>
                    <Badge variant="outline">
                      Max Tokens: {selectedPrompt.maxTokens || globalSettings.defaultMaxTokens}
                    </Badge>
                    <Badge variant="outline">
                      Temperature: {selectedPrompt.temperature || globalSettings.defaultTemperature}
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <Label className="text-sm">Required Variables</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedPrompt.variables.map(variable => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 mb-4 space-y-3">
                    <h4 className="text-sm font-medium">Model Configuration</h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <input
                          type="text"
                          value={editedModels[selectedPrompt.id]?.model !== undefined 
                            ? editedModels[selectedPrompt.id].model 
                            : (selectedPrompt.model || '')}
                          onChange={(e) => setEditedModels(prev => ({
                            ...prev,
                            [selectedPrompt.id]: {
                              ...prev[selectedPrompt.id],
                              model: e.target.value
                            }
                          }))}
                          placeholder={globalSettings.defaultModel}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Temperature</Label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={editedModels[selectedPrompt.id]?.temperature !== undefined 
                            ? editedModels[selectedPrompt.id].temperature 
                            : (selectedPrompt.temperature || '')}
                          onChange={(e) => setEditedModels(prev => ({
                            ...prev,
                            [selectedPrompt.id]: {
                              ...prev[selectedPrompt.id],
                              temperature: parseFloat(e.target.value)
                            }
                          }))}
                          placeholder={String(globalSettings.defaultTemperature)}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Tokens</Label>
                        <input
                          type="number"
                          min="100"
                          max="4000"
                          step="100"
                          value={editedModels[selectedPrompt.id]?.maxTokens !== undefined 
                            ? editedModels[selectedPrompt.id].maxTokens 
                            : (selectedPrompt.maxTokens || '')}
                          onChange={(e) => setEditedModels(prev => ({
                            ...prev,
                            [selectedPrompt.id]: {
                              ...prev[selectedPrompt.id],
                              maxTokens: parseInt(e.target.value)
                            }
                          }))}
                          placeholder={String(globalSettings.defaultMaxTokens)}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use global defaults. You can enter any model name.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`prompt-${selectedPrompt.id}`}>Prompt Template</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetPrompt(selectedPrompt.id)}
                      className="gap-2"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset to Default
                    </Button>
                  </div>
                  
                  <Textarea
                    id={`prompt-${selectedPrompt.id}`}
                    value={editedPrompts[selectedPrompt.id] !== undefined ? editedPrompts[selectedPrompt.id] : selectedPrompt.prompt}
                    onChange={(e) => handlePromptChange(selectedPrompt.id, e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Enter your prompt template..."
                  />
                  
                  {validation[selectedPrompt.id] && !validation[selectedPrompt.id].valid && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {validation[selectedPrompt.id].errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {(editedPrompts[selectedPrompt.id] !== undefined && 
                   editedPrompts[selectedPrompt.id] !== selectedPrompt.prompt && 
                   validation[selectedPrompt.id]?.valid) || 
                   editedModels[selectedPrompt.id] !== undefined ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        This prompt has unsaved changes
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                {selectedPrompt.defaultPrompt !== selectedPrompt.prompt && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      View Default Prompt
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {selectedPrompt.defaultPrompt}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </Tabs>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-4">Global AI Settings</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="default-model">Default Model</Label>
              <div className="flex gap-2">
                <Select 
                  value={globalSettings.defaultModel} 
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      // Don't update yet, wait for custom input
                      return
                    }
                    setGlobalSettings(prev => ({ ...prev, defaultModel: value }))
                  }}
                >
                  <SelectTrigger id="default-model" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Latest)</SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</SelectItem>
                    <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                    <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                    <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B</SelectItem>
                    <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                    <SelectItem value="custom">Custom Model...</SelectItem>
                  </SelectContent>
                </Select>
                {!['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 
                  'claude-3-opus-20240229', 'gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo', 
                  'gemini-pro', 'gemini-1.5-pro', 'mixtral-8x7b-32768', 'llama-3.1-70b-versatile', 
                  'deepseek-coder'].includes(globalSettings.defaultModel) && (
                  <input
                    type="text"
                    value={globalSettings.defaultModel}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                    placeholder="Enter custom model name"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select from common models or enter a custom model name
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-temp">Default Temperature</Label>
              <input
                id="default-temp"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={globalSettings.defaultTemperature}
                onChange={(e) => setGlobalSettings(prev => ({ 
                  ...prev, 
                  defaultTemperature: parseFloat(e.target.value) 
                }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-tokens">Default Max Tokens</Label>
              <input
                id="default-tokens"
                type="number"
                min="100"
                max="4000"
                step="100"
                value={globalSettings.defaultMaxTokens}
                onChange={(e) => setGlobalSettings(prev => ({ 
                  ...prev, 
                  defaultMaxTokens: parseInt(e.target.value) 
                }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}