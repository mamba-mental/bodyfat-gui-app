#!/bin/bash

# ApexFit AI Database Backup and Migration Script
# Handles SQLite database backup, restore, and migration operations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"

# Default paths
DATA_DIR="${DATA_DIR:-./data}"
BACKUP_DIR="${BACKUP_PATH:-./backups/database}"
DB_FILE="${DATA_DIR}/bodyfat.db"
LOG_FILE="/var/log/apexfit-db.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Load environment if available
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
    DATA_DIR="${DATA_PATH:-$DATA_DIR}"
    BACKUP_DIR="${BACKUP_PATH:-$BACKUP_DIR}/database"
    DB_FILE="${DATA_DIR}/bodyfat.db"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
backup_database() {
    log "Starting database backup..."
    
    if [[ ! -f "$DB_FILE" ]]; then
        error "Database file not found: $DB_FILE"
    fi
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/bodyfat_${timestamp}.db"
    local manifest_file="${BACKUP_DIR}/bodyfat_${timestamp}.manifest"
    
    # Copy database file
    cp "$DB_FILE" "$backup_file"
    
    # Create manifest
    cat > "$manifest_file" << EOF
Database Backup Manifest
========================
Backup Date: $(date)
Original File: $DB_FILE
Backup File: $backup_file
File Size: $(stat -c%s "$DB_FILE" 2>/dev/null || echo "unknown")
MD5 Hash: $(md5sum "$DB_FILE" | cut -d' ' -f1)
SQLite Version: $(sqlite3 --version 2>/dev/null || echo "unknown")

Database Schema:
$(sqlite3 "$DB_FILE" ".schema" 2>/dev/null || echo "Schema export failed")

Table Counts:
$(sqlite3 "$DB_FILE" "
SELECT name || ': ' || COUNT(*) 
FROM (
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
) tables
LEFT JOIN pragma_table_info(tables.name) ON 1=1
GROUP BY name;
" 2>/dev/null || echo "Count query failed")
EOF
    
    # Compress backup
    gzip "$backup_file"
    backup_file="${backup_file}.gz"
    
    # Verify backup
    if [[ -f "$backup_file" ]]; then
        success "Database backup created: $backup_file"
        log "Backup size: $(stat -c%s "$backup_file" | numfmt --to=iec)"
    else
        error "Backup creation failed"
    fi
    
    # Clean old backups
    cleanup_old_backups
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        error "Backup file not specified"
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Restoring database from: $backup_file"
    
    # Backup current database
    if [[ -f "$DB_FILE" ]]; then
        local current_backup="${DB_FILE}.pre-restore.$(date +%Y%m%d_%H%M%S)"
        cp "$DB_FILE" "$current_backup"
        log "Current database backed up to: $current_backup"
    fi
    
    # Restore from backup
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" > "$DB_FILE"
    else
        cp "$backup_file" "$DB_FILE"
    fi
    
    # Verify restore
    if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
        success "Database restored successfully"
    else
        error "Database restore verification failed"
    fi
}

# List available backups
list_backups() {
    log "Available database backups:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "No backup directory found: $BACKUP_DIR"
        return
    fi
    
    local backups=($(find "$BACKUP_DIR" -name "bodyfat_*.db*" -type f | sort -r))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        log "No backups found"
        return
    fi
    
    printf "%-30s %-15s %-20s\n" "Backup File" "Size" "Date"
    printf "%-30s %-15s %-20s\n" "----------" "----" "----"
    
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(stat -c%s "$backup" | numfmt --to=iec)
        local date=$(stat -c%y "$backup" | cut -d' ' -f1,2 | cut -d'.' -f1)
        printf "%-30s %-15s %-20s\n" "$filename" "$size" "$date"
    done
}

# Clean old backups
cleanup_old_backups() {
    local retention_days="${BACKUP_RETENTION_DAYS:-30}"
    log "Cleaning up database backups older than $retention_days days..."
    
    find "$BACKUP_DIR" -name "bodyfat_*.db*" -mtime +$retention_days -delete
    find "$BACKUP_DIR" -name "bodyfat_*.manifest" -mtime +$retention_days -delete
    
    success "Old backups cleaned up"
}

# Verify database integrity
verify_database() {
    log "Verifying database integrity..."
    
    if [[ ! -f "$DB_FILE" ]]; then
        error "Database file not found: $DB_FILE"
    fi
    
    # SQLite integrity check
    local integrity_result=$(sqlite3 "$DB_FILE" "PRAGMA integrity_check;")
    
    if [[ "$integrity_result" == "ok" ]]; then
        success "Database integrity check passed"
    else
        error "Database integrity check failed: $integrity_result"
    fi
    
    # Quick consistency check
    local table_count=$(sqlite3 "$DB_FILE" "SELECT COUNT(name) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo 0)
    log "Database contains $table_count tables"
    
    # Check for common tables
    local tables=(users entries reports)
    for table in "${tables[@]}"; do
        if sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" | grep -q "$table"; then
            local count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "error")
            log "Table '$table': $count records"
        else
            log "Table '$table': not found"
        fi
    done
}

# Export database to JSON
export_to_json() {
    local output_file="${1:-${BACKUP_DIR}/bodyfat_export_$(date +%Y%m%d_%H%M%S).json}"
    
    log "Exporting database to JSON: $output_file"
    
    if [[ ! -f "$DB_FILE" ]]; then
        error "Database file not found: $DB_FILE"
    fi
    
    # Create JSON export
    cat > "$output_file" << EOF
{
    "export_info": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "database_file": "$DB_FILE",
        "sqlite_version": "$(sqlite3 --version)"
    },
    "tables": {
EOF
    
    # Export tables
    local tables=($(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null))
    local table_count=${#tables[@]}
    local current=0
    
    for table in "${tables[@]}"; do
        current=$((current + 1))
        echo "        \"$table\": [" >> "$output_file"
        
        # Export table data as JSON
        sqlite3 "$DB_FILE" -json "SELECT * FROM $table;" | sed 's/^/            /' >> "$output_file"
        
        if [[ $current -lt $table_count ]]; then
            echo "        ]," >> "$output_file"
        else
            echo "        ]" >> "$output_file"
        fi
    done
    
    cat >> "$output_file" << EOF
    }
}
EOF
    
    success "Database exported to JSON: $output_file"
}

# Migrate from development to production
migrate_to_production() {
    log "Migrating database to production format..."
    
    if [[ ! -f "$DB_FILE" ]]; then
        error "Database file not found: $DB_FILE"
    fi
    
    # Create migration backup
    local migration_backup="${DB_FILE}.pre-migration.$(date +%Y%m%d_%H%M%S)"
    cp "$DB_FILE" "$migration_backup"
    log "Migration backup created: $migration_backup"
    
    # Run migration SQL
    sqlite3 "$DB_FILE" << 'EOF'
-- Production database migrations
PRAGMA foreign_keys=OFF;

-- Add production-specific columns if they don't exist
ALTER TABLE users ADD COLUMN last_login_production TEXT DEFAULT NULL;
ALTER TABLE entries ADD COLUMN production_validated INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN production_generated INTEGER DEFAULT 0;

-- Update existing data for production
UPDATE entries SET production_validated = 1;
UPDATE reports SET production_generated = 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_production);
CREATE INDEX IF NOT EXISTS idx_entries_validated ON entries(production_validated);
CREATE INDEX IF NOT EXISTS idx_reports_generated ON reports(production_generated);

-- Optimize database
VACUUM;
ANALYZE;

PRAGMA foreign_keys=ON;
EOF
    
    success "Database migration completed"
    verify_database
}

# Main function
main() {
    case "${1:-backup}" in
        "backup")
            backup_database
            ;;
        "restore")
            restore_database "${2:-}"
            ;;
        "list")
            list_backups
            ;;
        "verify")
            verify_database
            ;;
        "export")
            export_to_json "${2:-}"
            ;;
        "migrate")
            migrate_to_production
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 [backup|restore <file>|list|verify|export [file]|migrate|cleanup]"
            echo ""
            echo "Commands:"
            echo "  backup          - Create database backup"
            echo "  restore <file>  - Restore from backup file"
            echo "  list            - List available backups"
            echo "  verify          - Verify database integrity"
            echo "  export [file]   - Export database to JSON"
            echo "  migrate         - Migrate to production format"
            echo "  cleanup         - Clean old backups"
            exit 1
            ;;
    esac
}

main "$@"