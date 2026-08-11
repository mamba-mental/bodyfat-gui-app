"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Zap,
  Info
} from 'lucide-react'
import {
  AIPromptConfig,
  AIPromptsSettings,
  DEFAULT_AI_PROMPTS,
  DEFAULT_GLOBAL_AI_SETTINGS,
  validatePrompt,
  resetPromptToDefault,
  getPromptsByCategory
} from '@/lib/ai-prompts-config'
import { useAISettings } from '@/hooks/use-ai-settings'
import { AIProvider } from '@/types/ai'

// Sentinel value used in the Select when no models are loaded — selecting it
// keeps the free-text input active without writing a sentinel into state.
const FREE_TEXT_SENTINEL = '__free_text__'

interface AIPromptsEditorProps {
  onSave?: (settings: AIPromptsSettings) => void
}

// ---------------------------------------------------------------------------
// Small helper: inline info block used for section guidance
// ---------------------------------------------------------------------------
function SectionHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/25 bg-accent/40 px-3 py-2 text-xs text-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function AIPromptsEditor({ onSave }: AIPromptsEditorProps) {
  const [prompts, setPrompts] = useState<AIPromptConfig[]>(DEFAULT_AI_PROMPTS)
  const [globalSettings, setGlobalSettings] = useState(DEFAULT_GLOBAL_AI_SETTINGS)
  const [selectedPromptId, setSelectedPromptId] = useState<string>(DEFAULT_AI_PROMPTS[0].id)
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({})
  const [editedModels, setEditedModels] = useState<Record<string, { model?: string; temperature?: number; maxTokens?: number }>>({})
  const [validation, setValidation] = useState<Record<string, { valid: boolean; errors: string[] }>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Pull the live AI provider settings so we can populate the model dropdown
  const { settings: aiSettings } = useAISettings()

  // Build a flat list of { providerName, models[] } for enabled providers that
  // have at least one fetched model.
  const availableModelGroups = useMemo(() => {
    if (!aiSettings?.providers) return []
    return (Object.keys(aiSettings.providers) as AIProvider[])
      .map((key) => ({
        providerKey: key,
        providerName: aiSettings.providers[key].displayName
          ?? aiSettings.providers[key].provider
          ?? key,
        models: aiSettings.providers[key].models ?? []
      }))
      .filter((g) => aiSettings.providers[g.providerKey].enabled && g.models.length > 0)
  }, [aiSettings])

  const hasLoadedModels = availableModelGroups.some((g) => g.models.length > 0)

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

  // -------------------------------------------------------------------------
  // Current effective values for the selected prompt
  // -------------------------------------------------------------------------
  const effectiveModel = (selectedPrompt &&
    (editedModels[selectedPrompt.id]?.model !== undefined
      ? editedModels[selectedPrompt.id].model
      : (selectedPrompt.model ?? ''))) ?? ''

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handlePromptChange = (promptId: string, newPrompt: string) => {
    setEditedPrompts(prev => ({ ...prev, [promptId]: newPrompt }))

    const prompt = prompts.find(p => p.id === promptId)
    if (prompt) {
      const result = validatePrompt(newPrompt, prompt.variables)
      setValidation(prev => ({ ...prev, [promptId]: result }))
    }
  }

  const handleModelSelect = (promptId: string, value: string) => {
    if (value === FREE_TEXT_SENTINEL) return
    setEditedModels(prev => ({
      ...prev,
      [promptId]: { ...prev[promptId], model: value }
    }))
  }

  const handleModelFreeText = (promptId: string, value: string) => {
    setEditedModels(prev => ({
      ...prev,
      [promptId]: { ...prev[promptId], model: value }
    }))
  }

  // Pre-save validation: block save if any edited template is missing required variables
  const getSaveBlockers = (): string[] => {
    const blockers: string[] = []
    prompts.forEach(prompt => {
      if (editedPrompts[prompt.id] !== undefined) {
        const result = validatePrompt(editedPrompts[prompt.id], prompt.variables)
        if (!result.valid) {
          blockers.push(`"${prompt.name}": ${result.errors.join(', ')}`)
        }
      }
    })
    return blockers
  }

  const handleSave = async () => {
    const blockers = getSaveBlockers()
    if (blockers.length > 0) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 5000)
      return
    }

    setSaveStatus('saving')

    try {
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

      localStorage.setItem('ai-prompts-config', JSON.stringify(settings))

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
        const next = { ...prev }
        delete next[promptId]
        return next
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
  const saveBlockers = getSaveBlockers()

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
              disabled={!hasChanges || saveBlockers.length > 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Save status feedback */}
        {saveStatus !== 'idle' && (
          <Alert variant={saveStatus === 'error' ? 'destructive' : 'default'}>
            <AlertDescription className="flex items-center gap-2">
              {saveStatus === 'saving' && 'Saving prompts…'}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Prompts saved successfully.
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4" />
                  {saveBlockers.length > 0
                    ? `Cannot save — fix validation errors first: ${saveBlockers.join('; ')}`
                    : 'Failed to save prompts. Please try again.'}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Pre-save blocker inline warning (visible before attempting save) */}
        {hasChanges && saveBlockers.length > 0 && saveStatus === 'idle' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Required variables are missing from one or more templates. Fix before saving.
            </AlertDescription>
          </Alert>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Section: Select Prompt                                              */}
        {/* ------------------------------------------------------------------ */}
        <Tabs value={selectedPromptId} onValueChange={setSelectedPromptId}>
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
            {(['analysis', 'chat', 'insights', 'report'] as const).map(category => (
              <TabsTrigger
                key={category}
                value={category}
                className="gap-2 capitalize"
                onClick={() => {
                  const firstPrompt = getPromptsByCategory(prompts, category)[0]
                  if (firstPrompt) setSelectedPromptId(firstPrompt.id)
                }}
              >
                {getCategoryIcon(category)}
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6 space-y-4">
            {/* Select Prompt — with guidance */}
            <div className="flex flex-col gap-2">
              <Label>Select Prompt</Label>
              <SectionHint>
                Each prompt drives a specific AI feature in the app. Select one below to view or edit it.
                Changes only apply after you click <strong>Save Changes</strong>.
              </SectionHint>
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
                <p className="text-sm text-muted-foreground">{selectedPrompt.description}</p>

                {/* ---------------------------------------------------------- */}
                {/* Section: Required Variables                                  */}
                {/* ---------------------------------------------------------- */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Required Variables</Label>
                  </div>
                  <SectionHint>
                    These placeholders are automatically filled in by the app at runtime — you do not need to provide
                    them manually. Do <strong>not</strong> remove them from the template below or the prompt will fail.
                  </SectionHint>
                  {selectedPrompt.variables.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No required variables for this prompt.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedPrompt.variables.map(variable => (
                        <Badge
                          key={variable}
                          variant="secondary"
                          className="text-xs font-mono select-none cursor-default"
                          title={`Auto-filled by the app — keep this in your template`}
                        >
                          <Code className="h-3 w-3 mr-1" />
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: Model Configuration                                 */}
                {/* ---------------------------------------------------------- */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">Model Configuration</h4>
                  </div>
                  <SectionHint>
                    Override the AI model, creativity (temperature), and response length for this prompt only.
                    Leave fields empty to inherit the global defaults set at the bottom of this page.
                    Temperature 0 = very focused; 1 = more creative.
                  </SectionHint>

                  <div className="grid gap-3 md:grid-cols-3">
                    {/* Model field — dropdown when models are loaded, free-text fallback */}
                    <div className="space-y-1">
                      <Label className="text-xs">Model</Label>
                      {hasLoadedModels ? (
                        <div className="space-y-1.5">
                          <Select
                            value={effectiveModel || FREE_TEXT_SENTINEL}
                            onValueChange={(val) => handleModelSelect(selectedPrompt.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={globalSettings.defaultModel} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FREE_TEXT_SENTINEL} className="text-xs text-muted-foreground italic">
                                — use global default —
                              </SelectItem>
                              {availableModelGroups.map(group => (
                                <SelectGroup key={group.providerKey}>
                                  <SelectLabel className="text-xs capitalize">{group.providerName}</SelectLabel>
                                  {group.models.map(m => (
                                    <SelectItem key={m.id} value={m.id} className="text-xs">
                                      {m.name || m.id}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Always show current value; allow manual override */}
                          <input
                            type="text"
                            value={effectiveModel}
                            onChange={(e) => handleModelFreeText(selectedPrompt.id, e.target.value)}
                            placeholder="or type a model ID…"
                            className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={effectiveModel}
                          onChange={(e) => handleModelFreeText(selectedPrompt.id, e.target.value)}
                          placeholder={globalSettings.defaultModel}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        />
                      )}
                      {!hasLoadedModels && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          No models fetched yet — configure a provider in AI Settings to get a dropdown.
                        </p>
                      )}
                    </div>

                    {/* Temperature */}
                    <div className="space-y-1">
                      <Label className="text-xs">Temperature (0–1)</Label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={editedModels[selectedPrompt.id]?.temperature !== undefined
                          ? editedModels[selectedPrompt.id].temperature
                          : (selectedPrompt.temperature ?? '')}
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

                    {/* Max Tokens */}
                    <div className="space-y-1">
                      <Label className="text-xs">Max Tokens</Label>
                      <input
                        type="number"
                        min="100"
                        max="4000"
                        step="100"
                        value={editedModels[selectedPrompt.id]?.maxTokens !== undefined
                          ? editedModels[selectedPrompt.id].maxTokens
                          : (selectedPrompt.maxTokens ?? '')}
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
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: Prompt Template                                     */}
                {/* ---------------------------------------------------------- */}
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

                  <SectionHint>
                    Write your prompt here. Use the <strong>Required Variables</strong> above (e.g.{' '}
                    <code className="font-mono">{'{{current_weight}}'}</code>) exactly as shown — they will be
                    replaced with real values automatically when the prompt runs. Removing a required variable
                    will block saving.
                  </SectionHint>

                  <Textarea
                    id={`prompt-${selectedPrompt.id}`}
                    value={editedPrompts[selectedPrompt.id] !== undefined
                      ? editedPrompts[selectedPrompt.id]
                      : selectedPrompt.prompt}
                    onChange={(e) => handlePromptChange(selectedPrompt.id, e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Enter your prompt template…"
                  />

                  {/* Validation errors */}
                  {validation[selectedPrompt.id] && !validation[selectedPrompt.id].valid && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-0.5">
                          {validation[selectedPrompt.id].errors.map((error, idx) => (
                            <li key={idx} className="text-sm">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Unsaved changes indicator */}
                  {((editedPrompts[selectedPrompt.id] !== undefined &&
                    editedPrompts[selectedPrompt.id] !== selectedPrompt.prompt &&
                    validation[selectedPrompt.id]?.valid) ||
                    editedModels[selectedPrompt.id] !== undefined) && (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <AlertDescription>This prompt has unsaved changes</AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* View default prompt */}
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

        {/* ------------------------------------------------------------------ */}
        {/* Section: Global AI Settings                                          */}
        {/* ------------------------------------------------------------------ */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-2">Global AI Settings</h3>
          <p className="text-xs text-muted-foreground mb-4">
            These defaults apply to any prompt that does not specify its own Model, Temperature, or Max Tokens above.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="default-model">Default Model</Label>
              <div className="flex flex-col gap-1.5">
                {hasLoadedModels ? (
                  <Select
                    value={globalSettings.defaultModel}
                    onValueChange={(val) => {
                      if (val !== FREE_TEXT_SENTINEL) {
                        setGlobalSettings(prev => ({ ...prev, defaultModel: val }))
                      }
                    }}
                  >
                    <SelectTrigger id="default-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModelGroups.map(group => (
                        <SelectGroup key={group.providerKey}>
                          <SelectLabel className="capitalize">{group.providerName}</SelectLabel>
                          {group.models.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name || m.id}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {/* Free-text always visible for global default */}
                <input
                  id={hasLoadedModels ? undefined : 'default-model'}
                  type="text"
                  value={globalSettings.defaultModel}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                  placeholder="e.g. claude-3-5-sonnet-20241022"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {hasLoadedModels
                  ? 'Pick from the dropdown or type a custom model ID.'
                  : 'Configure a provider in AI Settings to get a model dropdown here.'}
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
              <p className="text-xs text-muted-foreground">0 = focused, 1 = creative</p>
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
              <p className="text-xs text-muted-foreground">Controls maximum response length</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
