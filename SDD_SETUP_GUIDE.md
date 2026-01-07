# SDD Setup Guide for Fitness App with Claude Code + Serena

## Current Status Analysis

✅ **Serena MCP**: Already configured globally (Claude Desktop config)
✅ **Project-Specific MCPs**: Configured in `.claude/.mcp.json`
✅ **Git Repository**: Initialized and connected to GitHub
❌ **SDD Structure**: Not yet initialized

---

## Quick Answer to Your Questions

### Q1: Does Claude Code see Serena automatically?
**YES** - Serena is configured in your global Claude Desktop config at:
`C:\Users\tiran\AppData\Roaming\Claude\claude_desktop_config.json`

When you launch `claude` in terminal, it automatically loads ALL MCPs from this file, including Serena.

### Q2: Do I need to tell Claude Code to use Serena?
**NO** - It's automatic. Just launch `claude` and Serena tools will be available.

### Q3: What agents/docs/MCPs should I use for these issues?
**See Step 4 below** - Issue-specific recommendations included.

---

## Step 1: Initialize SDD (Spec-Driven Development)

### Navigate and Initialize
```bash
cd "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"

# Initialize SDD (--no-git because you already have git)
specify init . --no-git --force
```

**This creates:**
```
.specify/
├── memory/
│   └── constitution.md
├── scripts/
│   ├── bash/
│   └── powershell/
├── specs/
└── templates/
    ├── commands/
    ├── spec-template.md
    ├── plan-template.md
    └── tasks-template.md
```

---

## Step 2: Launch Claude Code

```bash
# From project directory
claude
```

**Claude Code will automatically load:**
- ✅ Serena (code navigation/editing)
- ✅ Filesystem (file operations)
- ✅ GitHub (version control)
- ✅ Desktop Commander (system operations)
- ✅ All other MCPs in your config

---

## Step 3: Verify Serena is Available

In Claude Code, ask:
```
List all available MCP servers and confirm Serena tools are loaded
```

**Expected Serena tools:**
- `serena:read_file` - Read files
- `serena:find_symbol` - Find functions/classes
- `serena:search_for_pattern` - Search codebase
- `serena:edit_block` - Edit code precisely
- `serena:create_text_file` - Create files
- `serena:list_dir` - List directories
- `serena:get_symbols_overview` - File structure overview

---

## Step 4: Issue-to-Agent/Tool Mapping

Based on your GitHub issue #1, here are the recommended tools for each fix:

### 1. 📊 Reporting System Integration

**Primary Agent**: Serena
**Supporting Tools**: 
- `serena:read_file` - Read Python calculation modules
- `serena:search_for_pattern` - Find report generation calls
- `serena:edit_block` - Integrate new Python code
- `desktop-commander:start_process` - Test Python scripts

**Documentation Sources**:
- `ref-tools` - Python PDF generation libraries
- `context7` - ReportLab, WeasyPrint docs

**Additional MCPs Needed**:
```json
"python-analysis": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-python-analysis"]
}
```

---

### 2. ❌ AI Settings Page 404

**Primary Agent**: Serena
**Supporting Tools**:
- `serena:find_symbol` - Locate Next.js route files
- `serena:list_dir` - Map app/ directory structure
- `serena:search_for_pattern` - Find AI settings references

**Documentation Sources**:
- `ref-tools` - Next.js 14 App Router routing
- `context7` - Next.js dynamic routes

**Additional MCPs Needed**: None (use existing)

---

### 3. 📝 Changelog Update

**Primary Agent**: GitHub MCP
**Supporting Tools**:
- `github:list_commits` - Get recent commits
- `github:search_code` - Find changes
- `serena:edit_block` - Update CHANGELOG.md

**Documentation Sources**: Git commit history

**Additional MCPs Needed**: None (use existing)

---

### 4. 📄 Report Default Data

**Primary Agent**: Serena + SQLite
**Supporting Tools**:
- `serena:search_for_pattern` - Find form state management
- `serena:edit_block` - Add default data logic
- SQLite MCP (add below)

**Documentation Sources**:
- `context7` - React state management
- `ref-tools` - SQLite queries

**Additional MCPs Needed**:
```json
"sqlite-mcp": {
  "command": "npx",
  "args": ["-y", "sqlite-mcp-server"],
  "env": {
    "DB_PATH": "./data/bodyfat.db"
  }
}
```

---

### 5. 🎨 Theme Persistence

**Primary Agent**: Serena
**Supporting Tools**:
- `serena:search_for_pattern` - Find theme-related code
- `serena:find_referencing_symbols` - Trace theme usage
- `serena:edit_block` - Fix persistence logic

**Documentation Sources**:
- `context7` - localStorage API
- `ref-tools` - Next.js App Router metadata

**Additional MCPs Needed**: None (use existing)

---

### 6. 🖼️ Banner Sizing

**Primary Agent**: Serena
**Supporting Tools**:
- `serena:search_for_pattern` - Find banner image components
- `serena:edit_block` - Add size constraints

**Documentation Sources**:
- `context7` - CSS aspect-ratio, object-fit
- `ref-tools` - Next.js Image component

**Additional MCPs Needed**: None (use existing)

---

### 7. 📚 Entry History Restoration

**Primary Agent**: SQLite MCP + Serena
**Supporting Tools**:
- SQLite MCP - Query database
- `serena:search_for_pattern` - Find history queries
- `desktop-commander:start_process` - Run database migrations

**Documentation Sources**:
- `context7` - SQLite schema design
- `ref-tools` - Database migrations

**Additional MCPs Needed**:
```json
"sqlite-inspector": {
  "command": "npx",
  "args": ["-y", "sqlite-mcp-server"],
  "env": {
    "DB_PATH": "./data/bodyfat.db"
  }
}
```

---

## Step 5: Add Recommended MCPs

Create or update `.claude/.mcp.json` in your project:

```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--context",
        "bodyfat-gui-app"
      ]
    },
    "sqlite-database": {
      "command": "npx",
      "args": ["-y", "sqlite-mcp-server"],
      "env": {
        "DB_PATH": "./data/bodyfat.db"
      }
    },
    "python-analysis": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-python-analysis"]
    }
  }
}
```

---

## Step 6: SDD Workflow with Serena

### Phase 1: Constitution (Project Principles)

```
/constitution Create principles for fitness app enhancement:

**Existing Architecture:**
- Next.js 14 + App Router frontend
- Python backend (new_prime_python_code/)
- SQLite database (data/bodyfat.db)
- Hybrid TypeScript/Python codebase

**Critical Requirements:**

Article I: Python Module Integrity
- ALL calculations MUST use new_prime_python_code/ modules
- Report generation MUST use PRIME_Report_Generator_v3.py
- No custom calculation reimplementations allowed

Article II: Database Consistency
- SQLite database is single source of truth
- Entry history must be preserved
- Referential integrity required

Article III: Frontend Compatibility
- Next.js App Router routing must work
- Theme preferences persist across sessions
- API contracts maintained

Article IV: Test-First Development
- Tests required before implementation
- Integration tests for Python-JS boundary
- Database migration tests mandatory

Article V: Code Quality
- Follow existing patterns
- Use Serena for precise edits
- Document complex integrations
```

---

### Phase 2: Specification (from GitHub Issue)

```
/specify Based on GitHub issue #1 (https://github.com/mamba-mental/bodyfat-gui-app/issues/1):

## Critical Priority

1. Reporting System Integration
   - Integrate Python modules from new_prime_python_code/
   - Match terminal version report format
   - Use updated templates in templates/

2. Entry History Restoration
   - Query and restore all historical data
   - Verify database integrity
   - Ensure persistence across updates

## High Priority

3. AI Settings Page 404 Fix
   - Resolve Next.js routing issue
   - Make settings page accessible

## Medium Priority

4. Report Default Data Feature
   - Auto-populate forms with last entry
   - Reduce manual data re-entry

5. Theme Persistence Fix
   - Save theme preference to storage
   - Apply theme on page load

6. Changelog Update
   - Document all recent changes

## Low Priority

7. Banner Sizing Standardization
   - Enforce consistent dimensions
   - Prevent image warping
```

---

### Phase 3: Clarification

```
/clarify
```

Claude will ask questions like:
- Which Python modules are currently integrated?
- What database schema changes are needed?
- Should theme be stored in localStorage or database?
- What is the exact report format specification?

---

### Phase 4: Technical Planning

```
/plan Use existing Next.js 14 + Python architecture.

**Backend Integration:**
- Import new_prime_python_code modules via API routes
- Python subprocess execution for calculations
- FastAPI or Flask for Python API layer

**Database:**
- SQLite at data/bodyfat.db
- Prisma or raw SQL queries
- Migration scripts for schema changes

**Frontend:**
- Next.js 14 App Router
- React Server Components where possible
- Client components for interactivity

**Testing:**
- Vitest for TypeScript/React
- pytest for Python modules
- Integration tests for Python-JS boundary
```

---

### Phase 5: Task Breakdown

```
/tasks
```

Claude generates executable tasks like:
```
T001: Analyze new_prime_python_code/ structure [Serena]
T002: Create Python API integration layer
T003: Write tests for report generation
T004: Implement report generation endpoint
T005: Fix AI Settings routing
T006: Query database for entry history
... etc
```

---

### Phase 6: Analysis (Optional but Recommended)

```
/analyze
```

Validates:
- All requirements have tasks
- No constitutional violations
- Coverage gaps identified
- AGENTS.md compliance

---

### Phase 7: Implementation

```
/implement
```

Claude executes tasks using:
- **Serena** for code edits
- **Desktop Commander** for script execution
- **SQLite MCP** for database queries
- **GitHub** for tracking progress

---

## Step 7: Serena-Specific Commands

### Analyze Python Calculation Modules

```
Use serena:list_dir to map new_prime_python_code/ directory structure
```

```
Use serena:read_file to read PRIME_Report_Generator_v3.py
```

```
Use serena:get_symbols_overview for each Python file to understand exports
```

---

### Find Existing Report Generation Code

```
Use serena:search_for_pattern with query "report|Report|REPORT" 
in code files to find all report-related code
```

---

### Locate Database Queries

```
Use serena:search_for_pattern with query "SELECT|INSERT|UPDATE|DELETE" 
in code files to find all database operations
```

---

### Find Next.js API Routes

```
Use serena:find_symbol with name_path "/api/*" to locate all API endpoints
```

---

### Find AI Settings References

```
Use serena:search_for_pattern with query "ai.settings|ai-settings|aiSettings"
```

---

### Edit Route Files Precisely

```
Use serena:edit_block to make surgical edits to Next.js route files
```

---

## Step 8: Complete Workflow Example

### Fixing AI Settings 404

```bash
# 1. Analyze routing structure
serena:list_dir with path "app" and depth 3

# 2. Find AI settings references
serena:search_for_pattern with query "ai.settings"

# 3. Locate settings page
serena:find_symbol with name_path "/settings"

# 4. Check if route file exists
serena:list_dir with path "app/settings"

# 5. Create or fix route
serena:create_text_file (if missing)
OR
serena:edit_block (if exists with errors)

# 6. Verify with test
desktop-commander:start_process with "npm run dev"
```

---

## Step 9: Documentation Research

### For Python Integration
```
Use ref-tools:ref_search_documentation with query "Python subprocess Next.js"
```

```
Use context7 with query "Next.js API routes Python backend"
```

---

### For Database Schema
```
Use ref-tools:ref_search_documentation with query "SQLite Prisma schema"
```

---

### For Theme Persistence
```
Use context7 with query "Next.js theme persistence localStorage"
```

---

## Step 10: Verification Checklist

After setup:

- [ ] `specify check` runs without errors
- [ ] `.specify/` directory exists
- [ ] `claude` launches successfully
- [ ] Serena tools available (ask Claude to list)
- [ ] GitHub integration working
- [ ] Can read files in `new_prime_python_code/`
- [ ] SQLite MCP can query `data/bodyfat.db`

---

## Troubleshooting

### Serena Not Loading

**Check global config:**
```powershell
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" | Select-String "serena"
```

**Restart Claude Desktop and relaunch:**
```bash
claude
```

---

### Cannot Read Project Files

**Verify filesystem MCP has project path:**
```json
"filesystem": {
  "args": [
    "@modelcontextprotocol/server-filesystem",
    "/mnt/c/GitHub_Projects"  // Must include this
  ]
}
```

---

### Python Scripts Won't Execute

**Use desktop-commander:**
```
desktop-commander:start_process with command:
"python new_prime_python_code/PRIME_Calculations.py"
```

---

### Database Queries Failing

**Add SQLite MCP to config:**
```json
"sqlite-db": {
  "command": "npx",
  "args": ["-y", "sqlite-mcp-server"],
  "env": {
    "DB_PATH": "./data/bodyfat.db"
  }
}
```

---

## Quick Reference

| Task | Command/Tool |
|------|--------------|
| **Initialize SDD** | `specify init . --no-git --force` |
| **Launch Claude Code** | `claude` |
| **Read Python file** | `serena:read_file` |
| **Search codebase** | `serena:search_for_pattern` |
| **Find functions** | `serena:find_symbol` |
| **Edit code** | `serena:edit_block` |
| **Query database** | `sqlite-mcp` (after adding) |
| **Test Python** | `desktop-commander:start_process` |
| **Load GitHub issue** | `github:get_issue` |
| **SDD Constitution** | `/constitution` |
| **SDD Specification** | `/specify` |
| **SDD Planning** | `/plan` |
| **SDD Implementation** | `/implement` |

---

## Summary: Your Complete Setup

1. ✅ **Serena** - Already in global config, auto-loads with Claude Code
2. ✅ **Project MCPs** - Already configured in `.claude/.mcp.json`
3. ⚠️ **SDD Structure** - Run `specify init . --no-git --force`
4. ⚠️ **SQLite MCP** - Add to project config (see Step 5)
5. ⚠️ **Python Analysis MCP** - Add to project config (see Step 5)

**You don't need to tell Claude Code about Serena - it's automatic!**

---

## Next Actions

1. Run: `specify init . --no-git --force`
2. Launch: `claude`
3. Verify: Ask "List MCP servers including Serena"
4. Start: `/constitution` (use template from Step 6)
5. Continue: Follow SDD workflow (Steps 6.2 through 6.7)

**Ready to start fixing your fitness app with SDD + Serena!** 🚀

---

**Last Updated**: 2025-10-05
**Project**: Bodyfat GUI App
**Repository**: https://github.com/mamba-mental/bodyfat-gui-app
**Issue Tracker**: https://github.com/mamba-mental/bodyfat-gui-app/issues/1
