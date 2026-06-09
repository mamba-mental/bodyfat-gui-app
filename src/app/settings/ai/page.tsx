"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  AIProvider,
  AIModel,
  AIProviderConfig,
  AIAreaConfig,
  AISettings,
  AI_PROVIDERS,
  AI_AREAS
} from "@/types/ai"
import {
  Brain,
  Key,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Code,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AISettingsService } from "@/lib/ai-settings-service"
import { AIPromptsEditor } from "@/components/settings/ai-prompts-editor"
import { withBasePath } from "@/lib/api-path"

/** Providers that render editable name + base URL fields instead of a read-only endpoint display */
const CUSTOM_PROVIDERS: AIProvider[] = ['custom1', 'custom2', 'custom3']

function isCustomProvider(p: AIProvider): boolean {
  return CUSTOM_PROVIDERS.includes(p)
}

export default function AISettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [testingProvider, setTestingProvider] = React.useState<AIProvider | null>(null)
  const [showKeys, setShowKeys] = React.useState<Record<AIProvider, boolean>>({} as Record<AIProvider, boolean>)
  const [settingsLoaded, setSettingsLoaded] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  // Feature 3: per-provider collapse state
  const [collapsed, setCollapsed] = React.useState<Record<AIProvider, boolean>>({} as Record<AIProvider, boolean>)

  const aiSettingsService = React.useRef(AISettingsService.getInstance())
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = React.useRef<string | null>(null)

  // Initialize with default settings
  const getDefaultSettings = (): AISettings => {
    const defaultProviders: Record<AIProvider, AIProviderConfig> = {} as Record<AIProvider, AIProviderConfig>
    // Ensure ALL providers from AI_PROVIDERS are included (including custom1/2/3)
    const allProviders: AIProvider[] = [
      'anthropic', 'chutes', 'openai', 'openrouter', 'gemini',
      'minimax', 'mercury', 'perplexity', 'mistral', 'xai',
      'groq', 'fireworks',
      'custom1', 'custom2', 'custom3'
    ]

    allProviders.forEach((provider) => {
      defaultProviders[provider] = {
        provider: provider,
        apiKey: '',
        enabled: false,
        models: [],
        // Custom endpoints start with empty baseUrl so the user fills it in
        baseUrl: isCustomProvider(provider) ? '' : undefined
      }
    })

    return {
      providers: defaultProviders,
      areas: AI_AREAS.map(area => ({
        ...area,
        fallbackEnabled: true
      })),
      globalFallbackEnabled: true
    }
  }

  const [settings, setSettings] = React.useState<AISettings>(getDefaultSettings())

  // Initialise collapse state once settings are loaded
  const initCollapseState = React.useCallback((s: AISettings) => {
    const state: Record<AIProvider, boolean> = {} as Record<AIProvider, boolean>
    ;(Object.keys(s.providers) as AIProvider[]).forEach((p) => {
      const cfg = s.providers[p]
      // Enabled providers and custom slots default OPEN; disabled commercial providers default COLLAPSED
      const defaultOpen = cfg.enabled || isCustomProvider(p)
      state[p] = !defaultOpen // true = collapsed
    })
    setCollapsed(state)
  }, [])

  const loadSettings = React.useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch(withBasePath('/api/ai/settings'))
      if (response.ok) {
        const data = await response.json()
        if (data && data.providers) {
          const mergedSettings = getDefaultSettings()
          Object.keys(data.providers).forEach(provider => {
            if (mergedSettings.providers[provider as AIProvider]) {
              mergedSettings.providers[provider as AIProvider] = data.providers[provider]
            }
          })
          mergedSettings.areas = (data.areas || mergedSettings.areas).map((area: AIAreaConfig) => ({
            ...area,
            currentProvider: area.currentProvider || undefined,
            currentModel: area.currentModel || undefined
          }))
          mergedSettings.globalFallbackEnabled = data.globalFallbackEnabled ?? true
          lastSavedRef.current = JSON.stringify(mergedSettings)
          aiSettingsService.current.saveSettings(mergedSettings)
          setSettings(mergedSettings)
          initCollapseState(mergedSettings)
          window.dispatchEvent(new CustomEvent('ai-settings-loaded'))
          setSettingsLoaded(true)
          return
        }
      }
    } catch (error) {
      console.error('Failed to load settings from server:', error)
      setLoadError('Unable to load AI settings, using defaults until connection is restored.')
    }

    const defaults = getDefaultSettings()
    lastSavedRef.current = JSON.stringify(defaults)
    aiSettingsService.current.saveSettings(defaults)
    setSettings(defaults)
    initCollapseState(defaults)
    window.dispatchEvent(new CustomEvent('ai-settings-loaded'))
    setSettingsLoaded(true)
  }, [initCollapseState])

  React.useEffect(() => {
    if (!settingsLoaded) {
      loadSettings()
    }
  }, [settingsLoaded, loadSettings])

  React.useEffect(() => {
    if (settingsLoaded) {
      const serializedSettings = JSON.stringify(settings)

      if (serializedSettings === lastSavedRef.current) {
        return
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      aiSettingsService.current.saveSettings(settings)

      saveTimeoutRef.current = setTimeout(() => {
        fetch(withBasePath('/api/ai/settings'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: serializedSettings
        })
          .then(() => {
            lastSavedRef.current = serializedSettings
            window.dispatchEvent(new CustomEvent('ai-settings-loaded'))
          })
          .catch(err => console.error('Failed to save settings to server:', err))
      }, 500)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [settings, settingsLoaded])

  const updateProviderConfig = (provider: AIProvider, updates: Partial<AIProviderConfig>) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          ...updates
        }
      }
    }))
  }

  const updateAreaConfig = (areaId: string, updates: Partial<AIAreaConfig>) => {
    setSettings(prev => ({
      ...prev,
      areas: prev.areas.map(area =>
        area.id === areaId ? { ...area, ...updates } : area
      )
    }))
  }

  const testConnection = async (provider: AIProvider) => {
    setTestingProvider(provider)
    try {
      const response = await fetch(withBasePath('/api/ai/test-connection'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: settings.providers[provider].apiKey,
          baseUrl: settings.providers[provider].baseUrl
        })
      })

      const result = await response.json()

      if (result.success) {
        const displayName = isCustomProvider(provider)
          ? (settings.providers[provider].displayName || AI_PROVIDERS[provider].name)
          : AI_PROVIDERS[provider].name

        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${displayName}`,
          variant: "default"
        })

        updateProviderConfig(provider, {
          connectionStatus: 'success',
          connectionError: undefined,
          models: Array.from(new Map(((result.models || []) as AIModel[]).map((m) => [m.id, m])).values())
        })
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to provider",
          variant: "destructive"
        })

        updateProviderConfig(provider, {
          connectionStatus: 'failed',
          connectionError: result.error || 'Connection failed'
        })
      }
    } catch {
      toast({
        title: "Connection Error",
        description: "Network error while testing connection",
        variant: "destructive"
      })
    } finally {
      setTestingProvider(null)
    }
  }

  const fetchModels = async (provider: AIProvider) => {
    // Custom endpoints need a baseUrl set
    if (isCustomProvider(provider) && !settings.providers[provider].baseUrl) {
      toast({
        title: "Base URL Required",
        description: "Please enter the Base URL for this custom endpoint first",
        variant: "destructive"
      })
      return
    }

    if (!settings.providers[provider].apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key first",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(withBasePath('/api/ai/fetch-models'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: settings.providers[provider].apiKey,
          baseUrl: settings.providers[provider].baseUrl
        })
      })

      const result = await response.json()

      if (result.success && result.models) {
        const dedupedModels = Array.from(
          new Map((result.models as AIModel[]).map((m) => [m.id, m])).values()
        )
        const displayName = isCustomProvider(provider)
          ? (settings.providers[provider].displayName || AI_PROVIDERS[provider].name)
          : AI_PROVIDERS[provider].name

        updateProviderConfig(provider, { models: dedupedModels })
        toast({
          title: "Models Updated",
          description: `Found ${dedupedModels.length} models for ${displayName}`,
          variant: "default"
        })
      } else {
        toast({
          title: "Failed to Fetch Models",
          description: result.error || "Could not retrieve model list",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch models",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyApiKey = (provider: AIProvider) => {
    navigator.clipboard.writeText(settings.providers[provider].apiKey)
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
      variant: "default"
    })
  }

  // Feature 3: collapse helpers
  const toggleCollapse = (provider: AIProvider) => {
    setCollapsed(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const expandAll = () => {
    const next: Record<AIProvider, boolean> = {} as Record<AIProvider, boolean>
    ;(Object.keys(settings.providers) as AIProvider[]).forEach(p => { next[p] = false })
    setCollapsed(next)
  }

  const collapseAll = () => {
    const next: Record<AIProvider, boolean> = {} as Record<AIProvider, boolean>
    ;(Object.keys(settings.providers) as AIProvider[]).forEach(p => { next[p] = true })
    setCollapsed(next)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Settings</h2>
        <Badge variant="secondary" className="gap-1">
          <Shield className="h-3 w-3" />
          Secure Storage
        </Badge>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="providers" className="gap-2">
            <Key className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="areas" className="gap-2">
            <Brain className="h-4 w-4" />
            Area Assignment
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <Code className="h-4 w-4" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              API keys are securely stored on the server only. All settings are persisted in the container/database and never stored in browser localStorage.
            </AlertDescription>
          </Alert>

          {/* Feature 3: Expand / Collapse all control */}
          <div className="flex items-center justify-end gap-2 text-sm">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse all
            </Button>
          </div>

          <div className="grid gap-4">
            {Object.entries(AI_PROVIDERS).map(([key, provider]) => {
              const providerKey = key as AIProvider
              const config = settings.providers[providerKey]
              const isShowingKey = showKeys[providerKey]
              const isCollapsed = !!collapsed[providerKey]
              const isCustom = isCustomProvider(providerKey)

              // For custom endpoints, use the user-set displayName as the title if available
              const cardTitle = isCustom
                ? (config.displayName?.trim() || provider.name)
                : provider.name

              return (
                <Card
                  key={providerKey}
                  className={config.enabled ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-gray-200 dark:border-gray-800'}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{cardTitle}</CardTitle>
                        <CardDescription>
                          {config.enabled ? (
                            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                      {/* Switch and chevron are separate — clicking Switch does NOT toggle collapse */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) =>
                            updateProviderConfig(providerKey, { enabled: checked })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={isCollapsed ? "Expand provider" : "Collapse provider"}
                          onClick={() => toggleCollapse(providerKey)}
                        >
                          {isCollapsed
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronUp className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Feature 3: collapsible body */}
                  {!isCollapsed && (
                    <CardContent className="space-y-4">
                      {/* Feature 1: editable name + base URL for custom providers */}
                      {isCustom && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor={`${providerKey}-displayname`}>Endpoint Name</Label>
                            <Input
                              id={`${providerKey}-displayname`}
                              value={config.displayName || ''}
                              onChange={(e) =>
                                updateProviderConfig(providerKey, { displayName: e.target.value })
                              }
                              placeholder={`e.g. My cliproxy (${provider.name})`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${providerKey}-baseurl`}>Base URL</Label>
                            <Input
                              id={`${providerKey}-baseurl`}
                              value={config.baseUrl || ''}
                              onChange={(e) =>
                                updateProviderConfig(providerKey, { baseUrl: e.target.value })
                              }
                              placeholder="http://192.168.x.x:PORT/v1"
                              className="font-mono text-xs"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor={`${providerKey}-key`}>API Key</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={`${providerKey}-key`}
                              type={isShowingKey ? "text" : "password"}
                              value={config.apiKey}
                              onChange={(e) =>
                                updateProviderConfig(providerKey, { apiKey: e.target.value })
                              }
                              placeholder="Enter your API key"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowKeys(prev => ({
                                  ...prev,
                                  [providerKey]: !prev[providerKey]
                                }))}
                              >
                                {isShowingKey ?
                                  <EyeOff className="h-4 w-4" /> :
                                  <Eye className="h-4 w-4" />
                                }
                              </Button>
                              {config.apiKey && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyApiKey(providerKey)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => testConnection(providerKey)}
                            disabled={
                              !config.apiKey ||
                              testingProvider === providerKey ||
                              (isCustom && !config.baseUrl)
                            }
                          >
                            {testingProvider === providerKey ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              "Test"
                            )}
                          </Button>
                        </div>
                        {/* API Key Status Indicator */}
                        {config.apiKey && config.connectionStatus && (
                          <div className="flex items-center gap-2 text-sm">
                            {config.connectionStatus === 'success' ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">Working</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-red-600">Failed - {config.connectionError || 'Connection error'}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* API Endpoint Display — read-only for commercial providers */}
                      {!isCustom && (
                        <div className="space-y-2">
                          <Label>API Endpoint</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={config.baseUrl || provider.baseUrl}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(config.baseUrl || provider.baseUrl)
                                toast({
                                  title: "Copied!",
                                  description: "API endpoint copied to clipboard",
                                })
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {(providerKey === 'openrouter' || providerKey === 'chutes' || providerKey === 'mercury') && (
                        <div className="space-y-2">
                          <Label htmlFor={`${providerKey}-url`}>Custom Base URL (Optional)</Label>
                          <Input
                            id={`${providerKey}-url`}
                            value={config.baseUrl || ''}
                            onChange={(e) =>
                              updateProviderConfig(providerKey, { baseUrl: e.target.value })
                            }
                            placeholder={provider.baseUrl}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Available Models</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchModels(providerKey)}
                            disabled={!config.apiKey || loading || (isCustom && !config.baseUrl)}
                          >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>
                        <ScrollArea className="h-32 w-full rounded-md border p-2">
                          {config.models && config.models.length > 0 ? (
                            <div className="space-y-1">
                              {Array.from(new Map(config.models.map((m) => [m.id, m])).values()).map((model) => (
                                <div key={model.id} className="text-sm">
                                  <div className="font-medium">{model.name}</div>
                                  {model.description && (
                                    <div className="text-xs text-muted-foreground">
                                      {model.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {isCustom && !config.baseUrl
                                ? 'Set the Base URL first, then click Refresh.'
                                : 'No models loaded. Click refresh to fetch available models.'}
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      <div className="flex gap-2 text-sm">
                        <a
                          href={getProviderDocsUrl(providerKey)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          API Documentation
                        </a>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="areas" className="space-y-4">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Assign different AI models to specific areas of the application for optimized performance.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {settings.areas.map((area) => {
              const selectedProvider = area.currentProvider
              const providerModels = selectedProvider ?
                settings.providers[selectedProvider].models || [] : []

              return (
                <Card key={area.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{area.name}</CardTitle>
                    <CardDescription>{area.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select
                          value={area.currentProvider || ''}
                          onValueChange={(value) =>
                            updateAreaConfig(area.id, {
                              currentProvider: value as AIProvider,
                              currentModel: undefined
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(settings.providers)
                              .filter(([, config]) => config.enabled && config.apiKey)
                              .map(([key, config]) => {
                                const p = key as AIProvider
                                const label = isCustomProvider(p)
                                  ? (config.displayName?.trim() || AI_PROVIDERS[p].name)
                                  : AI_PROVIDERS[p].name
                                return (
                                  <SelectItem key={key} value={key}>
                                    {label}
                                  </SelectItem>
                                )
                              })
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select
                          value={area.currentModel || ''}
                          onValueChange={(value) =>
                            updateAreaConfig(area.id, { currentModel: value })
                          }
                          disabled={!selectedProvider || providerModels.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {providerModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${area.id}-fallback`}
                        checked={area.fallbackEnabled}
                        onCheckedChange={(checked) =>
                          updateAreaConfig(area.id, { fallbackEnabled: checked })
                        }
                      />
                      <Label htmlFor={`${area.id}-fallback`}>
                        Enable fallback to local AI if provider fails
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General AI Settings</CardTitle>
              <CardDescription>
                Configure global AI behavior and fallback options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="global-fallback"
                  checked={settings.globalFallbackEnabled}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, globalFallbackEnabled: checked }))
                  }
                />
                <Label htmlFor="global-fallback">
                  Enable global fallback to local AI when all providers fail
                </Label>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Export/Import Settings</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const data = JSON.stringify(settings, null, 2)
                      const blob = new Blob([data], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'apexfit-ai-settings.json'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    Export Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = '.json'
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) {
                          const text = await file.text()
                          try {
                            const imported = JSON.parse(text)
                            setSettings(imported)
                            toast({
                              title: "Settings Imported",
                              description: "AI settings have been imported successfully",
                              variant: "default"
                            })
                          } catch {
                            toast({
                              title: "Import Failed",
                              description: "Invalid settings file",
                              variant: "destructive"
                            })
                          }
                        }
                      }
                      input.click()
                    }}
                  >
                    Import Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <AIPromptsEditor
            onSave={async () => {
              try {
                toast({
                  title: "Prompts Saved",
                  description: "Your AI prompt configurations have been saved successfully.",
                })
              } catch {
                toast({
                  title: "Save Failed",
                  description: "Failed to save prompt configurations. Please try again.",
                  variant: "destructive",
                })
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getProviderDocsUrl(provider: AIProvider): string {
  const urls: Record<AIProvider, string> = {
    anthropic: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
    chutes: 'https://docs.chutes.ai',
    openai: 'https://platform.openai.com/docs/api-reference',
    openrouter: 'https://openrouter.ai/docs',
    gemini: 'https://ai.google.dev/gemini-api/docs',
    minimax: 'https://api.minimax.chat/document',
    mercury: 'https://docs.mercury.ai',
    perplexity: 'https://docs.perplexity.ai',
    mistral: 'https://docs.mistral.ai',
    xai: 'https://docs.x.ai',
    groq: 'https://console.groq.com/docs/quickstart',
    fireworks: 'https://docs.fireworks.ai/guides/querying-text-models',
    custom1: '#',
    custom2: '#',
    custom3: '#'
  }
  return urls[provider] ?? '#'
}
