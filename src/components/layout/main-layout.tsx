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
  CalendarRange,
  ClipboardCheck,
  PencilRuler,
  Mountain,
  Utensils,
} from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import ClientWrapper from "@/components/ui/client-wrapper"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ProfileHeader } from "@/components/profile/profile-header"
import { useSidebarNavigation } from "@/components/layout/use-sidebar-navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApp } from "@/contexts/app-context"

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
    title: "Nutrition",
    url: "/nutrition",
    icon: Utensils,
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
  {
    title: "Plan Studio",
    url: "/plans",
    icon: CalendarRange,
  },
  {
    title: "14-Day Cut",
    url: "/challenge",
    icon: ClipboardCheck,
  },
]

const toolItems = [
  {
    title: "Calculator",
    url: "/calculator",
    icon: Calculator,
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
    title: "Template Editor",
    url: "/challenge/template",
    icon: PencilRuler,
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

const sidebarRoutes = [
  ...new Set([...navigationItems, ...toolItems, ...aiItems].map((item) => item.url)),
]

function AppSidebar() {
  const pathname = usePathname()
  const handleNavigation = useSidebarNavigation(sidebarRoutes)

  return (
    <Sidebar role="navigation" aria-label="Main navigation" className="border-border bg-background">
      <SidebarHeader className="border-b border-border bg-background">
        <div className="flex items-center gap-3 px-4 py-3 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary"><ClientIcon icon={Mountain} className="h-5 w-5" aria-hidden="true" /></div>
          <h1 className="font-serif text-xl font-semibold tracking-[0.08em]">
            <span className="sr-only">Apex Fit - </span>
            APEX FIT
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
                        "border border-transparent text-foreground hover:border-border hover:bg-accent data-[active=true]:border-primary/30 data-[active=true]:bg-accent data-[active=true]:text-foreground",
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
                          onClick={(event) => {
                            event.preventDefault()
                            handleNavigation(item.url)
                          }}
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
                    className="border border-transparent text-foreground hover:border-border hover:bg-accent data-[active=true]:border-primary/30 data-[active=true]:bg-accent data-[active=true]:text-foreground"
                    aria-current={pathname === item.url ? "page" : undefined}
                  >
                    <Link
                      href={item.url}
                      aria-label={`Access ${item.title}`}
                      onClick={(event) => {
                        event.preventDefault()
                        handleNavigation(item.url)
                      }}
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
                    className="border border-transparent text-foreground hover:border-border hover:bg-accent data-[active=true]:border-primary/30 data-[active=true]:bg-accent data-[active=true]:text-foreground"
                    aria-current={pathname === item.url ? "page" : undefined}
                  >
                    <Link
                      href={item.url}
                      aria-label={`Access ${item.title}`}
                      onClick={(event) => {
                        event.preventDefault()
                        handleNavigation(item.url)
                      }}
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
  const { state } = useApp()
  const user = state.current_user
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [hasMounted, setHasMounted] = React.useState(false)
  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

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
      <div className="apex-theme flex min-h-screen w-full bg-background text-foreground" role="application" aria-label="ApexFit AI Fitness Tracker">
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
            className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur"
            role="banner"
          >
            <div className="flex h-16 items-center px-4 md:px-6">
              <SidebarTrigger
                aria-label="Toggle navigation menu"
                aria-expanded="false"
                aria-controls="sidebar-content"
              />
              <nav className="ml-auto flex items-center gap-2 md:gap-4" aria-label="Secondary navigation">
                <Button asChild variant="outline" size="sm" aria-label="Open Plan Decision Studio">
                  <Link href="/plans"><CalendarRange className="mr-2 h-4 w-4" /> Current plan</Link>
                </Button>
                <ThemeToggle />
                {user && (
                  <Button asChild variant="ghost" className="h-11 gap-2 rounded-full px-2 pr-3" aria-label="Open profile settings">
                    <Link href="/settings">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={user.profile_picture} alt="" />
                        <AvatarFallback className="bg-accent text-xs font-semibold text-foreground">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="hidden max-w-36 truncate text-sm font-medium text-foreground md:inline">{user.name}</span>
                    </Link>
                  </Button>
                )}
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
            <section aria-label="User profile banner">
              <ProfileHeader compact />
            </section>
            <section
              className="space-y-4"
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
