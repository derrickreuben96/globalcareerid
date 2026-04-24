import {
  BarChart3,
  Building2,
  AlertTriangle,
  Users,
  Shield,
  MessageSquareText,
  LogOut,
  Activity,
  FileText,
  Edit,
  Fingerprint,
  ScrollText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminSidebarProps {
  pendingCount: number;
  disputeCount: number;
  onSignOut: () => void;
}

const navItems = [
  { title: "Overview", url: "overview", icon: BarChart3 },
  { title: "User Management", url: "users", icon: Users },
  { title: "Employer Verification", url: "employers", icon: Building2 },
  { title: "Dispute Resolution", url: "disputes", icon: AlertTriangle },
  { title: "Experience Requests", url: "experience-requests", icon: Edit },
  { title: "Duplicate Risks", url: "duplicate-risks", icon: Fingerprint },
  { title: "Document Reviews", url: "documents", icon: FileText },
  { title: "Consent Log", url: "consent-log", icon: ScrollText },
  { title: "AI Assistant", url: "ai-chat", icon: MessageSquareText },
  { title: "Activity Log", url: "activity", icon: Activity },
];

export function AdminSidebar({
  pendingCount,
  disputeCount,
  onSignOut,
}: AdminSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sidebar-foreground text-sm">
              Admin Console
            </h2>
            <p className="text-xs text-muted-foreground">Global Career ID</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`/admin?section=${item.url}`}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.url === "employers" && pendingCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-5 text-[10px] px-1.5"
                        >
                          {pendingCount}
                        </Badge>
                      )}
                      {item.url === "disputes" && disputeCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-5 min-w-5 text-[10px] px-1.5 bg-warning text-warning-foreground"
                        >
                          {disputeCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
