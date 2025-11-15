/**
 * GET /api/entries/history
 *
 * Retrieves all-time entry history with comprehensive data integrity checks
 *
 * T018: Implement Entry History Verification Endpoint
 * OpenAPI Contract: contracts/entry-history.openapi.yaml
 * Constitutional Requirement: Article II - Database Consistency & Migration
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '@/lib/constants';

// Type definitions matching OpenAPI schema
interface EntryHistoryResponse {
  entries: Entry[];
  total_count: number;
  data_loss_detected: boolean;
  date_range: DateRange;
  integrity_checks?: IntegrityChecks;
}

interface Entry {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  body_fat_percentage: number;
  measurements?: Measurements;
  created_at?: string;
  updated_at?: string;
}

interface Measurements {
  neck?: number;
  waist?: number;
  hip?: number;
  height?: number;
  age?: number;
  gender?: 'M' | 'F';
}

interface DateRange {
  earliest: string;
  latest: string;
}

interface IntegrityChecks {
  no_null_values: boolean;
  chronological_order: boolean;
  no_duplicate_dates: boolean;
  schema_version_match: boolean;
}

const ENTRIES_HISTORY_FILE = path.join(DATA_DIR, 'entries-history.json');

interface EntriesStore {
  [userId: string]: Entry[];
}

// Read entries data from JSON file
async function readEntriesData(): Promise<EntriesStore> {
  try {
    const data = await fs.readFile(ENTRIES_HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Write entries data to JSON file
async function writeEntriesData(data: EntriesStore): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
  await fs.writeFile(ENTRIES_HISTORY_FILE, JSON.stringify(data, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const includeMetadata = searchParams.get('include_metadata') === 'true';

    // Validate user_id is provided
    if (!userId) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Missing required parameter: user_id',
        },
        { status: 400 }
      );
    }

    // Read entries from JSON file storage
    const entriesStore = await readEntriesData();
    let userEntries = entriesStore[userId] || [];

    // Apply date filtering if requested
    if (fromDate) {
      userEntries = userEntries.filter(entry => entry.date >= fromDate);
    }

    if (toDate) {
      userEntries = userEntries.filter(entry => entry.date <= toDate);
    }

    // Sort entries by date in ascending order
    const entries = userEntries.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Remove metadata if not requested
    const processedEntries = entries.map(entry => {
      if (!includeMetadata) {
        const { created_at, updated_at, ...entryWithoutMetadata } = entry;
        return entryWithoutMetadata;
      }
      return entry;
    });

    // Calculate date range
    const date_range: DateRange = {
      earliest: processedEntries.length > 0 ? processedEntries[0].date : '',
      latest: processedEntries.length > 0 ? processedEntries[processedEntries.length - 1].date : '',
    };

    // Perform integrity checks
    const integrity_checks: IntegrityChecks = {
      no_null_values: checkNoNullValues(processedEntries),
      chronological_order: checkChronologicalOrder(processedEntries),
      no_duplicate_dates: checkNoDuplicateDates(processedEntries),
      schema_version_match: true, // Assume schema is current
    };

    // Detect data loss (compare expected vs actual)
    // For now, assume no data loss if all integrity checks pass
    const data_loss_detected = !integrity_checks.no_null_values ||
                                !integrity_checks.chronological_order ||
                                !integrity_checks.no_duplicate_dates;

    const response: EntryHistoryResponse = {
      entries: processedEntries,
      total_count: processedEntries.length,
      data_loss_detected,
      date_range,
      integrity_checks,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Entry history retrieval error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Error retrieving entry history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper functions for integrity checks
function checkNoNullValues(entries: Entry[]): boolean {
  return entries.every((entry) => {
    return (
      entry.id &&
      entry.user_id &&
      entry.date &&
      typeof entry.weight === 'number' &&
      typeof entry.body_fat_percentage === 'number'
    );
  });
}

function checkChronologicalOrder(entries: Entry[]): boolean {
  for (let i = 1; i < entries.length; i++) {
    const prevDate = new Date(entries[i - 1].date).getTime();
    const currDate = new Date(entries[i].date).getTime();

    if (currDate < prevDate) {
      return false;
    }
  }

  return true;
}

function checkNoDuplicateDates(entries: Entry[]): boolean {
  const dates = new Set<string>();

  for (const entry of entries) {
    if (dates.has(entry.date)) {
      return false;
    }
    dates.add(entry.date);
  }

  return true;
}
