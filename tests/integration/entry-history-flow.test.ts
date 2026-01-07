import { describe, it, expect } from 'vitest';
import axios from 'axios';

interface EntryHistoryResponse {
  total_count: number;
  data_loss_detected: boolean;
  date_range: {
    earliest: string;
    latest: string;
  };
  entries: Array<{
    id: string;
    user_id: string;
    date: string;
    weight: number;
    neck: number;
    waist: number;
  }>;
}

describe('T008: Entry History Flow Verification', () => {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
  const TEST_USER_ID = 'test-user';

  it('should successfully retrieve entry history with all required criteria', async () => {
    try {
      const response = await axios.get<EntryHistoryResponse>(`${API_BASE_URL}/api/entries/history`, {
        params: { user_id: TEST_USER_ID }
      });

      const data = response.data;

      // 1. Verify total_count is at least 12
      expect(data.total_count).toBeGreaterThanOrEqual(12);

      // 2. Verify no data loss
      expect(data.data_loss_detected).toBe(false);

      // 3. Verify date range exists
      expect(data.date_range.earliest).toBeTruthy();
      expect(data.date_range.latest).toBeTruthy();

      // 4. Validate entries
      expect(data.entries.length).toBeGreaterThan(0);

      data.entries.forEach(entry => {
        // Check each entry has required fields
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('user_id', TEST_USER_ID);
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('weight');
        expect(entry).toHaveProperty('neck');
        expect(entry).toHaveProperty('waist');

        // Additional type validations
        expect(typeof entry.id).toBe('string');
        expect(typeof entry.weight).toBe('number');
        expect(typeof entry.neck).toBe('number');
        expect(typeof entry.waist).toBe('number');

        // Validate numeric ranges
        expect(entry.weight).toBeGreaterThan(0);
        expect(entry.neck).toBeGreaterThan(0);
        expect(entry.waist).toBeGreaterThan(0);
      });
    } catch (error) {
      console.error('Error in entry history retrieval test:', error);
      throw error;
    }
  });
});