import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "~/contexts/AuthContext";
import {
  getRoleColor,
  getRoleDisplayName,
  ROLE_PERMISSIONS,
} from "~/lib/role-utils";
import NotificationDropdown from "./NotificationDropdown";
import { Button } from "./ui/button";

// Simplified / stricter props for the redesigned navbar
interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onCreateTicket: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// Page title mapping
const PAGE_TITLES: Record<string, { title: string }> = {
  "/": { title: "Dashboard" },
  "/tickets": { title: "All Tickets" },
  "/analytics": { title: "Analytics" },
  "/my-tickets": {
    title: "My Tickets",
  },
  "/newtickets": { title: "New Ticket" },
  "/reports": { title: "Reports" },
  "/profile": { title: "Profile" },
  "/admin/users": {
    title: "User Management",
  },
  "/admin/settings": {
    title: "Admin Settings",
  },
};

export function Navbar({
  darkMode,
  onToggleDarkMode,
  onCreateTicket,
  sidebarOpen,
  onToggleSidebar,
}: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSigningOut(false);
    }
  };

  // Get current page info
  const currentPage = PAGE_TITLES[location.pathname] || {
    title: "HelpDesk",
  };

  // Check if user can access admin features
  const userRole = profile?.role as "admin" | "agent" | "user" | undefined;
  const canAccessAdmin = userRole && ROLE_PERMISSIONS[userRole]?.canManageUsers;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-18 items-center justify-between">
          {/* Left Section - Logo, Menu Toggle, and Page Title */}
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="cursor-pointer hover:bg-muted transition-colors lg:hidden"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Page Title */}
            <div className="hidden md:flex items-center gap-4 ml-3 border-border">
              <h1 className="text-lg font-semibold text-foreground">
                {currentPage.title}
              </h1>
            </div>
          </div>

          {/* Right Section - Actions and User Menu */}
          <div className="flex items-center gap-3">
            {/* New Ticket Button - Redesigned */}
            <Button
              onClick={onCreateTicket}
              className="cursor-pointer bg-gradient-to-r from-primary to-primary/100 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-sm font-semibold text-sm border border-primary/20 hover:border-primary/30 hover:scale-105 transform"
            >
              <Plus className="h-3 w-3" />
              <span className="tracking-wide">Add Ticket</span>
            </Button>

            {/* Mobile New Ticket Button - Redesigned */}
            <Button
              onClick={onCreateTicket}
              size="sm"
              className="cursor-pointer bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 sm:hidden rounded-xl border border-primary/20 hover:border-primary/30 hover:scale-105 transform p-3"
              aria-label="Create new ticket"
            >
              <div className="w-4 h-4 bg-white/20 flex items-center justify-center">
                <Plus className="h-2.5 w-2.5" />
              </div>
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleDarkMode}
              className="cursor-pointer hover:bg-muted transition-colors rounded-lg"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Notifications */}
            {user && <NotificationDropdown />}

            {/* User Menu */}
            {user && profile ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-6   cursor-pointer hover:bg-muted transition-colors flex items-center gap-2"
                  aria-label="User menu"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {profile.name?.charAt(0)?.toUpperCase() ||
                      user.email?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-foreground">
                      {profile.name || user.email?.split("@")[0]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getRoleDisplayName(userRole || "user")}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-lg border border-border bg-background shadow-lg">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                            {profile.name?.charAt(0)?.toUpperCase() ||
                              user.email?.charAt(0)?.toUpperCase() ||
                              "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {profile.name || user.email?.split("@")[0]}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full font-medium mt-1 inline-block ${getRoleColor(userRole || "user")}`}
                            >
                              {getRoleDisplayName(userRole || "user")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition-colors"
                        >
                          <User className="h-4 w-4" />
                          Profile Settings
                        </Link>

                        {canAccessAdmin && (
                          <>
                            <div className="my-1 border-t border-border" />
                            <Link
                              to="/admin/users"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition-colors"
                            >
                              <Users className="h-4 w-4" />
                              User Management
                            </Link>
                            <Link
                              to="/admin/settings"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition-colors"
                            >
                              <Settings className="h-4 w-4" />
                              Admin Settings
                            </Link>
                          </>
                        )}

                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleSignOut();
                          }}
                          disabled={signingOut}
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <LogOut className="h-4 w-4" />
                          {signingOut ? "Signing out..." : "Sign out"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Login/Signup buttons for unauthenticated users */
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer hover:bg-muted transition-colors"
                  >
                    Sign in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    size="sm"
                    className="cursor-pointer bg-primary hover:bg-primary/90 transition-colors"
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
