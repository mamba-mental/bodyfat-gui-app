import path from 'path';

// Data directory constants
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public/uploads');
export const EXPORT_DIR = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');

// File paths
export const USER_DATA_FILE = path.join(DATA_DIR, 'user.json');
export const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json');
export const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
export const CALCULATIONS_FILE = path.join(DATA_DIR, 'calculations.json');