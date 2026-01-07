import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'
import React from 'react'
import { seedTestData } from './tests/setup/seed-test-data'

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
