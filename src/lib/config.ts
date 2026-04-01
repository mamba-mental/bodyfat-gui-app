/**
 * Centralized Configuration
 *
 * All environment-specific settings should be defined here instead of
 * being hardcoded throughout the codebase. This enables:
 * - Easy environment switching (dev/staging/prod)
 * - Docker deployment flexibility
 * - Single source of truth for configuration
 */

// Server-side only environment variables (no NEXT_PUBLIC_ prefix)
const getServerEnv = (key: string, defaultValue: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: return default
    return defaultValue;
  }
  return process.env[key] || defaultValue;
};

// Client-side accessible environment variables (NEXT_PUBLIC_ prefix)
const getPublicEnv = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

/**
 * Python API Configuration
 * STANDARDIZED PORTS: Frontend 3713 | Backend/Python API 8313
 */
export const pythonApiConfig = {
  /** Base URL for Python PRIME API - STANDARDIZED PORT: 8313 */
  url: getPublicEnv('NEXT_PUBLIC_PYTHON_API_URL', 'http://127.0.0.1:8313'),

  /** Default timeout for calculations (60 seconds) */
  calculationTimeout: parseInt(
    getPublicEnv('NEXT_PUBLIC_PYTHON_API_CALC_TIMEOUT', '60000'),
    10
  ),

  /** Default timeout for data operations (8 seconds) */
  dataTimeout: parseInt(
    getPublicEnv('NEXT_PUBLIC_PYTHON_API_DATA_TIMEOUT', '8000'),
    10
  ),

  /** Maximum retries for failed requests */
  maxRetries: parseInt(
    getPublicEnv('NEXT_PUBLIC_PYTHON_API_MAX_RETRIES', '3'),
    10
  ),
} as const;

/**
 * Redis Configuration
 */
export const redisConfig = {
  /** Redis connection URL */
  url: getServerEnv('REDIS_URL', 'redis://172.23.89.12:6385'),

  /** Enable/disable Redis caching */
  enabled: getServerEnv('REDIS_ENABLED', 'true') === 'true',

  /** Maximum reconnection attempts */
  maxReconnectAttempts: parseInt(
    getServerEnv('REDIS_MAX_RECONNECT_ATTEMPTS', '10'),
    10
  ),
} as const;

/**
 * Application Configuration
 */
export const appConfig = {
  /** Default user ID (for single-user mode) */
  defaultUserId: getPublicEnv('NEXT_PUBLIC_DEFAULT_USER_ID', '1'),

  /** Base path for the application */
  basePath: getPublicEnv('NEXT_PUBLIC_BASE_PATH', ''),

  /** Enable debug mode */
  debug: getPublicEnv('NEXT_PUBLIC_DEBUG', 'false') === 'true',
} as const;

/**
 * CORS Configuration (for Python API)
 * STANDARDIZED PORTS: Frontend 3713 | Backend/Python API 8313
 */
export const corsConfig = {
  /** Allowed origins for CORS */
  allowedOrigins: getServerEnv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3713,http://127.0.0.1:3713,http://localhost:3000,http://127.0.0.1:3000'
  ).split(','),
} as const;

/**
 * Feature Flags
 */
export const featureFlags = {
  /** Enable AI-powered insights */
  enableAI: getPublicEnv('NEXT_PUBLIC_ENABLE_AI', 'true') === 'true',

  /** Enable Redis caching layer */
  enableRedisCache: getServerEnv('ENABLE_REDIS_CACHE', 'true') === 'true',

  /** Enable performance monitoring */
  enablePerformanceMonitoring:
    getPublicEnv('NEXT_PUBLIC_ENABLE_PERF_MONITORING', 'false') === 'true',
} as const;

/**
 * Combined configuration object for convenience
 */
export const config = {
  pythonApi: pythonApiConfig,
  redis: redisConfig,
  app: appConfig,
  cors: corsConfig,
  features: featureFlags,
} as const;

export default config;
