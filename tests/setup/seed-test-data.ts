/**
 * Test Data Seeding Script
 *
 * Seeds test database with required data for contract tests:
 * 1. Report with ID '550e8400-e29b-41d4-a716-446655440000' for report verification tests
 * 2. 12+ BodyFatEntry records for entry history tests
 *
 * This script is idempotent - safe to run multiple times without duplicating data
 */

import { dbGetReportById, dbGetEntries } from '@/lib/server-storage';
import type { Report, BodyFatEntry, CalculationResult, UserData, WeeklyProgression } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '@/lib/constants';

const TEST_USER_ID_STRING = 'test-user';
const TEST_USER_ID_NUMBER = 1;
const TEST_REPORT_ID = '550e8400-e29b-41d4-a716-446655440000';
const DATA_FILE = path.join(DATA_DIR, 'apexfit-data.json');

// Data structure
interface DataStore {
  users: { [key: number]: UserData };
  entries: BodyFatEntry[];
  reports: Report[];
  calculations: { [key: number]: CalculationResult };
}

/**
 * Read data directly from file (bypassing server-storage to avoid user_id conversion)
 */
async function readDataDirect(): Promise<DataStore> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      users: {},
      entries: [],
      reports: [],
      calculations: {}
    };
  }
}

/**
 * Write data directly to file (bypassing server-storage to avoid user_id conversion)
 */
async function writeDataDirect(data: DataStore): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate realistic UserData for test report
 */
function generateTestUserData(): UserData {
  return {
    // Personal Information
    name: 'Test User',
    age: 30,
    gender: 'm',
    height_feet: 5,
    height_inches: 10,
    height_cm: 177.8,
    dob: '1995-01-15',

    // Current State
    current_weight: 200,
    current_bf: 20,

    // Goals
    goal_weight: 180,
    goal_bf: 12,
    start_date: '2025-01-01',
    end_date: '2025-06-30',

    // Activity & Training
    activity_level: 3,
    resistance_training: true,
    is_athlete: false,
    workout_type: 'Bodybuilding',
    workout_days: 4,
    job_activity: 2,
    leisure_activity: 2,
    experience_level: 'intermediate',
    volume_score: 7,
    intensity_score: 8,
    frequency_score: 6,
    is_bodybuilder: true,

    // Nutrition
    protein_intake: 180,
    diet_type: 'high_protein',

    // Advanced Options
    ped_use: false,
    exercise_type: 'resistance',
    sleep_quality: 'good',

    // Body Measurements
    waist: 34,
    hip: 38,
    neck: 15,

    // Calculated field
    timeline_weeks: 26,
  };
}

/**
 * Generate realistic weekly progression data
 */
function generateWeeklyProgression(weeks: number): WeeklyProgression[] {
  const progression: WeeklyProgression[] = [];
  const startDate = new Date('2025-01-01');

  for (let i = 0; i < weeks; i++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + (i * 7));

    // Realistic weight loss progression
    const weeklyWeightLoss = 0.77; // ~0.77 lbs/week
    const currentWeight = 200 - (i * weeklyWeightLoss);
    const currentBF = 20 - (i * 0.31); // ~0.31% BF loss per week

    progression.push({
      date: weekDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      weight: parseFloat(currentWeight.toFixed(2)),
      body_fat_percentage: parseFloat(currentBF.toFixed(2)),
      daily_calorie_intake: 2100,
      tdee: 2600,
      weekly_caloric_output: 3500,
      total_weight_lost: parseFloat((i * weeklyWeightLoss).toFixed(2)),
      lean_mass: parseFloat((currentWeight * (1 - currentBF / 100)).toFixed(2)),
      fat_mass: parseFloat((currentWeight * (currentBF / 100)).toFixed(2)),
      muscle_gain: 0.1,
      rmr: 1850,
      tef: 210,
      neat: 540,
    });
  }

  return progression;
}

/**
 * Generate test calculation result
 */
function generateTestCalculationResult(): CalculationResult {
  const userData = generateTestUserData();
  const progression = generateWeeklyProgression(26);

  return {
    user_data: userData,
    progression,
    summary: {
      total_weight_loss: 20,
      body_fat_reduction: 8,
      muscle_gain: 2.6,
      timeline_weeks: 26,
    },
    confidence_score: 0.92,
    ai_analysis: 'This is a realistic and achievable body recomposition plan based on PRIME calculations.',
  };
}

/**
 * Seed test report for report verification tests
 */
async function seedTestReport(): Promise<void> {
  console.log('Checking for existing test report...');

  // Check if report already exists
  const data = await readDataDirect();
  const existingReport = data.reports.find(r => r.id === TEST_REPORT_ID);

  if (existingReport) {
    console.log(`✓ Test report ${TEST_REPORT_ID} already exists - skipping`);
    return;
  }

  console.log('Creating test report...');

  const calculationResult = generateTestCalculationResult();

  const testReport: Report = {
    id: TEST_REPORT_ID,
    user_id: TEST_USER_ID_STRING,
    title: 'Test Report for Verification',
    generated_at: new Date('2025-01-15T10:30:00Z'),
    calculation_result: calculationResult,
    html_content: '<html><body><h1>PRIME Body Composition Report</h1><p>Test report content</p></body></html>',
    pdf_path: '/test/reports/test-report.pdf',
    markdown_path: '/test/reports/test-report.md',
  };

  // Add report to data store
  data.reports.push(testReport);
  await writeDataDirect(data);

  console.log(`✓ Created test report: ${TEST_REPORT_ID}`);
}

/**
 * Seed test body fat entries for entry history tests
 */
async function seedTestEntries(): Promise<void> {
  console.log('Checking existing test entries...');

  const data = await readDataDirect();
  const existingEntries = data.entries.filter(e => e.user_id === TEST_USER_ID_STRING);

  if (existingEntries.length >= 12) {
    console.log(`✓ Found ${existingEntries.length} existing entries (>= 12 required) - skipping`);
    return;
  }

  const entriesToAdd = 12 - existingEntries.length;
  console.log(`Creating ${entriesToAdd} additional test entries...`);

  const startDate = new Date('2025-01-01');

  for (let i = 0; i < entriesToAdd; i++) {
    // Create entries spread across different dates
    const entryDate = new Date(startDate);
    entryDate.setDate(startDate.getDate() + (i * 14)); // Bi-weekly entries

    const weight = 200 - (i * 1.5); // Gradual weight loss
    const bodyFat = 20 - (i * 0.5); // Gradual BF reduction

    const entry: BodyFatEntry = {
      id: `test-entry-${Date.now()}-${i}`,
      date: entryDate,
      weight: parseFloat(weight.toFixed(1)),
      body_fat_percentage: parseFloat(bodyFat.toFixed(1)),
      notes: `Test entry ${i + 1} - Week ${i * 2}`,
      user_id: TEST_USER_ID_STRING,
      created_at: new Date(),
      updated_at: new Date(),
    };

    data.entries.push(entry);
  }

  await writeDataDirect(data);

  // Also write to entries-history.json for /api/entries/history endpoint
  const ENTRIES_HISTORY_FILE = path.join(DATA_DIR, 'entries-history.json');

  // Read existing entries-history.json data
  let entriesHistoryData: { [key: string]: BodyFatEntry[] } = {};
  try {
    const existingData = await fs.readFile(ENTRIES_HISTORY_FILE, 'utf8');
    entriesHistoryData = JSON.parse(existingData);
  } catch {
    // File doesn't exist or is invalid, start fresh
  }

  // Update test-user entries
  const testUserEntries = data.entries.filter(e => e.user_id === TEST_USER_ID_STRING);
  entriesHistoryData[TEST_USER_ID_STRING] = testUserEntries;

  await fs.writeFile(ENTRIES_HISTORY_FILE, JSON.stringify(entriesHistoryData, null, 2));

  const totalEntries = data.entries.filter(e => e.user_id === TEST_USER_ID_STRING);
  console.log(`✓ Created ${entriesToAdd} entries - Total: ${totalEntries.length}`);
  console.log(`✓ Also wrote ${testUserEntries.length} entries to entries-history.json`);
}

/**
 * Main seeding function - seeds all test data
 */
export async function seedTestData(): Promise<void> {
  console.log('=== Starting Test Data Seeding ===\n');

  try {
    await seedTestReport();
    await seedTestEntries();

    console.log('\n=== Test Data Seeding Complete ===');
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
}

// Allow running as standalone script
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('✓ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Seeding failed:', error);
      process.exit(1);
    });
}
