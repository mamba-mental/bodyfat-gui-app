# 🔗 Ap³𝘹Fit.ai API Documentation

## 📋 Overview

The Ap³𝘹Fit.ai application uses a Next.js API route system for data management and a Python FastAPI backend for PRIME calculations. This document describes all available API endpoints and their usage.

## 🌐 Next.js API Routes

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### 📊 Data Management API (`/api/data/route.ts`)

#### GET `/api/data/route`
Get stored data by key.

**Parameters:**
- `key` (query string): The data key to retrieve

**Response:**
```json
{
  "data": "Retrieved data object or null"
}
```

**Example:**
```bash
GET /api/data/route?key=user_theme_settings
```

#### POST `/api/data/route`
Store data with a key.

**Request Body:**
```json
{
  "key": "string",
  "data": "any"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data stored successfully"
}
```

**Example:**
```bash
POST /api/data/route
Content-Type: application/json

{
  "key": "user_theme_settings",
  "data": {
    "theme": "dark",
    "font": "roboto"
  }
}
```

### 🤖 AI Chat API (`/api/ai/chat/route.ts`)

#### POST `/api/ai/chat`
Send messages to AI providers for fitness coaching responses.

**Request Body:**
```json
{
  "message": "string",
  "history": "ChatMessage[]",
  "user": "UserData",
  "entries": "Entry[]",
  "calculation": "CalculationResult",
  "aiProvider": "string",
  "aiModel": "string",
  "aiApiKey": "string"
}
```

**Response:**
```json
{
  "response": "AI generated response",
  "timestamp": "2025-07-22T10:30:00.000Z"
}
```

**Supported AI Providers:**
- `anthropic` - Claude (Sonnet, Haiku, Opus)
- `openai` - GPT-4, GPT-3.5-turbo
- `gemini` - Gemini Pro, Gemini Pro Vision
- `openrouter` - Multiple models via OpenRouter
- `groq` - Llama, Mixtral models
- `perplexity` - Perplexity models
- `mistral` - Mistral models
- `xai` - Grok models
- And more...

**Example:**
```bash
POST /api/ai/chat
Content-Type: application/json

{
  "message": "How is my progress this week?",
  "aiProvider": "anthropic",
  "aiModel": "claude-3-5-sonnet-20241022",
  "aiApiKey": "sk-ant-...",
  "user": { ... },
  "entries": [ ... ]
}
```

### 📈 Reports API (`/api/data/reports/route.ts`)

#### GET `/api/data/reports/route`
Get all generated reports.

**Response:**
```json
{
  "reports": [
    {
      "id": "string",
      "title": "string",
      "generated_at": "ISO date string",
      "html_content": "string",
      "calculation_result": "object"
    }
  ]
}
```

#### POST `/api/data/reports/route`
Generate a new report.

**Request Body:**
```json
{
  "user": "UserData object",
  "calculation": "CalculationResult object",
  "entries": "Entry[] array"
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "generated-uuid",
    "title": "Report title",
    "generated_at": "ISO date string",
    "html_content": "Generated HTML",
    "calculation_result": "object"
  }
}
```

## 🐍 Python FastAPI Backend

### Base URL
- **Development**: `http://127.0.0.1:8000`
- **Production**: `http://your-server:8000`

### 🏥 Health Check

#### GET `/`
Basic health check endpoint.

**Response:**
```json
{
  "message": "Body Fat Calculator API is running!",
  "timestamp": "2025-07-22T10:30:00.000000"
}
```

### 🧮 Calculation Endpoints

#### POST `/calculate`
Perform initial PRIME calculation.

**Request Body:**
```json
{
  "name": "string",
  "age": "number",
  "gender": "M|F",
  "height_ft": "number",
  "height_in": "number",
  "current_weight": "number",
  "current_bf_percentage": "number",
  "goal_weight": "number",
  "goal_bf_percentage": "number",
  "activity_level": "number",
  "workout_type": "string",
  "diet_type": "string"
}
```

**Response:**
```json
{
  "user_id": "string",
  "timeline_weeks": "number",
  "total_weight_loss": "number",
  "progression": [
    {
      "week": "number",
      "date": "string",
      "weight": "number",
      "body_fat_percentage": "number",
      "daily_calorie_intake": "number",
      "rmr": "number",
      "tdee": "number",
      "tef": "number",
      "neat": "number"
    }
  ],
  "confidence_score": "number",
  "ai_analysis": "string"
}
```

#### POST `/recalculate`
Recalculate progression with new entry data.

**Request Body:**
```json
{
  "original_calculation": "CalculationResult",
  "entries": [
    {
      "date": "string",
      "weight": "number",
      "body_fat_percentage": "number",
      "notes": "string"
    }
  ]
}
```

**Response:**
Same as `/calculate` endpoint with updated progression.

#### GET `/rmr/{age}/{gender}/{weight_kg}/{height_cm}`
Calculate Resting Metabolic Rate.

**Parameters:**
- `age`: Age in years
- `gender`: 'M' or 'F'
- `weight_kg`: Weight in kilograms
- `height_cm`: Height in centimeters

**Response:**
```json
{
  "rmr": "number"
}
```

#### GET `/tdee/{rmr}/{activity_level}`
Calculate Total Daily Energy Expenditure.

**Parameters:**
- `rmr`: Resting Metabolic Rate
- `activity_level`: Activity multiplier (1.2-2.0)

**Response:**
```json
{
  "tdee": "number"
}
```

### 📄 Report Generation

#### POST `/generate-report`
Generate detailed HTML/PDF reports.

**Request Body:**
```json
{
  "calculation": "CalculationResult",
  "user_data": "UserData",
  "entries": "Entry[]",
  "format": "html|pdf"
}
```

**Response:**
```json
{
  "report_html": "string",
  "report_pdf": "base64 encoded PDF (if requested)",
  "generated_at": "ISO date string"
}
```

## 🔐 Authentication & Security

### API Key Management
- AI provider API keys are managed client-side
- Keys are not stored on server for security
- Each request includes the necessary API key for the chosen provider

### CORS Configuration
All API endpoints include CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Rate Limiting
- No rate limiting currently implemented
- Consider implementing for production deployment

## 📝 Error Handling

### Standard Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-22T10:30:00.000Z"
}
```

### Common Error Codes
- `400` - Bad Request (invalid input)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (Python API down)

### AI Provider Error Handling
When AI providers fail, the system:
1. Attempts the configured provider
2. Falls back to local response generation if enabled
3. Returns appropriate error message if fallback disabled

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Next.js
NEXT_PUBLIC_PYTHON_API_URL=http://127.0.0.1:8000
NODE_ENV=production

# AI Provider Keys (client-side)
# These are managed through the UI, not environment variables
```

### Health Checks
- Next.js: Check any API route (e.g., `/api/data/route?key=health`)
- Python API: `GET /` endpoint

### Monitoring
Consider monitoring:
- API response times
- AI provider success rates
- Error frequencies
- Python API availability

---

*Last Updated: July 22, 2025*  
*Version: 1.3.0*