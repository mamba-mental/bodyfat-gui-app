# Complete Documentation: Hooks and MCP Servers

## Table of Contents
1. [Overview](#overview)
2. [Hooks Documentation](#hooks-documentation)
   - [Voice Notification Hooks](#voice-notification-hooks)
   - [Tool Usage Hooks](#tool-usage-hooks)
   - [Safety Hooks](#safety-hooks)
   - [Subagent Hooks](#subagent-hooks)
   - [User Prompt Hooks](#user-prompt-hooks)
3. [MCP Servers Documentation](#mcp-servers-documentation)
   - [Core MCP Servers](#core-mcp-servers)
   - [Voice & TTS MCP Servers](#voice--tts-mcp-servers)
   - [Task Management MCP](#task-management-mcp)
   - [Database MCP](#database-mcp)
   - [File System MCP](#file-system-mcp)
   - [Code Analysis MCP](#code-analysis-mcp)
   - [External Services MCP](#external-services-mcp)
4. [App Functionality Documentation](#app-functionality-documentation)
   - [Architecture Overview](#architecture-overview)
   - [Frontend Features](#frontend-features)
   - [Backend API](#backend-api)
   - [Data Management](#data-management)
   - [PRIME Calculation Engine](#prime-calculation-engine)
5. [Installation & Configuration](#installation--configuration)
6. [Troubleshooting](#troubleshooting)

## Overview

This document provides comprehensive documentation for all hooks and MCP (Model Context Protocol) servers configured in the Body Fat Estimator Terminal application. The system uses a sophisticated hook-based architecture for voice notifications and an extensive MCP ecosystem for seamless integration between various services.

### Key Components
- **Hooks**: Event-driven scripts that trigger at specific points in the application lifecycle
- **MCP Servers**: Specialized microservices that provide enhanced capabilities to Claude AI
- **Voice/TTS System**: Multi-provider text-to-speech with ElevenLabs, OpenAI, and pyttsx3 fallback
- **Task Management**: AI-powered task tracking and management system
- **Database Integration**: SQLite database with MCP server access

## Hooks Documentation

### Voice Notification Hooks

The voice notification system provides real-time audio feedback for application events using a sophisticated TTS pipeline.

#### File Location
- **Main Documentation**: `.claude/hooks/README.md`
- **Configuration**: `.claude/hooks/tts-config.json`
- **Installation Script**: `.claude/hooks/install-tts-dependencies.sh`

#### Features

**Multi-Provider TTS Support**
1. **ElevenLabs** (Primary)
   - High-quality voice synthesis
   - Multiple voice options (Adam, Sam, Bella, etc.)
   - Real-time streaming capability
   - Requires API key

2. **OpenAI TTS** (Secondary)
   - Standard quality voices
   - Faster response times
   - Cost-effective alternative
   - Requires API key

3. **pyttsx3** (Fallback)
   - Offline capability
   - System-native voices
   - No API required
   - Cross-platform support

**Supported Voice Events**
- Tool use completion
- Error notifications
- Status updates
- Warning messages
- Custom notifications

**Audio Features**
- Volume normalization
- Speed adjustment (0.5x to 2.0x)
- Voice gender selection
- Audio format conversion (MP3, WAV, OGG)
- Background playback

#### Configuration

```json
{
  "enabled": true,
  "primary_provider": "elevenlabs",
  "fallback_provider": "openai",
  "offline_provider": "pyttsx3",
  "voice_settings": {
    "elevenlabs": {
      "voice_id": "pNInz6obpgDQGcFmaJgB",
      "model": "eleven_monolingual_v1"
    },
    "openai": {
      "voice": "alloy",
      "model": "tts-1"
    },
    "pyttsx3": {
      "voice_gender": "male",
      "rate": 200
    }
  },
  "events": {
    "tool_complete": true,
    "errors": true,
    "warnings": false,
    "status_updates": false
  }
}
```

#### Installation

1. **Install dependencies**:
   ```bash
   chmod +x .claude/hooks/install-tts-dependencies.sh
   .claude/hooks/install-tts-dependencies.sh
   ```

2. **Set API keys**:
   ```bash
   export ELEVENLABS_API_KEY="your_key_here"
   export OPENAI_API_KEY="your_key_here"
   ```

3. **Test TTS**:
   ```bash
   .claude/hooks/test-tts.sh "Hello, this is a test"
   ```

### Tool Usage Hooks

#### Configuration: `.claude/hooks/example-hook-config.json`

**PostToolUse Hook**
- **Purpose**: Logs file editing operations
- **Matcher**: `Edit|Write|MultiEdit`
- **Action**: Executes `.claude/hooks/log-tool-usage.sh`
- **Description**: Automatically tracks all file modifications

**PreToolUse Hook**
- **Purpose**: Blocks dangerous bash commands
- **Matcher**: `Bash`
- **Action**: Command validation script
- **Protection**: Prevents deletion of critical files (*.env, credentials, secrets)

### Safety Hooks

**Dangerous Command Blocking**
```json
{
  "type": "command",
  "command": "bash -c 'input=$(cat); cmd=$(echo \"$input\" | jq -r \".tool_input.command // empty\"); if [[ \"$cmd\" =~ (rm|delete).*(\\*|\\.env|credentials|secret) ]]; then echo \"{\\\"action\\\": \\\"block\\\", \\\"message\\\": \\\"Dangerous command blocked: $cmd\\\"}\"; else echo \"{}\"; fi'",
  "description": "Block dangerous bash commands"
}
```

### Subagent Hooks

**Validation Gates Tracking**
- Triggers when `validation-gates` subagent completes
- Logs completion status
- Provides feedback on testing phases

### User Prompt Hooks

**Testing Reminder System**
- Analyzes user prompts for testing keywords
- Suggests using validation-gates subagent
- Prompts comprehensive testing approach

## MCP Servers Documentation

### Core MCP Servers

#### 1. Task Master AI (`task-master-ai`)
**Purpose**: AI-powered task management and project tracking
- **Command**: `npx -y --package=task-master-ai task-master-ai`
- **Features**:
  - Task creation and management
  - PRD parsing and task generation
  - Complexity analysis
  - Dependency tracking
  - Progress monitoring

**Key Tools**:
- `initialize_project`: Set up new project
- `parse_prd`: Generate tasks from PRD
- `get_tasks`: List all tasks
- `add_task`: Create new task
- `expand_task`: Break task into subtasks
- `set_task_status`: Update task status

#### 2. Serena (`serena`)
**Purpose**: Semantic code analysis and intelligent navigation
- **Features**:
  - Symbol-based code navigation
  - Relationship mapping
  - Memory management
  - Project activation

**Key Tools**:
- `get_symbols_overview`: Get file symbols
- `find_symbol`: Locate specific symbols
- `find_referencing_symbols`: Find symbol references
- `search_for_pattern`: Pattern-based search

### Voice & TTS MCP Servers

#### 1. Voice Mode Custom (`voice-mode-custom`)
**Purpose**: Advanced voice conversation capabilities
- **Features**:
  - Real-time voice conversations
  - Multiple TTS providers
  - STT (Speech-to-Text) integration
  - Audio device management
  - Pronunciation rules

**Key Tools**:
- `converse`: Have voice conversations
- `voice_status`: Check voice service status
- `list_tts_voices`: List available voices
- `pronounce`: Manage pronunciation rules
- `service`: Manage voice services

#### 2. Voice Mode Docker (`voice-mode-docker`)
**Purpose**: Containerized voice services
- **Features**:
  - Docker-based deployment
  - Service isolation
  - Easier management
  - Port mapping

#### 3. TTS MCP Server (`tts-mcp-server`)
**Purpose**: Text-to-speech conversion
- **Features**:
  - System TTS integration
  - Multiple providers (system, GTTS, eSpeak, ElevenLabs)
  - Voice selection
  - Rate control

**Key Tools**:
- `speak_text`: Convert text to speech
- `list_voices`: Show available voices

### Task Management MCP

#### Task Master Commands
```bash
# Core workflow
task-master init                    # Initialize project
task-master parse-prd <file>        # Generate tasks from PRD
task-master list                   # Show all tasks
task-master next                   # Get next task
task-master show <id>             # View task details
task-master set-status --id=<id> --status=done  # Complete task

# Task operations
task-master add-task --prompt="description"  # Add task
task-master expand --id=<id> --research       # Expand task
task-master update-task --id=<id> --prompt="changes"  # Update task
```

### Database MCP

#### SQLite (`sqlite`)
**Purpose**: Database operations and management
- **Features**:
  - Query execution
  - Table management
  - Data manipulation
  - Schema inspection

**Key Tools**:
- `read_query`: Execute SELECT queries
- `write_query`: Execute INSERT/UPDATE/DELETE
- `create_table`: Create new tables
- `list_tables`: Show all tables
- `describe_table`: Get table schema

#### Memory Bank (`memory`)
**Purpose**: Knowledge graph management
- **Features**:
  - Entity creation and management
  - Relationship tracking
  - Observation storage
  - Knowledge retrieval

**Key Tools**:
- `create_entities`: Create new entities
- `create_relations`: Create relationships
- `add_observations`: Add observations
- `read_graph`: Read knowledge graph
- `search_nodes`: Search entities

### File System MCP

#### File System (`filesystem`)
**Purpose**: File and directory operations
- **Features**:
  - File reading/writing
  - Directory listing
  - Path operations
  - File metadata

### Code Analysis MCP

#### Context7 (`context7`)
**Purpose**: Library documentation and code examples
- **Features**:
  - Up-to-date documentation retrieval
  - Code examples
  - Library information

**Key Tools**:
- `resolve-library-id`: Resolve library names
- `get-library-docs`: Get documentation

### External Services MCP

#### GitHub (`github`)
**Purpose**: GitHub repository management
- **Features**:
  - Repository operations
  - Issue management
  - Pull requests
  - Code search

#### Linear (`linear`)
**Purpose**: Project management integration
- **Features**:
  - Issue tracking
  - Project management
  - Team collaboration

#### Exa Web Search (`exa-websearch`)
**Purpose**: Web search capabilities
- **Features**:
  - Real-time web search
  - Content scraping
  - Code context search

## App Functionality Documentation

### Architecture Overview

**Technology Stack**
- **Frontend**: Next.js 15.3.4 with App Router
- **Backend**: Python FastAPI microservice
- **Database**: SQLite with Docker volume persistence
- **Containerization**: Docker Compose
- **State Management**: React Context API
- **UI Components**: Tailwind CSS + Custom Components

**Application Structure**
```
bodyfat-gui-app/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes (proxy to Python)
│   │   ├── page.tsx         # Dashboard
│   │   ├── settings/       # Settings pages
│   │   └── reports/        # Report management
│   ├── components/         # React components
│   │   ├── charts/         # Data visualization
│   │   ├── forms/          # Data entry forms
│   │   └── ui/             # UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions
├── python-api/              # FastAPI backend
│   ├── main_simple.py      # API entry point
│   ├── database.py         # Database operations
│   └── new_prime_python_code/  # PRIME calculations
├── data/                   # Database storage
├── .claude/               # Claude configuration
│   ├── hooks/             # Hook scripts
│   └── settings.json      # Claude settings
├── .mcp.json              # MCP server configuration
└── docker-compose.dev.yml # Development environment
```

### Frontend Features

#### 1. Dashboard (`src/app/page.tsx`)
- **Data Visualization**: Interactive charts for progress tracking
- **Quick Actions**: Fast access to common operations
- **Status Overview**: Current metrics and goals
- **Recent Activity**: Latest entries and calculations

#### 2. Settings Management
- **AI Settings** (`src/app/settings/ai/page.tsx`): Configure AI behavior
- **Theme Settings**: Dark/light mode persistence
- **Font Selection**: Typography customization
- **Profile Management**: User preferences

#### 3. Data Entry Forms
- **Entry Form** (`src/components/forms/entry-form.tsx`):
  - Body measurements input
  - Progress photos upload
  - Goal setting
  - Automatic calculations

#### 4. Reports (`src/app/reports/page.tsx`)
- **Report Generation**: Create detailed progress reports
- **PRIME Integration**: Advanced calculation engine
- **Export Options**: PDF, CSV, JSON formats
- **Historical Tracking**: Progress over time

#### 5. Charts and Visualizations
- **Progress Trend Chart**: Historical data visualization
- **Calorie Management Widget**: Nutrition tracking
- **Metabolic Insights**: Health metrics analysis
- **Goal Progress Widget**: Achievement tracking

### Backend API

#### FastAPI Microservice
- **Location**: `python-api/main_simple.py`
- **Port**: 8001 (containerized)
- **Endpoints**:
  - `/api/data/user`: User data management
  - `/api/data/entries`: Body composition entries
  - `/api/data/reports`: Report generation
  - `/api/data/calculation`: Calculation results
  - `/api/generate-report`: PRIME report generation

#### Database Layer
- **File**: `python-api/database.py`
- **Engine**: SQLite
- **Path**: `/app/data/bodyfat.db` (configurable via DATA_DIR)
- **Features**:
  - Data persistence across container restarts
  - Automatic schema migration
  - Backup and restore capabilities

### Data Management

#### Entry Management
- **Create**: Add new body composition entries
- **Read**: Retrieve historical data
- **Update**: Modify existing entries
- **Delete**: Remove entries with confirmation

#### Report Generation
- **PRIME Engine**: Advanced calculation algorithms
- **Template System**: Customizable report formats
- **Export Options**: Multiple format support
- **Automation**: Scheduled report generation

### PRIME Calculation Engine

#### Location: `new_prime_python_code/`

#### Core Modules
1. **PRIME_Report_Generator_v3_Fast.py**
   - Main report generation logic
   - 14-section report format
   - High-performance calculations

2. **PRIME_Calculations.py**
   - Body fat percentage calculations
   - Lean mass analysis
   - Metabolic rate calculations

3. **PRIME_Diet_Calculations_v2.py**
   - Calorie requirements
   - Macronutrient distribution
   - Meal planning algorithms

4. **PRIME_RMR_Calculations_v2.py**
   - Resting metabolic rate
   - Activity factors
   - Energy expenditure

#### Features
- **Precision**: 0.0001 floating-point tolerance
- **Performance**: <5s generation time
- **Validation**: Numerical and visual verification
- **Templates**: Customizable report sections

## Installation & Configuration

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.12+ (for local development)
- API keys for TTS services (optional)

### Setup Steps

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd bodyfat-gui-app
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start Services**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Install Dependencies**:
   ```bash
   # Frontend
   npm install

   # Python (if developing locally)
   cd python-api
   pip install -r requirements.txt
   ```

5. **Configure MCP Servers**:
   - Edit `.mcp.json` with your API keys
   - Ensure all required environment variables are set

6. **Install Hooks**:
   ```bash
   chmod +x .claude/hooks/install-tts-dependencies.sh
   .claude/hooks/install-tts-dependencies.sh
   ```

### Environment Variables

```bash
# API Keys
ELEVENLABS_API_KEY="your_key_here"
OPENAI_API_KEY="your_key_here"
ANTHROPIC_API_KEY="your_key_here"
PERPLEXITY_API_KEY="your_key_here"

# Database
DATA_DIR="/app/data"

# Services
NEXT_PUBLIC_PYTHON_API_URL="http://127.0.0.1:8001"
```

## Troubleshooting

### Common Issues

#### 1. Voice Notifications Not Working
**Symptoms**: No audio feedback on tool completion
**Solutions**:
- Check API keys are set correctly
- Verify TTS dependencies are installed
- Run test script: `.claude/hooks/test-tts.sh`
- Check audio device permissions

#### 2. MCP Server Connection Issues
**Symptoms**: Tool connection errors
**Solutions**:
- Verify `.mcp.json` configuration
- Check API keys are valid
- Ensure servers are running: `docker-compose ps`
- Restart MCP services

#### 3. Database Connection Errors
**Symptoms**: Data not loading/saving
**Solutions**:
- Check DATA_DIR environment variable
- Verify database file permissions
- Restart containers: `docker-compose restart`
- Check database logs: `docker-compose logs python-api`

#### 4. Docker Networking Issues
**Symptoms**: ECONNREFUSED errors
**Solutions**:
- Check port mapping in docker-compose.yml
- Verify services are running on correct ports
- Check firewall settings
- Use `docker network ls` to inspect networks

#### 5. PRIME Report Generation Failures
**Symptoms**: Reports not generating or incorrect calculations
**Solutions**:
- Verify Python API is accessible
- Check template files exist in `/templates`
- Validate input data format
- Check Python logs for errors

### Debug Commands

```bash
# Check all services
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose logs -f nextjs
docker-compose logs -f python-api

# Test API endpoints
curl http://localhost:3000/api/data/entries
curl http://localhost:8001/api/data/entries

# Check MCP configuration
cat .mcp.json | jq '.mcpServers | keys'

# Test TTS
.claude/hooks/test-tts.sh "Test message"

# Verify database
sqlite3 data/bodyfat.db ".tables"
```

### Performance Optimization

#### 1. Database Optimization
- Use indexes on frequently queried columns
- Regular database vacuuming
- Connection pooling for high traffic

#### 2. Caching Strategy
- API response caching
- Static asset optimization
- Browser caching headers

#### 3. Container Optimization
- Resource limits in docker-compose.yml
- Health checks configured
- Graceful shutdown handling

---

## Additional Resources

- [Claude Code Documentation](CLAUDE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Development Guide](DEVELOPER_GUIDE.md)
- [Docker Deployment Guide](DOCKER_DEPLOYMENT_GUIDE.md)
- [User Manual](USER_MANUAL.md)

## Support

For issues or questions:
1. Check this documentation first
2. Review existing GitHub issues
3. Create new issue with detailed description
4. Include logs and configuration files

---

*Last Updated: 2025-01-07*
*Version: 1.3.1*