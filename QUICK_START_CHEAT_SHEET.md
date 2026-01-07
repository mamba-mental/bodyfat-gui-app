# SDD + Serena Quick Start Cheat Sheet

## TL;DR - Your Questions Answered

### Q: Does Claude Code see Serena automatically?
**YES** ✅ - Serena is in your global config. Just run `claude` and it loads automatically.

### Q: Do I have to tell Claude Code to use Serena?
**NO** ❌ - It's automatic. All MCPs in `claude_desktop_config.json` load when you run `claude`.

### Q: What should I use for each issue?

| Issue | Primary Tool | Supporting Tools |
|-------|--------------|------------------|
| **Reporting System** | Serena | Python Analysis MCP, Desktop Commander |
| **AI Settings 404** | Serena | Ref-Tools (Next.js docs) |
| **Entry History** | SQLite MCP | Serena, Desktop Commander |
| **Theme Persistence** | Serena | Context7 (React docs) |
| **Report Defaults** | Serena + SQLite | Context7 |
| **Changelog** | GitHub MCP | Serena |
| **Banner Sizing** | Serena | Context7 (CSS docs) |

---

## 5-Minute Setup

```bash
# 1. Navigate to project
cd "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"

# 2. Initialize SDD
specify init . --no-git --force

# 3. Launch Claude Code (Serena loads automatically)
claude

# 4. Verify Serena is loaded
# Ask: "List MCP servers and confirm Serena is available"

# 5. Start SDD workflow
# In Claude Code: /constitution
```

---

## Required MCPs to Add

Add these to `.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "sqlite-database": {
      "command": "npx",
      "args": ["-y", "sqlite-mcp-server"],
      "env": {"DB_PATH": "./data/bodyfat.db"}
    },
    "python-analysis": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-python-analysis"]
    }
  }
}
```

---

## Serena Commands Cheat Sheet

```bash
# Read Python calculation files
serena:read_file → new_prime_python_code/PRIME_Report_Generator_v3.py

# Search for report code
serena:search_for_pattern → query: "report|Report"

# Find API routes
serena:find_symbol → name_path: "/api/*"

# Find database queries
serena:search_for_pattern → query: "SELECT|INSERT"

# Edit code precisely
serena:edit_block → surgical replacements

# List directory structure
serena:list_dir → map app/ folder

# Get file overview
serena:get_symbols_overview → see functions/classes
```

---

## SDD Command Flow

```
/constitution  →  Set project principles
    ↓
/specify       →  Create feature spec from GitHub issue #1
    ↓
/clarify       →  Answer Claude's questions
    ↓
/plan          →  Technical implementation plan
    ↓
/tasks         →  Break into executable tasks
    ↓
/analyze       →  Validate consistency (optional)
    ↓
/implement     →  Execute with Serena
```

---

## Documentation Sources by Issue

### Reporting System
- **ref-tools**: Python PDF libraries
- **context7**: ReportLab, WeasyPrint
- **serena:read_file**: Python modules in new_prime_python_code/

### AI Settings 404
- **ref-tools**: Next.js 14 App Router
- **context7**: Next.js routing patterns
- **serena:find_symbol**: Locate route files

### Entry History
- **ref-tools**: SQLite documentation
- **sqlite-mcp**: Query database directly
- **serena:search_for_pattern**: Find history queries

### Theme Persistence
- **context7**: localStorage, React state
- **ref-tools**: Next.js metadata API
- **serena:search_for_pattern**: Find theme code

### Report Defaults
- **context7**: React forms, state management
- **sqlite-mcp**: Query last entry
- **serena:edit_block**: Add default logic

### Changelog
- **github:list_commits**: Get recent commits
- **serena:edit_block**: Update CHANGELOG.md

### Banner Sizing
- **context7**: CSS aspect-ratio, object-fit
- **ref-tools**: Next.js Image component
- **serena:edit_block**: Fix image tags

---

## Key Files to Focus On

### Python Calculations
```
new_prime_python_code/
├── PRIME_Calculations.py
├── PRIME_Report_Generator_v3.py
├── PRIME_Diet_Calculations_v2.py
└── PRIME_RMR_Calculations_v2.py
```

### Next.js Routes
```
app/
├── api/                  # Backend endpoints
├── dashboard/            # Main UI
├── settings/            # AI Settings (404 issue here)
└── reports/             # Report generation
```

### Database
```
data/
├── bodyfat.db           # SQLite database
└── backups/             # Historical data
```

### Templates
```
templates/               # Report templates (use these!)
```

---

## Troubleshooting One-Liners

**Serena not loading?**
```bash
# Restart Claude Desktop, then:
claude
```

**Can't read files?**
```bash
# Check filesystem MCP includes /mnt/c/GitHub_Projects
```

**Python scripts fail?**
```bash
# Use desktop-commander:start_process instead
```

**Database errors?**
```bash
# Add sqlite-mcp to .claude/.mcp.json
```

---

## Workflow Example: Fix AI Settings 404

```bash
# 1. Find AI settings references
serena:search_for_pattern → "ai-settings|aiSettings"

# 2. Check if route exists
serena:list_dir → "app/settings"

# 3. If missing, check what route should be
ref-tools → "Next.js 14 App Router dynamic routes"

# 4. Create or fix route file
serena:create_text_file OR serena:edit_block

# 5. Test
desktop-commander:start_process → "npm run dev"
```

---

## Important Notes

✅ **Serena is automatic** - No special setup needed
✅ **Use SDD workflow** - Don't skip /constitution
✅ **Serena for precision** - Better than manual edits
✅ **SQLite MCP essential** - For database operations
✅ **Test Python separately** - Use desktop-commander

---

## Full Guide Location

Complete setup guide: `SDD_SETUP_GUIDE.md` (same directory)

---

**Ready?** Run these 3 commands:

```bash
specify init . --no-git --force
claude
/constitution
```

**Then follow the SDD workflow!** 🚀
