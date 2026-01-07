# AI Prompts Configuration Documentation

## Overview

The AI Prompts Configuration system allows you to view, edit, and manage all AI prompts used throughout the Ap³𝘹Fit.ai application. This centralized system provides:

- Visual editing of all prompts
- Variable validation
- Revert to defaults capability
- Model and parameter configuration
- Export/import functionality

## Accessing the Prompts Editor

1. Navigate to **Settings** → **AI Settings**
2. Click on the **Prompts** tab
3. You'll see the AI Prompts Configuration interface

## Features

### 1. Prompt Categories

Prompts are organized into four categories:

- **Analysis**: Confidence analysis and calculations
- **Chat**: Interactive AI coach conversations
- **Insights**: Progress insights and recommendations
- **Report**: Report generation prompts

### 2. Prompt Editor Interface

Each prompt includes:
- **Name**: Descriptive name of the prompt
- **Description**: What the prompt is used for
- **Required Variables**: Template variables that must be present
- **Model Configuration**: Specific model, temperature, and token settings
- **Prompt Template**: The actual prompt text

### 3. Variable System

Prompts use a template variable system with double curly braces:
```
{{variable_name}}
```

Example:
```
Current Weight: {{current_weight}} lbs
Goal Weight: {{goal_weight}} lbs
```

### 4. Validation

The editor validates:
- All required variables are present
- Variable brackets are properly closed
- Prompt length is reasonable
- No syntax errors

### 5. Model Configuration

Each prompt can specify:
- **Model**: Any AI model name - choose from dropdown or enter custom
- **Temperature**: Creativity level (0.0 = deterministic, 1.0 = creative)
- **Max Tokens**: Maximum response length

#### Custom Model Names
You can now enter ANY model name in both:
1. **Global Default Model**: Set a custom default for all prompts
2. **Per-Prompt Model**: Override for specific prompts

Common models available in dropdown:
- Claude models (3.5 Sonnet, 3 Haiku, 3 Sonnet, 3 Opus)
- GPT models (GPT-4 Turbo, GPT-4, GPT-3.5 Turbo)
- Google models (Gemini Pro, Gemini 1.5 Pro)
- Open models (Mixtral, Llama 3.1, DeepSeek Coder)
- Or type any custom model name directly

## Available Prompts

### 1. Confidence Analysis
- **ID**: `confidence-analysis`
- **Purpose**: Analyzes body transformation plans and provides confidence scores
- **Variables**: `current_weight`, `goal_weight`, `current_bf`, `goal_bf`, `timeframe_weeks`, `tdee`, `daily_calories`, `weekly_weight_loss`

### 2. Confidence Analysis (Optimized)
- **ID**: `confidence-analysis-optimized`
- **Purpose**: Faster version with reduced token usage
- **Variables**: `weight_change`, `bf_change`, `weeks`, `deficit`, `tdee`, `age`, `gender`, `activity_factor`

### 3. Fitness Coach Chat
- **ID**: `fitness-coach-chat`
- **Purpose**: AI fitness coach for interactive chat
- **Variables**: `user_name`, `user_age`, `goal_weight`, `goal_bf`, `entries_count`

### 4. Fitness Insights Generator
- **ID**: `fitness-insights`
- **Purpose**: Generates personalized fitness insights
- **Variables**: `user_profile`, `entries_count`

### 5. Workout Recommendations
- **ID**: `workout-recommendations`
- **Purpose**: Personalized workout plans
- **Variables**: `workout_type`, `experience_level`, `workout_days`, `current_weight`, `goal_weight`

### 6. Nutrition Guidance
- **ID**: `nutrition-guidance`
- **Purpose**: Nutrition advice based on goals
- **Variables**: `diet_type`, `protein_intake`, `daily_calories`, `tdee`

## Editing Prompts

### Step-by-Step Guide

1. **Select a Prompt**: Choose from the dropdown menu
2. **Review Variables**: Check the required variables shown as badges
3. **Edit the Template**: Modify the prompt text in the editor
4. **Validation**: Watch for validation errors below the editor
5. **Save Changes**: Click "Save Changes" when ready

### Best Practices

1. **Keep Variables**: Don't remove required variables
2. **Be Specific**: Clear instructions produce better AI responses
3. **Test Changes**: Try your prompts before saving
4. **Document Changes**: Note why you customized a prompt

## Reverting to Defaults

### Individual Prompt Reset
- Click "Reset to Default" button next to any prompt
- This only affects the selected prompt

### Reset All Prompts
- Click "Reset All" in the header
- Confirms before resetting
- Restores all factory defaults

## Global AI Settings

Configure defaults for all prompts:
- **Default Model**: Fallback when prompt doesn't specify
- **Default Temperature**: Standard creativity level
- **Default Max Tokens**: Standard response length

## Integration with Application

### How Prompts Are Used

1. **Python Backend**: 
   - Confidence analysis uses the configured prompts
   - Model selection affects PRIME calculations

2. **TypeScript Frontend**:
   - Chat and insights use the prompts via API
   - Custom prompts are sent with requests

3. **Automatic Updates**:
   - Changes take effect immediately
   - No restart required

### API Integration

The prompts configuration integrates with:
- `/api/ai/chat` - Uses fitness-coach-chat prompt
- `/api/ai/insights` - Uses fitness-insights prompt
- Python `PRIME_AI_Confidence_Analyzer.py` - Uses confidence-analysis prompts

## Troubleshooting

### Common Issues

1. **Validation Errors**
   - Check all variables are present
   - Ensure brackets match: `{{` and `}}`

2. **Prompts Not Updating**
   - Clear browser cache
   - Check localStorage is enabled
   - Verify save was successful

3. **AI Responses Poor Quality**
   - Review prompt clarity
   - Check temperature settings
   - Ensure sufficient max tokens

### Storage

Prompts are stored in:
- **Browser**: localStorage key `ai-prompts-config`
- **Format**: JSON with prompts array and global settings

## Advanced Usage

### Creating Custom Variables

When editing prompts, you can use any variables that your application provides:
```
{{custom_metric}} - Your custom tracking
{{advanced_stat}} - Advanced statistics
```

### Model-Specific Optimizations

Different models work better with different prompt styles:
- **Claude 3.5 Sonnet**: Detailed, nuanced prompts
- **Claude 3 Haiku**: Concise, focused prompts
- **GPT-4**: Structured, clear instructions

### Performance Tips

1. **Use Optimized Prompts**: For high-frequency calls
2. **Reduce Token Count**: Shorter prompts = faster responses
3. **Cache Common Patterns**: Reuse successful prompts

## Export/Import

### Exporting Configuration
1. Go to General Settings tab
2. Click "Export Settings"
3. Save the JSON file

### Importing Configuration
1. Click "Import Settings"
2. Select your JSON file
3. Verify prompts loaded correctly

This allows sharing configurations between:
- Team members
- Development/production environments
- Backup/restore scenarios