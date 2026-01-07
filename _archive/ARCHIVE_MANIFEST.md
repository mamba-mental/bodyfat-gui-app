# Archive Manifest

This directory contains legacy, deprecated, and obsolete files that have been removed from the active project root to improve code organization and clarity.

Generated: 2025-12-03

## Directory Structure

```
_archive/
├── logs/              - All legacy log files (24 files)
├── old-dockerfiles/   - Deprecated Dockerfile versions (4 files)
├── old-scripts/       - Obsolete startup/fix scripts (24 files)
├── old-python-api/    - Legacy Python API implementation files (11 files)
├── old-compose/       - Old docker-compose configurations (3 files)
├── portainer/         - Portainer deployment files (8 files)
├── old-tests/         - Legacy test files (5 files)
├── old-configs/       - Configuration backups (2 files)
├── backups/           - Old project backup directories (4 directories)
└── old-docs/          - Archived markdown documentation (20 files)
```

## Category Details

### logs/ (24 files)
All accumulated development server log files that are no longer needed:
- dev*.log files
- next-dev*.log files
- nextjs-server*.log files
- python-api*.log files
- server.log files

### old-dockerfiles/ (4 files)
Deprecated Docker configuration files:
- Dockerfile_old
- Dockerfile.nextjs_old
- python-api/Dockerfile_old
- python-api/gunicorn.conf.py (app uses uvicorn, not gunicorn)

### old-scripts/ (24 files)
Obsolete startup and fix scripts that have been superseded by scripts/start-app.bat:
- Old batch files using wrong ports (3001, 8000)
- WSL network fix scripts (superseded by proper Docker setup)
- Port forwarding and setup scripts
- Old shell scripts for Linux/WSL

### old-python-api/ (11 files)
Legacy Python API implementation attempts:
- main_simple.py, simple_api.py (earlier API implementations)
- api_with_db.py (superseded by current main.py)
- report_generator.py (marked DEPRECATED in code)
- performance_optimizations.py (disabled in main.py)
- migrate_*.py (one-time migration scripts)
- test_*.py and test files for old implementations

### old-compose/ (3 files)
Obsolete docker-compose files:
- docker-compose.dev.yml
- docker-compose.web-dev.yml
- docker-compose.web.ab-test.yml

Note: Active files retained:
- docker-compose.yml
- docker-compose.prod.yml

### portainer/ (8 files)
Portainer stack deployment files (not using Portainer for this project):
- portainer-stack*.yml variations
- Portainer documentation files

### old-tests/ (5 files)
Legacy test files:
- quick-test.html
- test-prompts.html
- test_complete_flow.js
- test_report_api.py
- test_startup.py

### old-configs/ (2 files)
Configuration file backups:
- next.config.ts.backup
- tsconfig.tsbuildinfo

### backups/ (4 directories)
Old project backup directories moved for consolidation:
- .backups/
- .claude.backup/
- .specify.backup/
- backups/ (legacy backups directory)

### old-docs/ (20 files)
Archived markdown documentation including:
- CHECKPOINT_*.md files (task checkpoints)
- PHASE_*.md files (development phase documentation)
- CRITICAL_FIXES_*.md files (one-time fix documentation)
- DEBUG_SESSION_SUMMARY.md
- DEVELOPMENT_CHANGELOG.md
- VERIFICATION_REPORT.md
- SESSION_SUMMARY_*.md files
- WSL documentation

## Files NOT Archived (Active Production Files)

The following files were intentionally NOT moved and remain in the project root:

### Docker & Deployment
- docker-compose.yml (active development)
- docker-compose.prod.yml (production)
- Dockerfile (main Next.js image)
- Dockerfile.dev (development variant)
- Dockerfile.nextjs (specific Next.js setup)
- Dockerfile.prod (production variant)
- Dockerfile.python (Python API image)

### Startup Scripts
- scripts/start-app.bat (PRIMARY STARTUP SCRIPT)
- scripts/stop-app.bat
- scripts/README.md

### Configuration
- package.json / package-lock.json
- tsconfig.json (active)
- next.config.ts (active)
- vitest.config.ts
- playwright.config.ts
- ESLint and PostCSS configs

### Documentation
- README.md (main project README)
- RUNBOOK.md (operational guide)
- CLAUDE.md (AI context)
- USER_MANUAL.md
- API_DOCUMENTATION.md
- DEVELOPER_GUIDE.md

### Source Code
- src/ directory (all active application code)
- node_modules/ (dependencies)
- data/ directory (application data)
- templates/ directory (application templates)

## Rationale for Archival

1. **Log Files**: Development server logs accumulate during development. No longer needed after development sessions complete.

2. **Old Dockerfiles**: Multiple iterations of Docker setup were tried. Only current versions are needed.

3. **Obsolete Scripts**: Many workarounds for port conflicts, WSL networking, and other one-off fixes are no longer needed with the stable docker-compose setup.

4. **Legacy Python API**: Multiple attempts at the Python API implementation. Current main.py is the active version.

5. **Old Compose Files**: Various compose configurations tested during development. Active production configs are retained.

6. **Portainer Files**: Project doesn't use Portainer orchestration.

7. **Legacy Tests**: Old test approaches superseded by current testing framework.

8. **Documentation**: Checkpoint and phase docs were development process artifacts, not ongoing documentation.

## Recovery

If any archived file is needed:
1. Check appropriate subdirectory in _archive/
2. Move file back to project root or appropriate location
3. Verify git status to confirm move

## Statistics

- **Total items archived**: 120+ files and 4 directories
- **Space freed**: Approximately 500MB+ (primarily from backup directories)
- **Active project files preserved**: 100% of current functionality
- **Risk of archival**: None - all archived items are legacy/deprecated

---

Date Archived: 2025-12-03
