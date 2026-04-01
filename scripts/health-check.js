#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/app/data';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/public/uploads';
const EXPORT_DIR = process.env.EXPORT_DIR || '/app/exports';

let healthy = true;
const issues = [];

// Check data directory
if (!fs.existsSync(DATA_DIR)) {
  healthy = false;
  issues.push(`Data directory not found: ${DATA_DIR}`);
} else {
  try {
    // Try to write a test file
    const testFile = path.join(DATA_DIR, '.health-check');
    fs.writeFileSync(testFile, new Date().toISOString());
    fs.unlinkSync(testFile);
  } catch (error) {
    healthy = false;
    issues.push(`Data directory not writable: ${error.message}`);
  }
}

// Check upload directory
if (!fs.existsSync(UPLOAD_DIR)) {
  healthy = false;
  issues.push(`Upload directory not found: ${UPLOAD_DIR}`);
}

// Check export directory
if (!fs.existsSync(EXPORT_DIR)) {
  healthy = false;
  issues.push(`Export directory not found: ${EXPORT_DIR}`);
}

// Check main data file
const dataFile = path.join(DATA_DIR, 'apexfit-data.json');
if (!fs.existsSync(dataFile)) {
  console.log('⚠️  Data file not found, will be created on first use');
} else {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (!data.users || !data.entries || !data.reports) {
      healthy = false;
      issues.push('Data file structure is invalid');
    }
  } catch (error) {
    healthy = false;
    issues.push(`Data file is corrupted: ${error.message}`);
  }
}

// Check Python API connection
const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8313';
fetch(pythonApiUrl)
  .then(response => {
    if (!response.ok) {
      console.log('⚠️  Python API not responding (non-critical)');
    }
  })
  .catch(() => {
    console.log('⚠️  Python API not available (non-critical)');
  });

// Report results
if (healthy) {
  console.log('✅ Health check passed');
  process.exit(0);
} else {
  console.error('❌ Health check failed:');
  issues.forEach(issue => console.error(`  - ${issue}`));
  process.exit(1);
}