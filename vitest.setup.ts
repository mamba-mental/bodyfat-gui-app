import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'
import React from 'react'
import { seedTestData } from './tests/setup/seed-test-data'

// The app runs on :3010 (Windows reserves :3000). Contract/integration tests
// default their API base to :3000, so without this they fetch a dead port and
// fail with connection errors that masquerade as logic failures. Point the
// env-driven tests at the real server so the suite actually exercises the app.
if (!process.env.NEXT_PUBLIC_API_URL) {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3010/api'
}

// Ensure React is available globally for components relying on the classic runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).React = React

// Seed test data before running any tests
beforeAll(async () => {
  console.log('Seeding test data...')
  await seedTestData()
  console.log('Test data seeded successfully')
})

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})
