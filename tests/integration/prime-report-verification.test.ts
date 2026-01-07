/**
 * Integration Test: PRIME Report Numerical Verification
 *
 * Validates PRIME_Report_Generator_v3_Fast produces numerically accurate results
 * within 0.0001 tolerance compared to terminal reference output.
 *
 * Constitutional Requirements:
 * - Article V: Report System Integrity - Numerical accuracy < 0.0001
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-001, FR-002, FR-003, FR-004
 *
 * Test Strategy:
 * 1. Generate report using test data matching terminal reference
 * 2. Extract numerical values from generated PDF
 * 3. Compare against known terminal reference values
 * 4. Assert all calculations within 0.0001 tolerance
 *
 * IMPORTANT: This test MUST fail until PRIME integration is verified correct.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PRIME Report Numerical Verification', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const PYTHON_API_BASE = process.env.PYTHON_API_URL || 'http://localhost:5000';
  const TOLERANCE = 0.0001; // Constitution Article V requirement

  /**
   * Terminal Reference Values (from Master_Journey_Prime_Prime_20250916_164621.pdf)
   *
   * These values represent the "ground truth" from the terminal version
   * that the web version MUST match within tolerance.
   */
  const TERMINAL_REFERENCE = {
    // Body Composition Metrics
    bodyFatPercentage: 15.2,
    leanBodyMass: 145.8,
    fatMass: 26.2,

    // Metabolic Calculations
    rmr: 1842.5,
    tdee: 2950.8,
    maintenanceCalories: 2950.8,

    // Macronutrient Targets (maintenance)
    proteinGrams: 172.0,
    fatGrams: 98.2,
    carbsGrams: 295.1,

    // Weight Change Targets (1 lb/week deficit)
    deficitCalories: 2450.8,
    deficitProtein: 172.0,
    deficitFat: 81.7,
    deficitCarbs: 245.1,

    // Performance Metrics
    vo2Max: 48.5,
    cardiacOutput: 22.4
  };

  /**
   * Test User Data (matching terminal reference input)
   */
  const TEST_USER_DATA = {
    weight: 172.0, // lbs
    bodyFatPercentage: 15.2, // %
    height: 70.0, // inches
    age: 32,
    gender: 'male',
    activityLevel: 'active' // 5-6 days/week training
  };

  let generatedReportId: string;
  let reportData: any;

  beforeAll(async () => {
    // Create test entry first
    const entryResponse = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        ...TEST_USER_DATA,
        recordedAt: new Date().toISOString()
      })
    });

    expect(entryResponse.status).toBe(201);
    const entry = await entryResponse.json();

    // Generate report using PRIME engine
    const reportRequest = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      entryIds: [entry.entryId],
      templateVersion: '14-section-format',
      outputFormat: 'pdf'
    };

    const reportResponse = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportRequest)
    });

    expect([201, 202]).toContain(reportResponse.status);
    const report = await reportResponse.json();
    generatedReportId = report.reportId;

    // Poll for report completion (max 30 seconds)
    let attempts = 0;
    while (attempts < 30) {
      const statusResponse = await fetch(`${API_BASE}/reports/${generatedReportId}`);
      reportData = await statusResponse.json();

      if (reportData.status === 'completed') break;
      if (reportData.status === 'failed') {
        throw new Error(`Report generation failed: ${reportData.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    expect(reportData.status).toBe('completed');
  }, 60000); // 60 second timeout for report generation

  describe('Body Composition Calculations', () => {
    it('should calculate body fat percentage within tolerance', () => {
      expect(reportData.calculations).toHaveProperty('bodyFatPercentage');

      const calculated = reportData.calculations.bodyFatPercentage;
      const reference = TERMINAL_REFERENCE.bodyFatPercentage;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate lean body mass within tolerance', () => {
      expect(reportData.calculations).toHaveProperty('leanBodyMass');

      const calculated = reportData.calculations.leanBodyMass;
      const reference = TERMINAL_REFERENCE.leanBodyMass;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate fat mass within tolerance', () => {
      expect(reportData.calculations).toHaveProperty('fatMass');

      const calculated = reportData.calculations.fatMass;
      const reference = TERMINAL_REFERENCE.fatMass;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });
  });

  describe('Metabolic Calculations', () => {
    it('should calculate RMR within tolerance', () => {
      expect(reportData.calculations).toHaveProperty('rmr');

      const calculated = reportData.calculations.rmr;
      const reference = TERMINAL_REFERENCE.rmr;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate TDEE within tolerance', () => {
      expect(reportData.calculations).toHaveProperty('tdee');

      const calculated = reportData.calculations.tdee;
      const reference = TERMINAL_REFERENCE.tdee;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate maintenance calories within tolerance', () => {
      expect(reportData.calculations).toHaveProperty('maintenanceCalories');

      const calculated = reportData.calculations.maintenanceCalories;
      const reference = TERMINAL_REFERENCE.maintenanceCalories;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });
  });

  describe('Macronutrient Calculations (Maintenance)', () => {
    it('should calculate protein target within tolerance', () => {
      expect(reportData.calculations.macros).toHaveProperty('maintenance');
      expect(reportData.calculations.macros.maintenance).toHaveProperty('proteinGrams');

      const calculated = reportData.calculations.macros.maintenance.proteinGrams;
      const reference = TERMINAL_REFERENCE.proteinGrams;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate fat target within tolerance', () => {
      const calculated = reportData.calculations.macros.maintenance.fatGrams;
      const reference = TERMINAL_REFERENCE.fatGrams;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate carbohydrate target within tolerance', () => {
      const calculated = reportData.calculations.macros.maintenance.carbsGrams;
      const reference = TERMINAL_REFERENCE.carbsGrams;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });
  });

  describe('Weight Change Targets (Deficit)', () => {
    it('should calculate deficit calories within tolerance', () => {
      expect(reportData.calculations.macros).toHaveProperty('deficit');
      expect(reportData.calculations.macros.deficit).toHaveProperty('calories');

      const calculated = reportData.calculations.macros.deficit.calories;
      const reference = TERMINAL_REFERENCE.deficitCalories;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate deficit protein within tolerance', () => {
      const calculated = reportData.calculations.macros.deficit.proteinGrams;
      const reference = TERMINAL_REFERENCE.deficitProtein;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate deficit fat within tolerance', () => {
      const calculated = reportData.calculations.macros.deficit.fatGrams;
      const reference = TERMINAL_REFERENCE.deficitFat;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate deficit carbs within tolerance', () => {
      const calculated = reportData.calculations.macros.deficit.carbsGrams;
      const reference = TERMINAL_REFERENCE.deficitCarbs;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate VO2 Max within tolerance', () => {
      expect(reportData.calculations.performance).toHaveProperty('vo2Max');

      const calculated = reportData.calculations.performance.vo2Max;
      const reference = TERMINAL_REFERENCE.vo2Max;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });

    it('should calculate cardiac output within tolerance', () => {
      expect(reportData.calculations.performance).toHaveProperty('cardiacOutput');

      const calculated = reportData.calculations.performance.cardiacOutput;
      const reference = TERMINAL_REFERENCE.cardiacOutput;
      const difference = Math.abs(calculated - reference);

      expect(difference).toBeLessThan(TOLERANCE);
    });
  });

  describe('PRIME Engine Validation', () => {
    it('should use PRIME_Report_Generator_v3_Fast engine', () => {
      expect(reportData).toHaveProperty('calculationEngine');
      expect(reportData.calculationEngine).toBe('PRIME_Report_Generator_v3_Fast');
    });

    it('should report numericalAccuracy within constitutional requirement', () => {
      if (reportData.numericalAccuracy !== undefined) {
        expect(reportData.numericalAccuracy).toBeLessThan(TOLERANCE);
      }
    });

    it('should complete generation within 5 seconds (Article V performance requirement)', () => {
      expect(reportData).toHaveProperty('generatedAt');
      expect(reportData).toHaveProperty('requestedAt');

      const generatedAt = new Date(reportData.generatedAt).getTime();
      const requestedAt = new Date(reportData.requestedAt).getTime();
      const generationTime = (generatedAt - requestedAt) / 1000; // Convert to seconds

      expect(generationTime).toBeLessThan(5.0);
    });
  });

  describe('Comprehensive Accuracy Report', () => {
    it('should generate summary of all calculation differences', () => {
      const differences = {
        bodyFatPercentage: Math.abs(reportData.calculations.bodyFatPercentage - TERMINAL_REFERENCE.bodyFatPercentage),
        leanBodyMass: Math.abs(reportData.calculations.leanBodyMass - TERMINAL_REFERENCE.leanBodyMass),
        fatMass: Math.abs(reportData.calculations.fatMass - TERMINAL_REFERENCE.fatMass),
        rmr: Math.abs(reportData.calculations.rmr - TERMINAL_REFERENCE.rmr),
        tdee: Math.abs(reportData.calculations.tdee - TERMINAL_REFERENCE.tdee),
        proteinGrams: Math.abs(reportData.calculations.macros.maintenance.proteinGrams - TERMINAL_REFERENCE.proteinGrams),
        fatGrams: Math.abs(reportData.calculations.macros.maintenance.fatGrams - TERMINAL_REFERENCE.fatGrams),
        carbsGrams: Math.abs(reportData.calculations.macros.maintenance.carbsGrams - TERMINAL_REFERENCE.carbsGrams),
        vo2Max: Math.abs(reportData.calculations.performance.vo2Max - TERMINAL_REFERENCE.vo2Max),
        cardiacOutput: Math.abs(reportData.calculations.performance.cardiacOutput - TERMINAL_REFERENCE.cardiacOutput)
      };

      // Log all differences for debugging
      console.log('Calculation Differences from Terminal Reference:');
      Object.entries(differences).forEach(([metric, diff]) => {
        console.log(`  ${metric}: ${diff.toFixed(6)} (tolerance: ${TOLERANCE})`);
      });

      // Assert ALL differences are within tolerance
      Object.entries(differences).forEach(([metric, diff]) => {
        expect(diff).toBeLessThan(TOLERANCE);
      });
    });
  });
});
