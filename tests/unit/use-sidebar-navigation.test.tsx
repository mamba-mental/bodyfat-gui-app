import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigationMocks = vi.hoisted(() => ({
  prefetch: vi.fn(),
  push: vi.fn(),
  setOpenMobile: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: navigationMocks.prefetch, push: navigationMocks.push }),
}))

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    isMobile: true,
    setOpenMobile: navigationMocks.setOpenMobile,
  }),
}))

import { useSidebarNavigation } from "@/components/layout/use-sidebar-navigation"

describe("useSidebarNavigation", () => {
  beforeEach(() => {
    navigationMocks.prefetch.mockReset()
    navigationMocks.push.mockReset()
    navigationMocks.setOpenMobile.mockReset()
  })

  it("prefetches every unique sidebar destination", async () => {
    renderHook(() => useSidebarNavigation(["/", "/reports", "/reports", "/charts"]))

    await waitFor(() => {
      expect(navigationMocks.prefetch).toHaveBeenCalledTimes(3)
    })
    expect(navigationMocks.prefetch).toHaveBeenCalledWith("/")
    expect(navigationMocks.prefetch).toHaveBeenCalledWith("/reports")
    expect(navigationMocks.prefetch).toHaveBeenCalledWith("/charts")
  })

  it("closes the mobile drawer immediately after a destination is chosen", () => {
    const { result } = renderHook(() => useSidebarNavigation(["/reports"]))

    act(() => result.current("/reports"))

    expect(navigationMocks.push).toHaveBeenCalledWith("/reports")
    expect(navigationMocks.setOpenMobile).toHaveBeenCalledWith(false)
  })
})
