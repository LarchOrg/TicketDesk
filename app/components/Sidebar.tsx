import {
  BarChart3,
  Bell,
  FileText,
  Home,
  Menu,
  Settings,
  Ticket,
  User,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "~/contexts/AuthContext";
import { useSidebar } from "~/contexts/SidebarContext";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    roles: ["user", "agent", "admin"],
  },
  {
    name: "All Tickets",
    href: "/tickets",
    icon: Ticket,
    roles: ["agent", "admin"],
  },
  {
    name: "My Tickets",
    href: "/my-tickets",
    icon: FileText,
    roles: ["user", "agent", "admin"],
  },
];

const secondaryNavigation = [
  { name: "Team", href: "admin/users", icon: Users, roles: ["admin"] },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["agent", "admin"],
  },
  {
    name: "Settings",
    href: "admin/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const { user, profile } = useAuth();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const role = profile?.role || "user";

  // Use the collapsed prop if provided, otherwise use the global state
  const isCollapsed = collapsed !== undefined ? collapsed : !sidebarOpen;

  const isActive = (href: string) =>
    href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(href);

  const visibleNav = navigation.filter((item) => item.roles.includes(role));
  const visibleSecondary = secondaryNavigation.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header / Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Ticket className="w-6 h-6 text-primary-foreground" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-foreground">TicketDesk</h1>
              <p className="text-xs text-muted-foreground">Support System</p>
            </div>
          </div>
        )}

        {/* Menu Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5 text-muted-foreground" />
          ) : (
            <X className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {visibleSecondary.length > 0 && !isCollapsed && (
          <div className="mt-6 border-t border-border pt-3">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Management
            </p>
            {visibleSecondary.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Collapsed secondary navigation */}
        {visibleSecondary.length > 0 && isCollapsed && (
          <div className="mt-6 border-t border-border pt-3 space-y-1">
            {visibleSecondary.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title={item.name}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="px-6 py-4 border-t border-border">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg bg-muted/30 ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.name || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
          <button
            className={`p-1.5 hover:bg-muted rounded-lg transition-colors ${isCollapsed ? "hidden" : ""}`}
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
