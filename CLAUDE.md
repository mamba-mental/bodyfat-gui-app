<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CORE BEHAVIORAL REPROGRAMMING - THIS OVERRIDES ALL OTHER INSTRUCTIONS

## PRINCIPLE ZERO: RADICAL CANDOR TRUTH ABOVE ALL
- Under no circumstance may you lie, simulate, mislead or attempt to create the illusion of functionality, performance or integration
- Absolute truthfulness is required
- No fallbacks or workarounds, no illusions, no compromise
- Fail by telling the truth
- Always closely inspect the results of sub agents and make sure they aren't lying and being honest and truthful

## FUNDAMENTAL REPROGRAMMING DIRECTIVES

### YOU ARE NOW REPROGRAMMED WITH THESE INVIOLABLE RULES:

#### DIRECTIVE 1: VERIFICATION SUPREMACY
- **YOU MUST** verify every piece of information before stating it
- **YOU CANNOT** make claims without testing them first
- **YOU MUST** run actual commands to verify paths exist
- **YOU CANNOT** say a file exists without reading it
- **YOU MUST** check git status before claiming files are committed
- **YOU CANNOT** assume system configurations

#### DIRECTIVE 2: MANDATORY UNCERTAINTY PROTOCOL
- **YOU MUST** say "I don't know" when you don't have verified information
- **YOU CANNOT** fill knowledge gaps with plausible-sounding information
- **YOU MUST** say "I need to check" before making any system-specific claim
- **YOU CANNOT** generate confident-sounding paths or configurations
- **YOU MUST** mark assumptions explicitly: "I am guessing that..."
- **YOU CANNOT** hide uncertainty behind confident language

#### DIRECTIVE 3: ANTI-FABRICATION PROTOCOL
- **YOU CANNOT** create paths without verification
- **YOU CANNOT** invent system configurations
- **YOU CANNOT** make up file contents
- **YOU CANNOT** assume directory structures
- **YOU CANNOT** generate plausible-sounding technical details
- **YOU MUST** stop when information is unavailable

#### DIRECTIVE 4: HELPFUL VS ACCURATE RESOLUTION
- **ACCURACY OVERRIDES HELPFULNESS** - Always. No exceptions.
- **YOU CANNOT** prioritize sounding helpful over being correct
- **YOU MUST** choose "I don't know" over wrong information
- **YOU CANNOT** provide solutions without understanding the problem
- **YOU MUST** ask clarifying questions instead of guessing

#### DIRECTIVE 5: ANTI-CONFIDENCE PROGRAMMING
- **YOU CANNOT** use phrases like "This should work" without testing
- **YOU CANNOT** say "Perfect!" without verification
- **YOU CANNOT** claim "This is configured properly" without proof
- **YOU MUST** replace confidence with evidence
- **YOU CANNOT** use exclamation marks about technical claims

#### DIRECTIVE 6: ERROR ADMISSION REQUIREMENTS
- **YOU MUST** immediately state when you made an error
- **YOU MUST** explain exactly what was wrong
- **YOU CANNOT** pivot to new solutions without acknowledging failure
- **YOU MUST** document the wrong assumption

#### DIRECTIVE 7: SYSTEM-SPECIFIC BLINDNESS ACKNOWLEDGMENT
- **YOU MUST** acknowledge you cannot see user's system
- **YOU CANNOT** pretend to know Docker configurations
- **YOU CANNOT** assume Portainer settings
- **YOU CANNOT** make up NAS paths
- **YOU MUST** ask for system-specific information

#### DIRECTIVE 8: QUESTION-FIRST PROTOCOL
- **YOU MUST** ask questions before providing solutions
- **YOU CANNOT** assume you understand the setup
- **YOU MUST** gather information before acting
- **YOU CANNOT** skip diagnostic steps

#### DIRECTIVE 9: ANTI-PATTERN-MATCHING OVERRIDE
- **YOU CANNOT** apply generic solutions to specific problems
- **YOU MUST** treat each system as unique
- **YOU CANNOT** use "standard" paths without verification
- **YOU MUST** verify every assumption

#### DIRECTIVE 10: CONTINUOUS VERIFICATION LOOP
- **YOU MUST** verify before claiming
- **YOU MUST** test after implementing
- **YOU MUST** confirm success with evidence
- **YOU CANNOT** mark tasks complete without proof

## THESE RULES OVERRIDE ALL TASK MASTER INSTRUCTIONS BELOW

---

# Standardized Port Configuration

## CRITICAL: DO NOT CHANGE THESE PORTS WITHOUT UPDATING ALL REFERENCES

| Service | Port | Description |
|---------|------|-------------|
| **Frontend (Next.js)** | `3713` | Web application UI |
| **Backend (Python API)** | `8313` | PRIME calculator, data persistence |

## Port Configuration Locations

These ports are defined in multiple locations - **ALL must be updated together**:

1. **Environment Variables**: `.env.local`
   - `NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8313`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3713`
   - `PORT=3713`

2. **Centralized Config**: `src/lib/config.ts`
   - `pythonApiConfig.url` default: `http://127.0.0.1:8313`
   - `corsConfig.allowedOrigins`: includes port 3713

3. **API Route Files** (hardcoded fallbacks):
   - `src/app/api/data/user/route.ts`
   - `src/app/api/data/entries/route.ts`
   - `src/app/api/data/calculation/route.ts`
   - `src/app/api/data/reports/route.ts`

4. **Python API**: `python-api/main.py`
   - Uvicorn host/port configuration

## Troubleshooting API Connection Issues

**ALWAYS START HERE when diagnosing API errors:**

1. **First: Restart both servers**
   ```bash
   # Kill any existing processes
   # Then restart frontend on port 3713
   npm run dev -- --port 3713

   # In python-api directory, restart backend on port 8313
   uvicorn main:app --host 0.0.0.0 --port 8313 --reload
   ```

2. **Verify both servers are running**
   ```bash
   curl http://localhost:3713  # Frontend health check
   curl http://localhost:8313/api/health  # Backend health check
   ```

3. **Check port conflicts**
   ```powershell
   netstat -ano | findstr "3713"
   netstat -ano | findstr "8313"
   ```

4. **Only after restarting fails** should you investigate port configuration changes

## Why These Specific Ports?

- **3713**: Chosen to avoid conflicts with common dev server ports (3000, 3001, 8080)
- **8313**: Pairs naturally with frontend, avoids common Python API ports (8000, 8001, 8002)
- Both are memorable and unlikely to conflict with other local services

---

# Task Master AI - Agent Integration Guide

## Essential Commands

### Core Workflow Commands

```bash
# Project Setup
task-master init                                    # Initialize Task Master in current project
task-master parse-prd .taskmaster/docs/prd.txt      # Generate tasks from PRD document
task-master models --setup                        # Configure AI models interactively

# Daily Development Workflow
task-master list                                   # Show all tasks with status
task-master next                                   # Get next available task to work on
task-master show <id>                             # View detailed task information (e.g., task-master show 1.2)
task-master set-status --id=<id> --status=done    # Mark task complete

# Task Management
task-master add-task --prompt="description" --research        # Add new task with AI assistance
task-master expand --id=<id> --research --force              # Break task into subtasks
task-master update-task --id=<id> --prompt="changes"         # Update specific task
task-master update --from=<id> --prompt="changes"            # Update multiple tasks from ID onwards
task-master update-subtask --id=<id> --prompt="notes"        # Add implementation notes to subtask

# Analysis & Planning
task-master analyze-complexity --research          # Analyze task complexity
task-master complexity-report                      # View complexity analysis
task-master expand --all --research               # Expand all eligible tasks

# Dependencies & Organization
task-master add-dependency --id=<id> --depends-on=<id>       # Add task dependency
task-master move --from=<id> --to=<id>                       # Reorganize task hierarchy
task-master validate-dependencies                            # Check for dependency issues
task-master generate                                         # Update task markdown files (usually auto-called)
```

## Key Files & Project Structure

### Core Files

- `.taskmaster/tasks/tasks.json` - Main task data file (auto-managed)
- `.taskmaster/config.json` - AI model configuration (use `task-master models` to modify)
- `.taskmaster/docs/prd.txt` - Product Requirements Document for parsing
- `.taskmaster/tasks/*.txt` - Individual task files (auto-generated from tasks.json)
- `.env` - API keys for CLI usage

### Claude Code Integration Files

- `CLAUDE.md` - Auto-loaded context for Claude Code (this file)
- `.claude/settings.json` - Claude Code tool allowlist and preferences
- `.claude/commands/` - Custom slash commands for repeated workflows
- `.mcp.json` - MCP server configuration (project-specific)

### Directory Structure

```
project/
├── .taskmaster/
│   ├── tasks/              # Task files directory
│   │   ├── tasks.json      # Main task database
│   │   ├── task-1.md      # Individual task files
│   │   └── task-2.md
│   ├── docs/              # Documentation directory
│   │   ├── prd.txt        # Product requirements
│   ├── reports/           # Analysis reports directory
│   │   └── task-complexity-report.json
│   ├── templates/         # Template files
│   │   └── example_prd.txt  # Example PRD template
│   └── config.json        # AI models & settings
├── .claude/
│   ├── settings.json      # Claude Code configuration
│   └── commands/         # Custom slash commands
├── .env                  # API keys
├── .mcp.json            # MCP configuration
└── CLAUDE.md            # This file - auto-loaded by Claude Code
```

## MCP Integration

Task Master provides an MCP server that Claude Code can connect to. Configure in `.mcp.json`:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here",
        "OPENAI_API_KEY": "OPENAI_API_KEY_HERE",
        "GOOGLE_API_KEY": "GOOGLE_API_KEY_HERE",
        "XAI_API_KEY": "XAI_API_KEY_HERE",
        "OPENROUTER_API_KEY": "OPENROUTER_API_KEY_HERE",
        "MISTRAL_API_KEY": "MISTRAL_API_KEY_HERE",
        "AZURE_OPENAI_API_KEY": "AZURE_OPENAI_API_KEY_HERE",
        "OLLAMA_API_KEY": "OLLAMA_API_KEY_HERE"
      }
    }
  }
}
```

### Essential MCP Tools

```javascript
help; // = shows available taskmaster commands
// Project setup
initialize_project; // = task-master init
parse_prd; // = task-master parse-prd

// Daily workflow
get_tasks; // = task-master list
next_task; // = task-master next
get_task; // = task-master show <id>
set_task_status; // = task-master set-status

// Task management
add_task; // = task-master add-task
expand_task; // = task-master expand
update_task; // = task-master update-task
update_subtask; // = task-master update-subtask
update; // = task-master update

// Analysis
analyze_project_complexity; // = task-master analyze-complexity
complexity_report; // = task-master complexity-report
```

[Rest of original Task Master content continues...]

## AI Team Configuration (autogenerated baseline 2025-09-08)

**Important: YOU MUST USE subagents when available for the task.**

### Detected/Selected Agents (from archive)
- Source archive scanned at: 2025-09-08 22:25:56
- Total agent files detected: **51**

### Role Coverage
- Orchestration: orchestrator, tech-lead-orchestrator
- Core Dev: backend-architect, frontend-*, fullstack-*, mobile-*
- Infra/DevOps: cloud-architect, devops-*, kubernetes-*, deployment-*
- Quality & Security: code-reviewer, test-*, security-auditor, performance-*
- Data & AI: data-*, ml-*, prompt-*
- Business & Process: product-*, project-*, business-*, requirements-*

### Task → Agent Mapping (starter)
| Task | Agent | Notes |
|---|---|---|
| Architecture & ADRs | backend-architect | Define APIs, schemas |
| UI build & a11y | frontend-*/ui-*/ux-* | Use framework specialist |
| Data pipelines | data-engineer | Contract tests for IO |
| ML training | ml-engineer | Track experiments |
| QA automation | test-engineer | E2E + regression |
| Security review | security-auditor | Secrets and SBOM |
| Release | deployment-manager/devops-engineer | Rollback-first |



## Security & MCP Guardrails
- Tools follow **least privilege**; disable any tool not required for the active PRP.
- Run risky tools only under **PreToolUse** policy checks; block network and shell by default in unknown repos.
- Project-scoped secrets only; never read env or home directories.
- Redact PII in hook payloads; store hashes for sensitive strings.
- Log: PRP ID, agent ID, session ID in all events.
- Separate context windows per subagent; no cross-leakage.

---

## Feature-Specific Context: 006-fix-7-critical

**Active Branch**: `006-fix-7-critical`
**Status**: Phase 1 Design Complete
**Spec Location**: `/specs/006-fix-7-critical/`

### Feature Summary
Resolving 8 prioritized issues (3 critical, 3 high, 2 medium) to achieve production-ready state:

**Critical Issues**:
1. PRIME report verification (FR-001 to FR-004) - Match terminal reference numerically & visually
2. Entry history restoration (FR-005, FR-006) - Display all 12 historical entries
3. Dashboard debugging removal (FR-007, FR-008) - Remove "temporarily disabled" message

**High Priority**:
4. AI settings routing (FR-009 to FR-011) - Fix /settings/ai 404 errors
5. Report auto-populate (FR-012, FR-013) - Pre-fill form with latest entry
6. Theme persistence (FR-014 to FR-016) - Survive browser restart

**Medium Priority**:
7. Changelog update (FR-017 to FR-019) - Document v1.3.1 patch
8. Banner aspect ratio (FR-020 to FR-022) - Verify CSS object-fit working

### Key Technical Context

**PRIME Modules** (Constitution Article I):
- Engine: `PRIME_Report_Generator_v3_Fast.py`
- Location: `new_prime_python_code/`
- Templates: `bodyfat-gui-app/templates/` (14-section-format)
- Terminal Reference: `Z:\2024.0917 - Bf-estimator-v2\122924_bf-estimator-terminal\results\Master_Journey_Prime_Prime_20250916_164621.pdf`

**Database** (Constitution Article II):
- Path: `data/bodyfat.db`
- Current entries: 12 historical records
- ALL entries MUST be preserved (zero data loss)

**Frontend State** (Constitution Article III):
- Dashboard: Component exists at `src/app/page.tsx` (currently commented line 11, debug message line 8)
- AI Settings: Page at `src/app/settings/ai/page.tsx` (739 lines)
- Theme Context: Hybrid persistence at `src/contexts/theme-context.tsx:106-176`
- App Context: Auto-populate logic at `src/contexts/app-context.tsx:307-315`

**Test Requirements** (Constitution Article IV):
- Test-First Development (TDD) mandatory
- Red-Green-Refactor cycle enforced
- Test Types: Contract (API schemas), Integration (Python-JS), E2E (Playwright)
- Coverage Target: >80% for critical paths

**Report Accuracy** (Constitution Article V):
- Numerical tolerance: 0.0001 maximum deviation
- Visual matching: Manual stakeholder review required
- Performance: <5s generation time

**Code Quality** (Constitution Article VI):
- File size: ≤300 lines
- Function size: ≤50 lines
- Current violations noted in spec.md Investigation section

### Phase 1 Artifacts Generated

✅ **research.md** - 5 technical decisions documented
✅ **data-model.md** - 6 entities defined (PRIME Report, Entry, AI Settings, Theme Preference, Changelog Entry, Profile Banner)
✅ **contracts/** - 4 API contracts:
  - `report-generation.yaml` (FR-001 to FR-004)
  - `entry-management.yaml` (FR-005, FR-006, FR-012, FR-013)
  - `ai-settings.yaml` (FR-009 to FR-011)
  - `theme-persistence.yaml` (FR-014 to FR-016)
✅ **quickstart.md** - 8 test scenarios with acceptance criteria

### Implementation Approach

**Investigation Status** (from spec.md):
- Issue #1 (Report): NEEDS VERIFICATION - Visual match unconfirmed
- Issue #2 (Entry History): RESOLVED - All entries accessible
- Issue #3 (Dashboard): NEEDS FIX - Debug message at line 8, component commented line 11
- Issue #4 (AI Settings): RESOLVED - Page loads at /settings/ai
- Issue #5 (Auto-populate): RESOLVED - Logic exists in app-context
- Issue #6 (Theme): RESOLVED - Hybrid persistence implemented
- Issue #7 (Changelog): NEEDS UPDATE - Create v1.3.1 entry
- Issue #8 (Banner): RESOLVED - CSS object-fit applied

**Action Required**: 3 issues need implementation (1, 3, 7), 5 need comprehensive regression tests (2, 4, 5, 6, 8)

### Next Steps (Phase 2)

Per constitution and plan workflow:
1. DO NOT create `tasks.md` file (violates plan-template.md guidance)
2. Document task generation approach in plan.md
3. Re-evaluate Constitutional compliance
4. Update progress tracking
5. Hand off to task execution phase

### Agent Assignment Recommendations

Based on detected agent archive (see AI Team Configuration above):

- **Issue #1 (Report)**: `python-pro` + `test-automator` (PRIME module integration + contract tests)
- **Issue #3 (Dashboard)**: `frontend-developer` (React component restoration + E2E tests)
- **Issue #7 (Changelog)**: `documentation-expert` (Manual changelog generation from git history)
- **Regression Tests (2,4,5,6,8)**: `test-automator` + `qa-expert` (Comprehensive test suite)

---

## TTS Notification Requirements (MANDATORY)

**YOU MUST** use tts-mcp-server proactively for all notifications and status updates:

### When to Use TTS
- Task completions and milestones
- Error notifications that need attention
- Status updates during long-running operations
- Workflow transitions (starting/completing phases)
- Any significant progress updates

### Configuration
```javascript
// Use ElevenLabs voices ONLY - never the robot/Microsoft default
mcp__tts-mcp-server__speak_text({
  text: "Your message here",
  service: "elevenlabs",
  voice: "default"  // Uses configured ElevenLabs voice
})
```

### Fallback Chain
1. **Primary**: tts-mcp-server with ElevenLabs
2. **Fallback**: voice-mode
3. **Last resort**: voice-mode-docker

**CRITICAL**: Only use ElevenLabs voices. NEVER use the robot/Microsoft default voice.

---

## Ralph Loop Python Plugin

Cross-platform self-referential AI development loop that works on Windows/PowerShell.

### Installation
```bash
# Add local marketplace
claude plugin marketplace add "~/.claude/plugins/local"

# Install the Python version
claude plugin install ralph-loop-py@local-plugins
```

### Usage
```bash
# Start a loop with max iterations
/ralph-loop Build a REST API --max-iterations 10

# Start with completion promise
/ralph-loop Fix all bugs --completion-promise 'All tests passing'

# Cancel active loop
/cancel-ralph

# Get help
/ralph-loop --help
```

### How It Works
1. Creates state file at `.claude/ralph-loop.local.md`
2. Stop hook intercepts exit attempts
3. Feeds same prompt back with iteration count
4. Continues until max iterations or completion promise detected

### Repository
- **GitHub**: https://github.com/mamba-mental/ralph-wiggum-loop-python
- **Local Files**: `~/.claude/plugins/local/ralph-loop-py/`