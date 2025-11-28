# 👨‍💻 Developer Guide - Ap³𝘹Fit.ai

## 📋 Overview

This guide provides technical information for developers working on the Ap³𝘹Fit.ai application. It covers architecture decisions, component patterns, and development workflows.

## 🏗️ Architecture Overview

### Frontend Architecture (Next.js)
```
src/
├── app/                    # Next.js 15 App Router
│   ├── (pages)/           # Route groups
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components (shadcn/ui)
│   ├── charts/            # Chart components with refresh system
│   ├── layout/            # Layout components
│   └── forms/             # Form components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and services
├── types/                 # TypeScript type definitions
└── python-api/            # Python FastAPI backend
```

### Key Design Patterns

#### 0. Navigation & Routing Notes
- All sidebar items must link to full-page routes using `next/link` (no modal popups). The changelog now lives at the `/changelog` page and should always be accessed via the sidebar link rather than a dialog component.

#### 1. Context + Reducer Pattern
```typescript
// AppContext manages global application state
interface AppState {
  current_user: UserData | null
  current_calculation: CalculationResult | null
  entries: Entry[]
  reports: Report[]
  loading: boolean
  error: string | null
}

// Actions for state updates
type AppAction = 
  | { type: 'SET_USER'; payload: UserData }
  | { type: 'ADD_ENTRY'; payload: Entry }
  | { type: 'SET_LOADING'; payload: boolean }
```

#### 2. Widget Refresh System
```typescript
// Subscription pattern for dashboard widgets
const { subscribeToDataChanges } = useApp()
const [refreshKey, setRefreshKey] = useState(0)

useEffect(() => {
  const unsubscribe = subscribeToDataChanges(() => {
    setRefreshKey(prev => prev + 1)
  })
  return unsubscribe // Cleanup function
}, [subscribeToDataChanges])
```

#### 3. Dual Storage Pattern
```typescript
// Theme persistence with localStorage + server storage
const updateTheme = async (newTheme: Theme) => {
  // 1. Update state immediately
  setTheme(newTheme)
  
  // 2. Save to localStorage for quick access
  localStorage.setItem('userSettings', JSON.stringify(settings))
  
  // 3. Save to server for persistence
  await fetch('/api/data/route', {
    method: 'POST',
    body: JSON.stringify({ key: 'user_theme_settings', data: { theme: newTheme } })
  })
}
```

## 🔧 Component Development

### UI Component Standards

All UI components follow shadcn/ui patterns:
```typescript
interface ComponentProps {
  className?: string
  children?: React.ReactNode
  // Component-specific props
}

export function Component({ className, children, ...props }: ComponentProps) {
  return (
    <div className={cn("default-styles", className)} {...props}>
      {children}
    </div>
  )
}
```

### Chart Component Pattern
```typescript
interface ChartWidgetProps {
  data?: DataType[]
  title?: string
  description?: string
}

export function ChartWidget({ data, title, description }: ChartWidgetProps) {
  const { subscribeToDataChanges } = useApp()
  const [refreshKey, setRefreshKey] = useState(0)

  // Auto-refresh subscription
  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setRefreshKey(prev => prev + 1)
    })
    return unsubscribe
  }, [subscribeToDataChanges])

  // Memoized calculations with refresh key
  const chartData = useMemo(() => {
    if (!data) return []
    return processData(data)
  }, [data, refreshKey])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          {/* Chart implementation */}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

### Form Component Pattern
```typescript
const formSchema = z.object({
  field: z.string().min(1, "Required field"),
})

type FormData = z.infer<typeof formSchema>

export function FormComponent() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      // Handle form submission
    } catch (error) {
      // Handle errors
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="field"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field Label</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
```

## 🔌 API Integration

### Next.js API Routes
```typescript
// app/api/route-name/route.ts
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const param = searchParams.get('param')
    
    // Handle request
    const result = await processRequest(param)
    
    return NextResponse.json(result, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}
```

### Python API Integration
```typescript
// Service layer for Python API calls
export class PythonAPIService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8000'
  }

  async calculate(userData: UserData): Promise<CalculationResult> {
    const response = await fetch(`${this.baseUrl}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      throw new Error(`Calculation failed: ${response.status}`)
    }

    return await response.json()
  }
}
```

### AI Provider Integration
```typescript
// AI service with multiple providers
export async function callAIProvider(
  provider: AIProvider,
  model: string,
  apiKey: string,
  message: string,
  context: any
): Promise<{ success: boolean; message: string }> {
  try {
    const systemPrompt = buildSystemPrompt(context)
    
    switch (provider) {
      case 'anthropic':
        return await callAnthropic(apiKey, model, systemPrompt, message)
      case 'openai':
        return await callOpenAI(apiKey, model, systemPrompt, message)
      // ... other providers
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  } catch (error) {
    console.error(`AI provider error:`, error)
    return { success: false, message: 'Failed to get AI response' }
  }
}
```

## 📦 State Management

### AppContext Structure
```typescript
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  // Computed getters
  isAuthenticated: boolean
  hasCalculation: boolean
  // Action creators
  setUser: (user: UserData) => void
  addEntry: (entry: Entry) => Promise<void>
  generateNewReport: () => Promise<void>
  // Widget refresh system
  refreshWidgets: () => void
  subscribeToDataChanges: (callback: () => void) => () => void
}
```

### State Updates
```typescript
// Reducer pattern for predictable state updates
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, current_user: action.payload }
    
    case 'ADD_ENTRY':
      return { 
        ...state, 
        entries: [action.payload, ...state.entries] 
      }
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    default:
      return state
  }
}
```

## 🎨 Styling Guidelines

### Tailwind CSS Conventions
```typescript
// Use consistent spacing scale
const spacing = {
  xs: "p-2",    // 8px
  sm: "p-4",    // 16px  
  md: "p-6",    // 24px
  lg: "p-8",    // 32px
  xl: "p-12",   // 48px
}

// Responsive design patterns
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Content */}
</div>

// Component size variants
<Button size="sm" variant="outline">
  {/* Button content */}
</Button>
```

### CSS Custom Properties
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  /* ... */
}

[data-theme="dark"] {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

## 🧪 Testing Strategy

### Component Testing
```typescript
// Testing dashboard widgets
import { render, screen } from '@testing-library/react'
import { AppProvider } from '@/contexts/app-context'
import { DashboardWidget } from '../dashboard-widget'

describe('DashboardWidget', () => {
  const renderWithContext = (component: React.ReactElement) => {
    return render(
      <AppProvider>
        {component}
      </AppProvider>
    )
  }

  it('renders loading state correctly', () => {
    renderWithContext(<DashboardWidget loading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('refreshes data when entries change', async () => {
    // Test refresh functionality
  })
})
```

### API Testing
```typescript
// Testing API routes
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

describe('/api/data/route', () => {
  it('handles GET requests correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/route?key=test')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toBeDefined()
  })
})
```

## 🚀 Performance Optimization

### Code Splitting
```typescript
// Dynamic imports for large components
const ReportsPage = dynamic(() => import('./reports-page'), {
  loading: () => <Skeleton className="h-64 w-full" />
})

// Lazy load chart components
const ProgressChart = lazy(() => import('../charts/progress-chart'))
```

### Memoization Patterns
```typescript
// Expensive calculations
const expensiveData = useMemo(() => {
  return processLargeDataset(rawData)
}, [rawData])

// Event handlers
const handleClick = useCallback((id: string) => {
  onItemClick(id)
}, [onItemClick])

// Component memoization
export default memo(ExpensiveComponent)
```

### Bundle Optimization
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react']
  },
  webpack: (config) => {
    config.optimization.splitChunks.chunks = 'all'
    return config
  }
}
```

## 🔍 Debugging & Development Tools

### Debug Utilities
```typescript
// Debug logging utility
const debug = (namespace: string) => {
  const isEnabled = process.env.NODE_ENV === 'development' || 
                   localStorage.getItem('debug') === 'true'
  
  return (message: string, data?: any) => {
    if (isEnabled) {
      console.log(`[${namespace}] ${message}`, data)
    }
  }
}

const log = debug('AppContext')
log('User data updated', userData)
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

## 📋 Code Review Checklist

### Before Submitting PR
- [ ] All TypeScript types are properly defined
- [ ] Components include proper error handling
- [ ] Accessibility attributes are included
- [ ] Responsive design is tested
- [ ] No console errors or warnings
- [ ] Code follows established patterns
- [ ] Tests are included for new features
- [ ] Documentation is updated

### Performance Considerations
- [ ] Large datasets are properly memoized
- [ ] Components are properly memoized where needed
- [ ] No unnecessary re-renders
- [ ] Images are optimized
- [ ] Bundle size impact is minimal

## 🔐 Security Best Practices

### Client-Side Security
- Never store API keys in localStorage (use secure context only)
- Validate all user inputs with Zod schemas
- Sanitize data before display
- Use HTTPS in production

### API Security
- Implement proper CORS headers
- Validate request bodies
- Use rate limiting in production
- Log security events

---

*Last Updated: July 22, 2025*  
*Version: 1.3.0*  
*For additional technical details, see API_DOCUMENTATION.md and TROUBLESHOOTING.md*