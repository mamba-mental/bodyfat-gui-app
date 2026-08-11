import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PedSchedulerRoadmapCard } from "@/components/settings/ped-scheduler-roadmap-card"

describe("PedSchedulerRoadmapCard", () => {
  it("labels inventory-driven PED scheduling as coming soon with a safe scope", () => {
    render(<PedSchedulerRoadmapCard />)

    expect(
      screen.getByRole("heading", { name: "AI-Assisted PED Inventory & Protocol Scheduler" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Coming soon · specification in review")).toBeInTheDocument()
    expect(screen.getAllByText(/14-day, standard, and custom-length cuts/i)).not.toHaveLength(0)
    expect(screen.getByText(/will not invent compounds, doses, substitutions, or missing source values/i)).toBeInTheDocument()
  })
})
