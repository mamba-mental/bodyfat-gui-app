import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PedInventoryWorkspace } from "@/components/challenge/ped-inventory-workspace"
import { challengeApi } from "@/lib/challenge-api"
import type { ProtocolWindow } from "@/types/challenge"

vi.mock("@/lib/challenge-api", () => ({
  challengeApi: {
    inventory: vi.fn(),
    inventoryCoverage: vi.fn(),
    createInventoryItem: vi.fn(),
    updateInventoryItem: vi.fn(),
    deleteInventoryItem: vi.fn(),
  },
}))

const protocol = {
  start_week: 2,
  end_week: 3,
  ped_stack: [{ compound: "clenbuterol", source_name: "Clen" }],
} as ProtocolWindow

describe("PedInventoryWorkspace", () => {
  beforeEach(() => {
    vi.mocked(challengeApi.inventory).mockResolvedValue([])
    vi.mocked(challengeApi.inventoryCoverage).mockResolvedValue({
      ready: false,
      validation_status: "inventory_math_only_not_medical_safety",
      medical_safety_status: "not_validated",
      required_by_compound: [],
      scheduled_events: [],
      unused_inventory: [],
      range_requirements: [
        {
          compound: "clenbuterol",
          source_name: "Clen",
          source_value: "40–60mcg",
          minimum: "40",
          maximum: "60",
          unit: "mcg",
          occurrence_count: 14,
        },
      ],
      blockers: [
        {
          code: "unresolved_source_range",
          severity: "critical",
          compound: "clenbuterol",
          message: "Clen still has an unresolved source range: 40–60mcg",
        },
      ],
    })
  })

  it("shows editable manual inventory, reviewed range records, and persistent blockers", async () => {
    render(
      <PedInventoryWorkspace
        protocol={protocol}
        startDate="2026-08-11"
        onContextChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("heading", { name: "PED inventory & exact coverage" })).toBeInTheDocument()
    expect(screen.getByLabelText("Label name")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/unresolved source range/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Reviewed value for Clen 40–60mcg/i)).toBeInTheDocument()
    expect(screen.getByText(/inventory math only/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/I confirm the inventory fields above match what is physically on hand/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/I attest this records a separate human review/i)).toBeInTheDocument()
  })
})
