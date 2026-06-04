/**
 * Contract Test: Entry Management API
 *
 * Validates API contract compliance with specs/006-fix-7-critical/contracts/entry-management.yaml
 *
 * Constitutional Requirements:
 * - Article II: Database Consistency - Verify 12 historical entries preserved
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-005, FR-006, FR-012, FR-013
 *
 * IMPORTANT: This test MUST fail until the API implementation is complete.
 */

import { describe, it, expect } from 'vitest';

describe('Entry Management API Contract', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api';

  describe('GET /api/entries', () => {
    it('should return EntryListResponse schema', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/entries?userId=${userId}`);

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();

      // Validate EntryListResponse schema
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');

      expect(Array.isArray(data.entries)).toBe(true);
      expect(typeof data.total).toBe('number');
      expect(typeof data.hasMore).toBe('boolean');
    });

    it('should preserve all 12 historical entries (Constitution Article II)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/entries?userId=${userId}`);
      const data = await response.json();

      // Constitutional requirement: total must be >= 12
      expect(data.total).toBeGreaterThanOrEqual(12);
    });

    it('should validate Entry schema with 12 required fields', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/entries?userId=${userId}&limit=1`);
      const data = await response.json();

      expect(data.entries.length).toBeGreaterThan(0);

      const entry = data.entries[0];

      // Contract: Entry must have all required fields
      expect(entry).toHaveProperty('entryId');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('recordedAt');
      expect(entry).toHaveProperty('weight');
      expect(entry).toHaveProperty('bodyFatPercentage');
      expect(entry).toHaveProperty('height');
      expect(entry).toHaveProperty('age');
      expect(entry).toHaveProperty('gender');
      expect(entry).toHaveProperty('activityLevel');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof entry.weight).toBe('number');
      expect(typeof entry.bodyFatPercentage).toBe('number');
      expect(typeof entry.height).toBe('number');
      expect(typeof entry.age).toBe('number');

      // Validate enums
      expect(['male', 'female', 'other']).toContain(entry.gender);
      expect(['sedentary', 'light', 'moderate', 'active', 'very_active']).toContain(entry.activityLevel);
    });

    it('should support pagination with limit and offset', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const page1 = await fetch(`${API_BASE}/entries?userId=${userId}&limit=5&offset=0`);
      const data1 = await page1.json();

      expect(data1.entries.length).toBeLessThanOrEqual(5);

      const page2 = await fetch(`${API_BASE}/entries?userId=${userId}&limit=5&offset=5`);
      const data2 = await page2.json();

      // Entries should be different between pages
      const page1Ids = data1.entries.map((e: any) => e.entryId);
      const page2Ids = data2.entries.map((e: any) => e.entryId);

      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should support sorting by date (newest first by default)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/entries?userId=${userId}&sortBy=recordedAt&sortOrder=desc`);
      const data = await response.json();

      const entries = data.entries;
      expect(entries.length).toBeGreaterThan(0);

      // Verify descending order
      for (let i = 1; i < entries.length; i++) {
        const prev = new Date(entries[i - 1].recordedAt).getTime();
        const curr = new Date(entries[i].recordedAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('GET /api/entries/latest', () => {
    it('should return most recent entry for auto-populate', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/entries/latest?userId=${userId}`);

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const entry = await response.json();

      // Validate Entry schema
      expect(entry).toHaveProperty('entryId');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('recordedAt');
      expect(entry.userId).toBe(userId);
    });

    it('should return 404 when user has no entries', async () => {
      const newUserId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`${API_BASE}/entries/latest?userId=${newUserId}`);

      // Contract: Must return 404 Not Found
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });
  });

  describe('GET /api/entries/{entryId}', () => {
    it('should return specific Entry by ID', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      // First get list to obtain valid entryId
      const listResponse = await fetch(`${API_BASE}/entries?userId=${userId}&limit=1`);
      const listData = await listResponse.json();
      const entryId = listData.entries[0].entryId;

      // Now retrieve specific entry
      const response = await fetch(`${API_BASE}/entries/${entryId}`);

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const entry = await response.json();
      expect(entry.entryId).toBe(entryId);
    });

    it('should return 404 for non-existent entryId', async () => {
      const fakeEntryId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`${API_BASE}/entries/${fakeEntryId}`);

      // Contract: Must return 404 Not Found
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/entries/{entryId}', () => {
    it('should update entry with EntryUpdate schema', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      // Get existing entry
      const listResponse = await fetch(`${API_BASE}/entries?userId=${userId}&limit=1`);
      const listData = await listResponse.json();
      const entry = listData.entries[0];

      // Update entry
      const updateData = {
        weight: entry.weight + 0.5,
        bodyFatPercentage: entry.bodyFatPercentage + 0.1
      };

      const response = await fetch(`${API_BASE}/entries/${entry.entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const updatedEntry = await response.json();

      // Verify updates applied
      expect(updatedEntry.weight).toBe(updateData.weight);
      expect(updatedEntry.bodyFatPercentage).toBe(updateData.bodyFatPercentage);

      // Verify updatedAt timestamp changed
      expect(new Date(updatedEntry.updatedAt).getTime()).toBeGreaterThan(
        new Date(entry.updatedAt).getTime()
      );
    });

    it('should reject invalid data types', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const listResponse = await fetch(`${API_BASE}/entries?userId=${userId}&limit=1`);
      const listData = await listResponse.json();
      const entryId = listData.entries[0].entryId;

      const invalidUpdate = {
        weight: 'not-a-number',
        bodyFatPercentage: 'invalid'
      };

      const response = await fetch(`${API_BASE}/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUpdate)
      });

      // Contract: Must return 400 Bad Request
      expect(response.status).toBe(400);
    });
  });
});
