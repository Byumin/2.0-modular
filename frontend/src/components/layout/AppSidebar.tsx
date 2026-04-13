import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  IconDashboard,
  IconClipboardList,
  IconUsers,
  IconSettings,
  IconLogout,
  IconBrain,
  IconUserSearch,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "대시보드", url: "/admin/workspace", icon: IconDashboard },
  { title: "검사 관리", url: "/admin/create", icon: IconClipboardList },
  { title: "내담자 관리", url: "/admin/clients", icon: IconUsers },
  { title: "동일인 검토", url: "/admin/identity-reviews", icon: IconUserSearch, badgeKey: "identity_reviews" },
]

const navSecondary = [
  { title: "설정", url: "/admin/settings", icon: IconSettings },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onLogout?: () => void
}

export function AppSidebar({ onLogout, ...props }: AppSidebarProps) {
  const location = useLocation()
  const [pendingReviewCount, setPendingReviewCount] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function fetchCount() {
      try {
        const res = await fetch("/api/admin/identity-reviews")
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setPendingReviewCount(data.pending_count ?? 0)
      } catch {
        // ignore
      }
    }
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [location.pathname])

  return (
    <Sidebar collapsible="none" className="h-screen border-r" {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <IconBrain className="size-6 text-primary" />
          <span className="text-base font-semibold text-foreground">Modular Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const badge = item.badgeKey === "identity_reviews" && pendingReviewCount > 0
                  ? pendingReviewCount
                  : null
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url} className="flex items-center gap-2 w-full">
                        <item.icon />
                        <span className="flex-1">{item.title}</span>
                        {badge !== null && (
                          <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="로그아웃"
              className="text-muted-foreground hover:text-destructive"
            >
              <IconLogout />
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
