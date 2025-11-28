import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000, // 30 seconds for API tests
    hookTimeout: 30000, // 30 seconds for hooks
    pool: 'threads', // Use threads but pin to a single worker for deterministic seeding
    maxWorkers: 1,
    minWorkers: 1,
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1,
      },
      forks: {
        singleFork: true, // Run all tests in a single process sequentially
      },
    },
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/public/**',
        '**/.next/**',
        '**/.storybook/**',
        '**/*.d.ts',
        '**/src/types/**',
        '**/src/lib/**'
      ],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85
      }
    },
    include: [
      'tests/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
