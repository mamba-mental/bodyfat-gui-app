"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calculator,
  FileText,
  History,
  Home,
  PlusCircle,
  Settings,
  TrendingUp,
  Brain,
  MessageSquare,
} from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import ClientWrapper from "@/components/ui/client-wrapper"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ProfileHeader } from "@/components/profile/profile-header"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const DESKTOP_BREAKPOINT = 1024

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Setup Profile",
    url: "/setup",
    icon: Settings,
    conditional: "setup"
  },
  {
    title: "New Entry",
    url: "/entries/new",
    icon: PlusCircle,
  },
  {
    title: "Entry History",
    url: "/entries",
    icon: History,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Progress Charts",
    url: "/charts",
    icon: TrendingUp,
  },
]

const toolItems = [
  {
    title: "Calculator",
    url: "/calculator",
    icon: Calculator,
  },
  {
    title: "Report Generator",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "AI Settings",
    url: "/settings/ai",
    icon: Brain,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Changelog",
    url: "/changelog",
    icon: History,
  },
]

const aiItems = [
  {
    title: "AI Chat",
    url: "/ai/chat",
    icon: MessageSquare,
  },
  {
    title: "AI Insights",
    url: "/ai/insights",
    icon: Brain,
  },
]

function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar role="navigation" aria-label="Main navigation">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-4 py-2">
          <ClientIcon icon={TrendingUp} className="h-6 w-6" aria-hidden="true" />
          <h1 className="font-semibold text-lg">
            <span className="sr-only">ApexFit AI Alpha - </span>
            Ap³𝘹Fit.ai – 𝛼
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel id="navigation-section">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu role="menu" aria-labelledby="navigation-section">
              {navigationItems.map((item) => {
                // Check if this is the setup item and user has data
                const isSetupComplete = item.conditional === "setup" && typeof window !== "undefined" && localStorage.getItem('userData')
                const isDisabled = item.conditional === "setup" && isSetupComplete

                return (
                  <SidebarMenuItem key={item.title} role="menuitem">
                    <SidebarMenuButton
                      asChild={!isDisabled}
                      isActive={pathname === item.url}
                      className={cn(
                        "bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-primary/50",
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      )}
                      aria-current={pathname === item.url ? "page" : undefined}
                      aria-disabled={isDisabled ? "true" : undefined}
                    >
                      {isDisabled ? (
                        <div
                          className="flex items-center gap-2"
                          aria-label={`${item.title} - Already completed`}
                        >
                          <ClientIcon icon={item.icon} className="h-4 w-4" aria-hidden="true" />
                          <span>{item.title}</span>
                          <span className="ml-auto text-xs text-muted-foreground" aria-label="Completed">✓</span>
                        </div>
                      ) : (
                        <Link
                          href={item.url}
                          aria-label={`Navigate to ${item.title}`}
                        >
                          <ClientIcon icon={item.icon} className="h-4 w-4" aria-hidden="true" />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator aria-hidden="true" />
        <SidebarGroup>
          <SidebarGroupLabel id="tools-section">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu role="menu" aria-labelledby="tools-section">
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.title} role="menuitem">
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-primary/50"
                    aria-current={pathname === item.url ? "page" : undefined}
                  >
                    <Link
                      href={item.url}
                      aria-label={`Access ${item.title}`}
                    >
                      <ClientIcon icon={item.icon} className="h-4 w-4" aria-hidden="true" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator aria-hidden="true" />
        <SidebarGroup>
          <SidebarGroupLabel id="ai-features-section">AI Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu role="menu" aria-labelledby="ai-features-section">
              {aiItems.map((item) => (
                <SidebarMenuItem key={item.title} role="menuitem">
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-primary/50"
                    aria-current={pathname === item.url ? "page" : undefined}
                  >
                    <Link
                      href={item.url}
                      aria-label={`Access ${item.title}`}
                    >
                      <ClientIcon icon={item.icon} className="h-4 w-4" aria-hidden="true" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [hasMounted, setHasMounted] = React.useState(false)

  // Set initial sidebar state based on viewport and respond to resize across the breakpoint
  React.useEffect(() => {
    const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT
    setSidebarOpen(isDesktop)
    setHasMounted(true)

    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const onChange = (e: MediaQueryListEvent) => {
      setSidebarOpen(e.matches)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return (
    <SidebarProvider open={hasMounted ? sidebarOpen : true} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full" role="application" aria-label="ApexFit AI Fitness Tracker">
        {/* Screen reader announcements region */}
        <div
          id="sr-announcements"
          aria-live="polite"
          aria-atomic="false"
          className="sr-announcer"
        />

        <aside role="complementary" aria-label="Application navigation">
          <ClientWrapper
            fallback={
              <div
                className="w-64 bg-background border-r"
                role="navigation"
                aria-label="Loading navigation"
              >
                <div className="p-4">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-muted rounded"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            }
            useSuspense={true}
          >
            <AppSidebar />
          </ClientWrapper>
        </aside>

        <div className="flex-1 flex flex-col">
          <header
            className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            role="banner"
          >
            <div className="container flex h-14 items-center">
              <SidebarTrigger
                aria-label="Toggle navigation menu"
                aria-expanded="false"
                aria-controls="sidebar-content"
              />
              <nav className="ml-auto flex items-center space-x-4" aria-label="Secondary navigation">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Export your fitness data to external file"
                >
                  Export Data
                </Button>
                <ThemeToggle />
              </nav>
            </div>
          </header>

          <main
            className="flex-1"
            role="main"
            id="main-content"
            aria-label="Main application content"
            tabIndex={-1}
          >
            <section role="complementary" aria-label="User profile information">
              <ProfileHeader className="border-b" compact={true} />
            </section>

            <section
              className="space-y-4 p-4 md:p-8 pt-6"
              role="main"
              aria-label="Primary content area"
            >
              {children}
            </section>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
