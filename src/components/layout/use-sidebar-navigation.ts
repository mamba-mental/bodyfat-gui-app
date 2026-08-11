"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useSidebar } from "@/components/ui/sidebar"

export function useSidebarNavigation(routes: readonly string[]) {
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  React.useEffect(() => {
    for (const route of new Set(routes)) {
      router.prefetch(route)
    }
  }, [router, routes])

  return React.useCallback((route?: string) => {
    if (route) {
      router.push(route)
    }
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, router, setOpenMobile])
}
