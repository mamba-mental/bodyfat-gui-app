import { describe, it, expect } from 'vitest';
import axios from 'axios';

// Define Entry interface based on implied requirements
interface Entry {
  id: string;
  user_id: string;
  date: string;
  weight?: number;
  neck?: number;
  waist?: number;
  hip?: number;
}

// Contract Test for Entry History API
describe('Entry History API Contract Test', () => {
  const TEST_USER_ID = 'test-user';
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

  it('should return entry history with required fields', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/entries/history`, {
        params: { user_id: TEST_USER_ID }
      });

      // Validate response structure
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('entries');
      expect(response.data).toHaveProperty('total_count');
      expect(response.data).toHaveProperty('data_loss_detected');
      expect(response.data).toHaveProperty('date_range');

      const { entries, total_count, data_loss_detected, date_range } = response.data;

      // Verify entries array
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBe(total_count);

      // Check total_count requirement
      expect(total_count).toBeGreaterThanOrEqual(12);

      // Verify data_loss_detected
      expect(data_loss_detected).toBe(false);

      // Verify date_range
      expect(date_range).toHaveProperty('earliest');
      expect(date_range).toHaveProperty('latest');
      expect(typeof date_range.earliest).toBe('string');
      expect(typeof date_range.latest).toBe('string');

      // Validate each entry
      entries.forEach((entry: Entry) => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('user_id', TEST_USER_ID);
        expect(entry).toHaveProperty('date');

        // Optional fields can be validated if needed
        if (entry.weight !== undefined) {
          expect(typeof entry.weight).toBe('number');
        }
        if (entry.neck !== undefined) {
          expect(typeof entry.neck).toBe('number');
        }
        if (entry.waist !== undefined) {
          expect(typeof entry.waist).toBe('number');
        }
        if (entry.hip !== undefined) {
          expect(typeof entry.hip).toBe('number');
        }
      });
    } catch (error) {
      // Explicitly fail the test with detailed error information
      console.error('API Request Error:', error);
      throw error;
    }
  });
});