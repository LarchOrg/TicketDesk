import {
  Bell,
  Filter,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/contexts/AuthContext";
import {
  getRoleColor,
  getRoleDisplayName,
  useRolePermissions,
} from "~/lib/role-utils";
import { Button } from "./ui/button";

interface NavbarProps {
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onCreateTicket?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function Navbar({
  showSearch = true,
  onSearch,
  onFilter,
  darkMode = false,
  onToggleDarkMode,
  onCreateTicket,
  sidebarOpen = true,
  onToggleSidebar,
}: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const permissions = useRolePermissions();
  const [signingOut, setSigningOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      console.log("🚪 Signing out...");
      setSigningOut(true);
      navigate("/login");
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-40 h-18">
      <div className="h-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-full">
          {/* Left Section - Menu Toggle and Search */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Mobile Menu Toggle */}
            {onToggleSidebar && (
              <Button
                onClick={onToggleSidebar}
                variant="ghost"
                size="sm"
                className="lg:hidden p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            )}

            {/* Search Bar */}
            {showSearch && (
              <div className="hidden md:flex flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
                    onChange={(e) => onSearch?.(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-1">
            {user ? (
              <>
                {/* Create Ticket Button */}
                {onCreateTicket && (
                  <Button
                    onClick={onCreateTicket}
                    size="sm"
                    className="hidden sm:flex items-center space-x-2 bg-primary hover:bg-primary/90 px-4 py-2 h-9"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">New Ticket</span>
                  </Button>
                )}

                {/* Filter Button */}
                {onFilter && (
                  <Button
                    onClick={onFilter}
                    variant="ghost"
                    size="sm"
                    className="p-2 h-9 w-9 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Filter tickets"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                )}

                {/* Dark Mode Toggle */}
                {onToggleDarkMode && (
                  <Button
                    onClick={onToggleDarkMode}
                    variant="ghost"
                    size="sm"
                    className="p-2 h-9 w-9 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={
                      darkMode ? "Switch to light mode" : "Switch to dark mode"
                    }
                  >
                    {darkMode ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </Button>
                )}

                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative p-2 h-9 w-9 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-destructive-foreground font-bold leading-none">
                      3
                    </span>
                  </span>
                </Button>

                {/* Settings */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-9 w-9 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                {/* User Menu */}
                <div className="relative ml-2">
                  <Button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    variant="ghost"
                    className="flex items-center space-x-3 p-2 h-10 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-primary-foreground">
                        {profile?.name?.charAt(0)?.toUpperCase() ||
                          user.email?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {profile?.name || user.email?.split("@")[0] || "User"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor((profile?.role as any) || "user")}`}
                        >
                          {getRoleDisplayName((profile?.role as any) || "user")}
                        </span>
                      </div>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg py-2 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">
                          {profile?.name || user.email?.split("@")[0] || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {user.email}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor((profile?.role as any) || "user")}`}
                        >
                          {getRoleDisplayName((profile?.role as any) || "user")}
                        </span>
                      </div>

                      <div className="py-2">
                        <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </button>
                        <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>

                        {/* Admin-only options */}
                        {permissions.canManageUsers && (
                          <>
                            <div className="border-t border-border my-2"></div>
                            <div className="px-4 py-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Admin Tools
                              </p>
                            </div>
                            <button
                              onClick={() => navigate("/admin/users")}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Users className="w-4 h-4" />
                              <span>Manage Users</span>
                            </button>
                            <button
                              onClick={() => navigate("/admin/settings")}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Shield className="w-4 h-4" />
                              <span>System Settings</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="border-t border-border pt-2">
                        <button
                          onClick={handleSignOut}
                          disabled={signingOut}
                          className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>
                            {signingOut ? "Signing Out..." : "Sign Out"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
}
