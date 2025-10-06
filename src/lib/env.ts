/**
 * Environment variables utility
 * Provides typed access to environment variables
 */

export const env = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;
