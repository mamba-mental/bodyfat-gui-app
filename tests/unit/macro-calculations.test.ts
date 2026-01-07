import { describe, it, expect } from 'vitest'

// Extracted macro calculation logic from calorie-management-widget.tsx
// This mirrors the calculation in the component for testing purposes
interface UserData {
  current_weight: number
  protein_intake?: number
  diet_type?: string
}

interface MacroBreakdown {
  protein: { grams: number; calories: number; percentage: number }
  carbs: { grams: number; calories: number; percentage: number }
  fat: { grams: number; calories: number; percentage: number }
}

function calculateMacros(user: UserData, currentCalories: number): MacroBreakdown | null {
  if (!user || !currentCalories) return null

  const proteinCaloriesPerGram = 4
  const carbCaloriesPerGram = 4
  const fatCaloriesPerGram = 9

  // Base protein on user's protein intake if available, otherwise calculate
  const proteinGrams = user.protein_intake || Math.max(user.current_weight * 1.0, 140)
  const proteinCalories = proteinGrams * proteinCaloriesPerGram

  // Fat recommendations based on diet type
  let fatPercentage = 0.25 // Default 25%
  if (user.diet_type === 'keto') fatPercentage = 0.70
  else if (user.diet_type === 'high_protein') fatPercentage = 0.20
  else if (user.diet_type === 'balanced') fatPercentage = 0.30

  const fatCalories = currentCalories * fatPercentage
  const fatGrams = fatCalories / fatCaloriesPerGram

  // Remaining calories for carbs
  const carbCalories = Math.max(0, currentCalories - proteinCalories - fatCalories)
  const carbGrams = carbCalories / carbCaloriesPerGram

  return {
    protein: {
      grams: Math.round(proteinGrams),
      calories: Math.round(proteinCalories),
      percentage: Math.round((proteinCalories / currentCalories) * 100)
    },
    carbs: {
      grams: Math.round(carbGrams),
      calories: Math.round(carbCalories),
      percentage: Math.round((carbCalories / currentCalories) * 100)
    },
    fat: {
      grams: Math.round(fatGrams),
      calories: Math.round(fatCalories),
      percentage: Math.round((fatCalories / currentCalories) * 100)
    }
  }
}

describe('Macro Calculation Tests', () => {
  describe('Default Diet Type (25% fat)', () => {
    it('should calculate macros for a 200lb user with 2000 calories', () => {
      const user: UserData = { current_weight: 200 }
      const macros = calculateMacros(user, 2000)

      expect(macros).not.toBeNull()
      // Protein: max(200 * 1.0, 140) = 200g = 800 cal = 40%
      expect(macros!.protein.grams).toBe(200)
      expect(macros!.protein.calories).toBe(800)
      expect(macros!.protein.percentage).toBe(40)

      // Fat: 2000 * 0.25 = 500 cal / 9 = 55.56g = 25%
      expect(macros!.fat.grams).toBe(56)
      expect(macros!.fat.calories).toBe(500)
      expect(macros!.fat.percentage).toBe(25)

      // Carbs: 2000 - 800 - 500 = 700 cal / 4 = 175g = 35%
      expect(macros!.carbs.grams).toBe(175)
      expect(macros!.carbs.calories).toBe(700)
      expect(macros!.carbs.percentage).toBe(35)
    })

    it('should use minimum protein of 140g for lighter users', () => {
      const user: UserData = { current_weight: 120 }
      const macros = calculateMacros(user, 1800)

      expect(macros).not.toBeNull()
      // Protein: max(120 * 1.0, 140) = 140g = 560 cal
      expect(macros!.protein.grams).toBe(140)
      expect(macros!.protein.calories).toBe(560)
    })

    it('should use custom protein intake when provided', () => {
      const user: UserData = { current_weight: 180, protein_intake: 220 }
      const macros = calculateMacros(user, 2500)

      expect(macros).not.toBeNull()
      // Protein: 220g (custom) = 880 cal
      expect(macros!.protein.grams).toBe(220)
      expect(macros!.protein.calories).toBe(880)
    })
  })

  describe('Keto Diet Type (70% fat)', () => {
    it('should calculate keto macros correctly', () => {
      const user: UserData = { current_weight: 180, diet_type: 'keto' }
      const macros = calculateMacros(user, 2000)

      expect(macros).not.toBeNull()
      // Protein: 180g = 720 cal = 36%
      expect(macros!.protein.grams).toBe(180)
      expect(macros!.protein.calories).toBe(720)

      // Fat: 2000 * 0.70 = 1400 cal / 9 = 155.56g = 70%
      expect(macros!.fat.grams).toBe(156)
      expect(macros!.fat.calories).toBe(1400)
      expect(macros!.fat.percentage).toBe(70)

      // Carbs: 2000 - 720 - 1400 = -120 cal, clamped to 0
      expect(macros!.carbs.calories).toBe(0)
      expect(macros!.carbs.grams).toBe(0)
      expect(macros!.carbs.percentage).toBe(0)
    })
  })

  describe('High Protein Diet Type (20% fat)', () => {
    it('should calculate high protein macros correctly', () => {
      const user: UserData = { current_weight: 200, diet_type: 'high_protein' }
      const macros = calculateMacros(user, 2400)

      expect(macros).not.toBeNull()
      // Protein: 200g = 800 cal = 33%
      expect(macros!.protein.grams).toBe(200)
      expect(macros!.protein.calories).toBe(800)

      // Fat: 2400 * 0.20 = 480 cal / 9 = 53.33g = 20%
      expect(macros!.fat.grams).toBe(53)
      expect(macros!.fat.calories).toBe(480)
      expect(macros!.fat.percentage).toBe(20)

      // Carbs: 2400 - 800 - 480 = 1120 cal / 4 = 280g = 47%
      expect(macros!.carbs.grams).toBe(280)
      expect(macros!.carbs.calories).toBe(1120)
      expect(macros!.carbs.percentage).toBe(47)
    })
  })

  describe('Balanced Diet Type (30% fat)', () => {
    it('should calculate balanced macros correctly', () => {
      const user: UserData = { current_weight: 175, diet_type: 'balanced' }
      const macros = calculateMacros(user, 2200)

      expect(macros).not.toBeNull()
      // Protein: 175g = 700 cal = 32%
      expect(macros!.protein.grams).toBe(175)
      expect(macros!.protein.calories).toBe(700)

      // Fat: 2200 * 0.30 = 660 cal / 9 = 73.33g = 30%
      expect(macros!.fat.grams).toBe(73)
      expect(macros!.fat.calories).toBe(660)
      expect(macros!.fat.percentage).toBe(30)

      // Carbs: 2200 - 700 - 660 = 840 cal / 4 = 210g = 38%
      expect(macros!.carbs.grams).toBe(210)
      expect(macros!.carbs.calories).toBe(840)
      expect(macros!.carbs.percentage).toBe(38)
    })
  })

  describe('Edge Cases', () => {
    it('should return null when user is not provided', () => {
      const macros = calculateMacros(null as unknown as UserData, 2000)
      expect(macros).toBeNull()
    })

    it('should return null when calories is 0', () => {
      const user: UserData = { current_weight: 180 }
      const macros = calculateMacros(user, 0)
      expect(macros).toBeNull()
    })

    it('should handle very low calorie intake', () => {
      const user: UserData = { current_weight: 150 }
      const macros = calculateMacros(user, 1000)

      expect(macros).not.toBeNull()
      // Protein: max(150, 140) = 150g = 600 cal = 60%
      expect(macros!.protein.grams).toBe(150)
      expect(macros!.protein.calories).toBe(600)

      // Fat: 1000 * 0.25 = 250 cal = 25%
      expect(macros!.fat.calories).toBe(250)

      // Carbs: 1000 - 600 - 250 = 150 cal / 4 = 37.5g = 15%
      expect(macros!.carbs.grams).toBe(38)
      expect(macros!.carbs.calories).toBe(150)
    })

    it('should ensure percentages sum to approximately 100%', () => {
      const user: UserData = { current_weight: 180 }
      const macros = calculateMacros(user, 2000)

      expect(macros).not.toBeNull()
      const totalPercentage = macros!.protein.percentage + macros!.carbs.percentage + macros!.fat.percentage
      // Allow for rounding errors
      expect(totalPercentage).toBeGreaterThanOrEqual(99)
      expect(totalPercentage).toBeLessThanOrEqual(101)
    })

    it('should handle calorie math validation', () => {
      const user: UserData = { current_weight: 200 }
      const macros = calculateMacros(user, 2500)

      expect(macros).not.toBeNull()
      // Verify total calories from macros approximately equals target
      const totalCalories =
        macros!.protein.grams * 4 +
        macros!.carbs.grams * 4 +
        macros!.fat.grams * 9

      // Allow for rounding errors (within 50 calories)
      expect(Math.abs(totalCalories - 2500)).toBeLessThan(50)
    })
  })
})
