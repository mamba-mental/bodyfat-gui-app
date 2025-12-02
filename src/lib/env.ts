/**
 * Environment variables utility
 * Provides typed access to environment variables
 */

export const env = {
  // Hardcoded to avoid environment variable caching issues - Python API runs on port 8001
  API_BASE_URL: 'http://127.0.0.1:8001',
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;
