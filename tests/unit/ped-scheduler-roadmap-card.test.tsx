import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PedSchedulerRoadmapCard } from "@/components/settings/ped-scheduler-roadmap-card"

describe("PedSchedulerRoadmapCard", () => {
  it("links the available 14-day manual MVP while preserving the full roadmap", () => {
    render(<PedSchedulerRoadmapCard />)

    expect(
      screen.getByRole("heading", { name: "AI-Assisted PED Inventory & Protocol Scheduler" }),
    ).toBeInTheDocument()
    expect(screen.getByText("14-day manual MVP available")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /open 14-day plan studio/i })).toHaveAttribute("href", "/plans")
    expect(screen.getByText(/AI label intake, arbitrary durations, reminders, and automated replanning remain on the roadmap/i)).toBeInTheDocument()
    expect(screen.getAllByText(/14-day, standard, and custom-length cuts/i)).not.toHaveLength(0)
    expect(screen.getByText(/will not invent compounds, doses, substitutions, or missing source values/i)).toBeInTheDocument()
  })
})
