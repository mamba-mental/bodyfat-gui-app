import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const setUserData = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/contexts/app-context', () => ({
  useApp: () => ({
    state: {
      current_user: {
        name: 'MJ PRIME', age: 48, height_feet: 5, height_inches: 10,
        current_weight: 270.5, current_bf: 38.5, goal_weight: 217,
        goal_bf: 13, workout_type: 'Bodybuilding', start_date: '2026-06-03',
      },
    },
    setUserData,
  }),
}))

import SetupPage from '@/app/setup/page'

describe('Setup new-program flow', () => {
  beforeEach(() => {
    push.mockReset()
    setUserData.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('keeps the current profile and opens the editable prefilled new-program form', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<SetupPage />)

    fireEvent.click(screen.getByRole('button', { name: /Start New Program/i }))

    expect(push).toHaveBeenCalledWith('/setup/custom?newProgram=true')
    expect(setUserData).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
