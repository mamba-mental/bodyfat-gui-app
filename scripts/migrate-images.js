#!/usr/bin/env node

/**
 * Migration script to convert base64 images to file storage
 * Run this after deploying the new file-based storage system
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'apexfit-data.json');

async function ensureDirectories() {
  await fs.mkdir(path.join(UPLOAD_DIR, 'profiles'), { recursive: true });
  await fs.mkdir(path.join(UPLOAD_DIR, 'banners'), { recursive: true });
}

async function saveBase64ToFile(base64String, type) {
  // Extract mime type and data
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const mimeType = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');

  // Determine file extension from mime type
  const ext = mimeType.split('/')[1] || 'jpg';
  const fileName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  
  // Save to appropriate directory
  const subDir = type === 'profile' ? 'profiles' : 'banners';
  const filePath = path.join(UPLOAD_DIR, subDir, fileName);
  
  await fs.writeFile(filePath, buffer);
  
  return `/uploads/${subDir}/${fileName}`;
}

async function migrateImages() {
  try {
    console.log('Starting image migration...');
    
    // Ensure directories exist
    await ensureDirectories();
    
    // Read data file
    const dataContent = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(dataContent);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // Migrate user profile pictures and banners
    for (const userId in data.users) {
      const user = data.users[userId];
      
      // Migrate profile picture
      if (user.profile_picture && user.profile_picture.startsWith('data:')) {
        try {
          console.log(`Migrating profile picture for user ${userId}...`);
          const newUrl = await saveBase64ToFile(user.profile_picture, 'profile');
          user.profile_picture = newUrl;
          migratedCount++;
        } catch (error) {
          console.error(`Failed to migrate profile picture for user ${userId}:`, error.message);
          errorCount++;
        }
      }
      
      // Migrate banner
      if (user.profile_banner && user.profile_banner.startsWith('data:')) {
        try {
          console.log(`Migrating banner for user ${userId}...`);
          const newUrl = await saveBase64ToFile(user.profile_banner, 'banner');
          user.profile_banner = newUrl;
          migratedCount++;
        } catch (error) {
          console.error(`Failed to migrate banner for user ${userId}:`, error.message);
          errorCount++;
        }
      }
    }
    
    // Save updated data if any migrations occurred
    if (migratedCount > 0) {
      // Backup original file
      const backupPath = `${DATA_FILE}.backup-${Date.now()}`;
      await fs.copyFile(DATA_FILE, backupPath);
      console.log(`Original data backed up to: ${backupPath}`);
      
      // Save updated data
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      console.log(`Data file updated with migrated image URLs`);
    }
    
    console.log('\nMigration complete!');
    console.log(`- Images migrated: ${migratedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\nSome images failed to migrate. Check the logs above for details.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateImages();