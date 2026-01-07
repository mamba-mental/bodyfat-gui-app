# 📁 Data Persistence Information - Ap³𝘹Fit.ai – 𝛼

## 🚨 Current Storage Status

### Browser LocalStorage (Current Implementation)
- **Location:** User's browser localStorage
- **Persistence:** Only persists in the specific browser
- **Data includes:**
  - User profile data
  - Body fat entries
  - Generated reports
  - PRIME calculations
- **Limitations:**
  - ❌ Not shared across devices
  - ❌ Lost if browser data cleared
  - ❌ Different data on each device/browser
  - ❌ No server backup

## 🔧 Docker Volume Configuration (Added)

### NAS Persistent Storage Setup
The `docker-compose.yml` now includes volumes for persistent storage:

```yaml
volumes:
  - apex-fit-data:/app/data      # User data, entries, reports
  - apex-fit-exports:/app/exports # Exported files
```

### Storage Locations on NAS
When deployed, data will be stored in:
- `./nas-data/` - All application data
- `./nas-exports/` - Exported reports and backups

### Creating Storage Directories
Before first deployment:
```bash
cd /path/to/bodyfat-gui-app/
mkdir -p nas-data nas-exports
chmod 755 nas-data nas-exports
```

## 🎯 Data Storage Architecture

### Current (Alpha Version)
```
User Browser → localStorage → Per-browser data
```

### Future Enhancement Options

#### Option 1: JSON File Storage (Simple)
- Store data as JSON files in Docker volumes
- One file per user
- Easy backup/restore

#### Option 2: SQLite Database (Recommended)
- Single database file in Docker volume
- Better performance for multiple users
- Easy to backup entire database

#### Option 3: PostgreSQL/MySQL (Enterprise)
- Separate database container
- Best for multi-user scenarios
- Requires additional setup

## 📋 Current Data Management

### Export Data (Available Now)
Users can export their data via Settings → Data Management:
- **Format:** JSON file download
- **Contains:** All user data, entries, reports
- **Usage:** Manual backup/restore

### Import Data (Manual Process)
- Upload JSON file through settings
- Restore previous data

## 🚀 Quick Backup Solution

### Backup Current Browser Data
1. Go to Settings → Data Management
2. Click "Export All Data"
3. Save the JSON file

### Backup Docker Volume Data
```bash
# Backup
docker run --rm -v apex-fit-data:/data -v $(pwd):/backup alpine tar -czf /backup/apex-fit-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm -v apex-fit-data:/data -v $(pwd):/backup alpine tar -xzf /backup/apex-fit-backup-20250630.tar.gz -C /data
```

## 💡 Recommendations

### For Alpha/MVP Testing
- ✅ Current localStorage is sufficient
- ✅ Users can export/import data manually
- ✅ Docker volumes ready for future server storage

### For Production
- 🔄 Implement server-side storage API
- 🔄 Add SQLite or PostgreSQL
- 🔄 Implement user authentication
- 🔄 Add automatic cloud backup

## 📊 Data Structure

### Stored Data Types
```javascript
{
  "userData": {
    "name": "User Name",
    "age": 30,
    "current_weight": 200,
    "goal_weight": 180,
    // ... other profile data
  },
  "entries": [
    {
      "id": "abc123",
      "date": "2025-06-30",
      "weight": 198.5,
      "body_fat_percentage": 25.2,
      // ... entry data
    }
  ],
  "reports": [
    {
      "id": "xyz789",
      "generated_at": "2025-06-30T10:00:00Z",
      "calculation_result": { /* ... */ },
      // ... report data
    }
  ],
  "lastCalculation": {
    "progression": [ /* weekly data */ ],
    "confidence_score": 85,
    // ... calculation data
  }
}
```

## 🔐 Privacy & Security

### Current Status
- ✅ All data stored locally in browser
- ✅ No data sent to external servers
- ✅ Privacy-first approach
- ✅ User controls all data

### Future Considerations
- Add encryption for sensitive data
- Implement user authentication
- Add role-based access control
- Regular automated backups

---

**Note:** For the Alpha version, localStorage is acceptable as users can manually export/import their data. The Docker volumes are configured for future server-side storage implementation.