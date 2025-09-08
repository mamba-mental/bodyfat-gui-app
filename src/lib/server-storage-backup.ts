// Backup and recovery functions for data persistence
import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './constants';

const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 10;

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

// Create a backup of the current data file
export async function createBackup(dataFile: string): Promise<string> {
  await ensureBackupDir();
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    // Copy current data file to backup
    const data = await fs.readFile(dataFile, 'utf8');
    await fs.writeFile(backupPath, data);
    
    // Clean up old backups
    await cleanupOldBackups();
    
    return backupPath;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}

// Clean up old backups, keeping only the most recent ones
async function cleanupOldBackups(): Promise<void> {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    // Remove old backups beyond MAX_BACKUPS
    for (let i = MAX_BACKUPS; i < backupFiles.length; i++) {
      await fs.unlink(path.join(BACKUP_DIR, backupFiles[i]));
    }
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
  }
}

// Restore from a backup file
export async function restoreFromBackup(backupFile: string, targetFile: string): Promise<void> {
  try {
    const backupData = await fs.readFile(backupFile, 'utf8');
    await fs.writeFile(targetFile, backupData);
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    throw error;
  }
}

// Get list of available backups
export async function listBackups(): Promise<string[]> {
  await ensureBackupDir();
  
  try {
    const files = await fs.readdir(BACKUP_DIR);
    return files
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

// Validate data integrity
export async function validateDataFile(filePath: string): Promise<boolean> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Check required fields
    return (
      parsed.users !== undefined &&
      parsed.entries !== undefined &&
      parsed.reports !== undefined &&
      parsed.calculations !== undefined
    );
  } catch (error) {
    return false;
  }
}