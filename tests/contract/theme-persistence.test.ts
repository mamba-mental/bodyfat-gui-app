import { describe, it, expect } from 'vitest';
import { withBasePath } from '../../src/lib/api-path';

// Interfaces for request/response
interface ThemePutRequest {
  theme: 'dark' | 'light';
  user_id: string;
}

interface ThemePutResponse {
  theme: string;
  storage_updates: {
    localStorage: boolean;
    cookie: boolean;
    database: boolean;
  };
}

interface ThemeGetResponse {
  theme: string;
  sync_status: {
    localStorage: boolean;
    cookie: boolean;
    database: boolean;
  };
}

const TEST_USER_ID = 'test-user-theme';

describe('Theme Persistence API Contract Test', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
  const themeApiUrl = `${BASE_URL}${withBasePath('/api/theme')}`;

  it('should successfully PUT theme for a user', async () => {
    const putRequest: ThemePutRequest = {
      theme: 'dark',
      user_id: TEST_USER_ID
    };

    const response = await fetch(themeApiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putRequest)
    });

    expect(response.ok).toBe(true);
    const putData: ThemePutResponse = await response.json();

    expect(putData.theme).toBe('dark');
    expect(putData.storage_updates).toEqual({
      localStorage: true,
      cookie: true,
      database: true
    });
  });

  it('should successfully GET theme for a user', async () => {
    const response = await fetch(`${themeApiUrl}?user_id=${TEST_USER_ID}`);

    expect(response.ok).toBe(true);
    const getData: ThemeGetResponse = await response.json();

    expect(getData.theme).toBe('dark');
    expect(getData.sync_status).toEqual({
      localStorage: true,
      cookie: true,
      database: true
    });
  });

  it('should support theme round-trip (light theme)', async () => {
    // First, put light theme
    const putRequest: ThemePutRequest = {
      theme: 'light',
      user_id: TEST_USER_ID
    };

    const putResponse = await fetch(themeApiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putRequest)
    });

    expect(putResponse.ok).toBe(true);
    const putData: ThemePutResponse = await putResponse.json();

    expect(putData.theme).toBe('light');
    expect(putData.storage_updates).toEqual({
      localStorage: true,
      cookie: true,
      database: true
    });

    // Then, get theme to verify persistence
    const getResponse = await fetch(`${themeApiUrl}?user_id=${TEST_USER_ID}`);

    expect(getResponse.ok).toBe(true);
    const getData: ThemeGetResponse = await getResponse.json();

    expect(getData.theme).toBe('light');
    expect(getData.sync_status).toEqual({
      localStorage: true,
      cookie: true,
      database: true
    });
  });
});
