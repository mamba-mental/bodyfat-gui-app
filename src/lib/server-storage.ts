// Server-side storage implementation using JSON files
import fs from 'fs/promises';
import path from 'path';
import { UserData, BodyFatEntry, Report, CalculationResult } from '@/types';
import { createBackup, validateDataFile } from './server-storage-backup';
import { DATA_DIR } from './constants';

const DATA_FILE = path.join(DATA_DIR, 'apexfit-data.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Data structure
interface DataStore {
  users: { [key: number]: UserData };
  entries: BodyFatEntry[];
  reports: Report[];
  calculations: { [key: number]: CalculationResult };
}

// Initialize empty data store
const emptyStore: DataStore = {
  users: {},
  entries: [],
  reports: [],
  calculations: {}
};

// Read data from file
async function readData(): Promise<DataStore> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    // Return empty store if file doesn't exist
    return emptyStore;
  }
}

// Write data to file with backup
async function writeData(data: DataStore): Promise<void> {
  await ensureDataDir();
  
  // Create backup before writing if file exists
  try {
    await fs.access(DATA_FILE);
    await createBackup(DATA_FILE);
  } catch {
    // File doesn't exist yet, no backup needed
  }
  
  // Write data with atomic operation
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  
  // Validate the new file
  if (await validateDataFile(tempFile)) {
    await fs.rename(tempFile, DATA_FILE);
  } else {
    // Remove invalid temp file
    await fs.unlink(tempFile);
    throw new Error('Data validation failed');
  }
}

// User functions
export async function dbGetUser(userId: number = 1): Promise<UserData | null> {
  const data = await readData();
  return data.users[userId] || null;
}

export async function dbSaveUser(userData: UserData, userId: number = 1): Promise<void> {
  const data = await readData();
  data.users[userId] = userData;
  await writeData(data);
}

// Entry functions
export async function dbGetEntries(userId: number = 1): Promise<BodyFatEntry[]> {
  const data = await readData();
  return data.entries
    .filter(entry => entry.user_id === userId.toString())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function dbSaveEntry(entry: BodyFatEntry, userId: number = 1): Promise<void> {
  const data = await readData();
  // Remove existing entry with same ID if it exists
  data.entries = data.entries.filter(e => e.id !== entry.id);
  // Add new/updated entry
  data.entries.push({
    ...entry,
    user_id: userId.toString()
  });
  await writeData(data);
}

export async function dbDeleteEntry(entryId: string): Promise<void> {
  const data = await readData();
  data.entries = data.entries.filter(e => e.id !== entryId);
  await writeData(data);
}

// Report functions
export async function dbGetReports(userId: number = 1): Promise<Report[]> {
  const data = await readData();
  return data.reports
    .filter(report => report.user_id === userId.toString())
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
}

export async function dbSaveReport(report: Report, userId: number = 1): Promise<void> {
  const data = await readData();
  // Remove existing report with same ID if it exists
  data.reports = data.reports.filter(r => r.id !== report.id);
  // Add new/updated report
  data.reports.push({
    ...report,
    user_id: userId.toString()
  });
  await writeData(data);
}

export async function dbDeleteReport(reportId: string): Promise<void> {
  const data = await readData();
  data.reports = data.reports.filter(r => r.id !== reportId);
  await writeData(data);
}

// Calculation functions
export async function dbGetLastCalculation(userId: number = 1): Promise<CalculationResult | null> {
  const data = await readData();
  return data.calculations[userId] || null;
}

export async function dbSaveCalculation(result: CalculationResult, userId: number = 1): Promise<void> {
  const data = await readData();
  data.calculations[userId] = result;
  await writeData(data);
}

// Clear all data
export async function dbClearAllData(userId: number = 1): Promise<void> {
  const data = await readData();
  delete data.users[userId];
  data.entries = data.entries.filter(e => e.user_id !== userId.toString());
  data.reports = data.reports.filter(r => r.user_id !== userId.toString());
  delete data.calculations[userId];
  await writeData(data);
}