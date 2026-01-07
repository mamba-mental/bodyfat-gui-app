### BODYFAT APP - DATABASE ARCHITECTURE  
  
## Primary Storage: JSON Files  
  
The Next.js web app uses **JSON file-based storage** located at:  
- File: `data/apexfit-data.json`  
- Implementation: `src/lib/server-storage.ts`  
- Stores: users, entries, reports, calculations  
  
## Python API Backend  
  
The Python API (port 8000) likely uses its own database (needs verification).  
Check `python-api/` folder for configuration.  
  
## Test Environment  
  
Integration tests use **SQLite** database:  
- Database path: `data/bodyfat.db`  
- Used for: Integration testing only  
  
## No Redis Usage  
  
Despite references in Next.js generated types (`.next` folder),  
there are **no active Redis routes** in the source code. 
