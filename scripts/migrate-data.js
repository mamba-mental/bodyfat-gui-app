#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const NAS_DATA_DIR = path.join(__dirname, '../nas-data');

console.log('🔄 Starting data migration...');
console.log(`Source: ${DATA_DIR}`);
console.log(`Destination: ${NAS_DATA_DIR}`);

// Ensure nas-data directory exists
if (!fs.existsSync(NAS_DATA_DIR)) {
  fs.mkdirSync(NAS_DATA_DIR, { recursive: true });
  console.log('✅ Created nas-data directory');
}

// Copy apexfit-data.json if it exists
const sourceFile = path.join(DATA_DIR, 'apexfit-data.json');
const destFile = path.join(NAS_DATA_DIR, 'apexfit-data.json');

if (fs.existsSync(sourceFile)) {
  try {
    const data = fs.readFileSync(sourceFile, 'utf8');
    fs.writeFileSync(destFile, data, 'utf8');
    console.log('✅ Migrated apexfit-data.json');
  } catch (error) {
    console.error('❌ Error migrating data file:', error.message);
  }
} else {
  console.log('⚠️  No existing data file found at', sourceFile);
  // Create initial data structure
  const initialData = {
    users: [],
    entries: [],
    reports: [],
    calculations: [],
    ai_settings: {
      openai_key: "",
      anthropic_key: "",
      perplexity_key: "",
      model_main: "gpt-4-turbo-preview",
      model_fallback: "gpt-3.5-turbo",
      model_research: "gpt-4"
    }
  };
  fs.writeFileSync(destFile, JSON.stringify(initialData, null, 2), 'utf8');
  console.log('✅ Created initial data structure');
}

// Copy backups directory if it exists
const sourceBackups = path.join(DATA_DIR, 'backups');
const destBackups = path.join(NAS_DATA_DIR, 'backups');

if (fs.existsSync(sourceBackups)) {
  if (!fs.existsSync(destBackups)) {
    fs.mkdirSync(destBackups, { recursive: true });
  }
  
  const backupFiles = fs.readdirSync(sourceBackups);
  backupFiles.forEach(file => {
    const src = path.join(sourceBackups, file);
    const dest = path.join(destBackups, file);
    try {
      fs.copyFileSync(src, dest);
      console.log(`✅ Migrated backup: ${file}`);
    } catch (error) {
      console.error(`❌ Error migrating backup ${file}:`, error.message);
    }
  });
}

console.log('🎉 Data migration completed!');
console.log('\n📝 Next steps:');
console.log('1. Update docker-compose.yml volume path from ./data to ./nas-data');
console.log('2. Update environment variables to point to new data location');
console.log('3. Test the application to ensure data is accessible');