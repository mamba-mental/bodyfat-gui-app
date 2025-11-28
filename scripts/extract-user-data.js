#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the large data file
const dataPath = path.join(__dirname, '../data/apexfit-data.json');
const backupPath = path.join(__dirname, '../data/backups/backup-2025-07-22T23-40-32-525Z.json');

function extractUserData(filePath) {
  try {
    console.log(`Reading ${filePath}...`);
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Extract user data
    const userData = parsed.current_user || parsed.user || null;
    
    // Extract entries
    const entries = parsed.entries || [];
    console.log(`Found ${entries.length} entries`);
    
    // Extract reports
    const reports = parsed.reports || [];
    console.log(`Found ${reports.length} reports`);
    
    // Save extracted data
    const outputDir = path.join(__dirname, '../data/extracted');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save user data
    if (userData) {
      fs.writeFileSync(
        path.join(outputDir, 'user_data.json'),
        JSON.stringify(userData, null, 2)
      );
      console.log('User data saved');
    }
    
    // Save entries sorted by date
    if (entries.length > 0) {
      const sortedEntries = entries.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      fs.writeFileSync(
        path.join(outputDir, 'entries.json'),
        JSON.stringify(sortedEntries, null, 2)
      );
      console.log('Entries saved');
      
      // Show date range
      const dates = entries.map(e => e.date).sort();
      console.log(`Entry dates range from ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
    // Save reports
    if (reports.length > 0) {
      fs.writeFileSync(
        path.join(outputDir, 'reports.json'),
        JSON.stringify(reports, null, 2)
      );
      console.log('Reports saved');
    }
    
    return { userData, entries, reports };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

// Try both files
console.log('Extracting from main data file...');
const mainData = extractUserData(dataPath);

console.log('\nExtracting from backup file...');
const backupData = extractUserData(backupPath);

// Compare and merge
if (mainData && backupData) {
  const mainEntryCount = mainData.entries.length;
  const backupEntryCount = backupData.entries.length;
  
  console.log(`\nMain file has ${mainEntryCount} entries`);
  console.log(`Backup file has ${backupEntryCount} entries`);
  
  // Use the one with more entries
  if (backupEntryCount > mainEntryCount) {
    console.log('Using backup data as it has more entries');
  }
}