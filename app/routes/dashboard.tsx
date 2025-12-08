import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Edit,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Ticket,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { redirect, useNavigate, useNavigation } from "react-router";
import { DashboardSkeleton } from "~/components/LoadingComponents";
import StatusBadge from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import type { UserRole } from "../lib/role-utils";
import { createSupabaseServerClient } from "../lib/supabase-server";
import type { Profile, TicketStats, Ticket as TicketType } from "../lib/types";
import { createServices } from "../services";
import type { Route } from "./+types/dashboard";

interface UnifiedDashboardLoaderData {
  role: UserRole;
  tickets: TicketType[];
  assignedTickets?: TicketType[];
  allTickets?: TicketType[];
  stats: TicketStats;
  myStats?: {
    assigned: number;
    resolved: number;
    avgResponseTime: string;
  };
  users?: Profile[];
  agents?: Profile[];
  recentActivity?: any[];
  error?: string;
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<UnifiedDashboardLoaderData | Response> {
  try {
    const { supabase, response } = createSupabaseServerClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return redirect("/login", {
        headers: response.headers,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as UserRole) || "user";
    const services = createServices(supabase);

    const baseData: UnifiedDashboardLoaderData = {
      role,
      tickets: [],
      stats: {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        reopened: 0,
        closed: 0,
      },
    };

    switch (role) {
      case "admin": {
        const allTickets = await services.tickets.getTickets({
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 50,
        });

        const stats = await services.tickets.getTicketStats();
        const users = await services.users.getAllUsers();
        const agents = await services.users.getAssignableUsers();

        const ticketActivity = await services.tickets.getRecentActivity(5);
        const recentUsers = await services.users.getRecentUsers(5);
        const userActivity = (recentUsers || []).map((user) => ({
          id: `user-registered-${user.id}`,
          type: "user_registered",
          description: `New user registered: ${user.name || user.email}`,
          details: `Role: ${user.role || "user"}`,
          user: "System",
          timestamp: user.created_at,
          icon: "user",
        }));

        const toIST = (timestamp: string) => {
          let date = new Date(timestamp);
          if (!timestamp.includes("Z") && !timestamp.includes("+")) {
            date = new Date(timestamp + "Z"); 
          }

          return new Date(
            date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
          ).getTime();
        };

        const recentActivity = [...(ticketActivity || []), ...userActivity]
          .sort((a, b) => toIST(b.timestamp) - toIST(a.timestamp))
          .slice(0, 15);
        return {
          ...baseData,
          tickets: allTickets.tickets,
          allTickets: allTickets.tickets,
          stats,
          users: users || [],
          agents: agents || [],
          recentActivity,
        };
      }

      case "agent": {
        const assignedTickets = await services.tickets.getTickets({
          assigned_to: user.id,
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 20,
        });

        const allTickets = await services.tickets.getTickets({
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 50,
        });

        const stats = await services.tickets.getTicketStats();

        const myAssignedCount = assignedTickets.tickets.length;
        const myResolvedCount = assignedTickets.tickets.filter(
          (t) => t.status === "resolved" || t.status === "closed"
        ).length;

        const myStats = {
          assigned: myAssignedCount,
          resolved: myResolvedCount,
          avgResponseTime: "2.5 hours",
        };

        return {
          ...baseData,
          tickets: assignedTickets.tickets,
          assignedTickets: assignedTickets.tickets,
          allTickets: allTickets.tickets,
          stats,
          myStats,
        };
      }

      case "user":
      default: {
        const userTickets = await services.tickets.getTickets({
          created_by: user.id,
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 10,
        });

        const allUserTickets = await services.tickets.getTickets({
          created_by: user.id,
        });

        const stats = {
          total: allUserTickets.tickets.length,
          open: allUserTickets.tickets.filter((t) => t.status === "open")
            .length,
          in_progress: allUserTickets.tickets.filter(
            (t) => t.status === "in_progress"
          ).length,
          resolved: allUserTickets.tickets.filter(
            (t) => t.status === "resolved"
          ).length,
          reopened: allUserTickets.tickets.filter(
            (t) => t.status === "reopened"
          ).length,
          closed: allUserTickets.tickets.filter((t) => t.status === "closed")
            .length,
        };

        return {
          ...baseData,
          tickets: userTickets.tickets,
          stats,
        };
      }
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error loading unified dashboard:", error);
    return {
      role: "user",
      tickets: [],
      stats: {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        reopened: 0,
        closed: 0,
      },
      error: "Failed to load dashboard data",
    };
  }
}

export const meta = ({ data }: { data: UnifiedDashboardLoaderData }) => {
  const roleTitle = {
    admin: "Admin Dashboard",
    agent: "Agent Dashboard",
    user: "My Dashboard",
  };

  return [
    { title: `Larch HelpDesk` },
    {
      name: "description",
      content: `${data?.role || "user"} dashboard for the support system`,
    },
  ];
};

function StatsCard({
  title,
  value,
  icon: Icon,
  color = "text-foreground",
  trend,
  subtitle,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow rounded-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-6 w-6 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {/* {trend && (
          <p
            className={`text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"} flex items-center mt-1`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend.isPositive ? "+" : ""}
            {trend.value}% from last month
          </p>
        )} */}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TicketQueue({
  tickets,
  title,
  showSearch = false,
}: {
  tickets: TicketType[];
  title: string;
  showSearch?: boolean;
}) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="mb-6">{title}</CardTitle>
          {showSearch && (
            <div className="flex items-center space-x-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.slice(0, 5).map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{ticket.title}</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    #{ticket.id.slice(-8)} •{" "}
                    {new Date(ticket.created_at).toLocaleDateString()} • Created
                    By:{" "}
                    <span className="text-red-700 font-bold">
                      {ticket.created_by_profile?.name || "Unknown"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
            {filteredTickets.length > 5 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/tickets")}
              >
                View All Tickets ({filteredTickets.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </div>
  );
}

function AdminQuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={() => navigate("/admin/users")}
          className="w-full justify-start"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Manage Users
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/settings")}
          className="w-full justify-start"
        >
          <Settings className="mr-2 h-4 w-4" />
          System Settings
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/reports")}
          className="w-full justify-start"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          View Reports
        </Button>
      </CardContent>
    </Card>
  );
}

function UserQuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={() => navigate("/newtickets")}
          className="w-full justify-start p-10"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Ticket
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/tickets")}
          className="w-full justify-start p-10"
        >
          <Ticket className="mr-2 h-4 w-4 " />
          View All Tickets
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ activities }: { activities: any[] }) {
  const navigate = useNavigate();

  const getActivityIcon = (iconType: string) => {
    const iconClasses = "h-5 w-5";
    switch (iconType) {
      case "ticket":
        return (
          <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20">
            <Ticket
              className={`${iconClasses} text-primary dark:text-primary`}
            />
          </div>
        );
      case "message":
        return (
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <MessageSquare
              className={`${iconClasses} text-green-600 dark:text-green-400`}
            />
          </div>
        );
      case "edit":
        return (
          <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
            <Edit
              className={`${iconClasses} text-orange-600 dark:text-orange-400`}
            />
          </div>
        );
      case "user":
        return (
          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
            <UserPlus
              className={`${iconClasses} text-purple-600 dark:text-purple-400`}
            />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-900/30">
            <Clock
              className={`${iconClasses} text-gray-600 dark:text-gray-400`}
            />
          </div>
        );
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case "ticket_created":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
            New Ticket
          </span>
        );
      case "comment_added":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Comment
          </span>
        );
      case "ticket_updated":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            Updated
          </span>
        );
      case "user_registered":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            New User
          </span>
        );
      default:
        return null;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    let date = new Date(timestamp);

    // If timestamp has no timezone, assume UTC explicitly
    if (!timestamp.includes("Z") && !timestamp.includes("+")) {
      date = new Date(timestamp + "Z");
    }

    const toIST = (d: Date) =>
      new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const activityIST = toIST(date);
    const nowIST = toIST(new Date());

    const diffInSeconds = Math.floor(
      (nowIST.getTime() - activityIST.getTime()) / 1000
    );

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return activityIST.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };


  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">Last 24 hours</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {activities && activities.length > 0 ? (
          <div className="divide-y">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`p-4 transition-all duration-200 ${
                  activity.ticketId ? "cursor-pointer hover:bg-accent/50" : ""
                }`}
                onClick={() => {
                  if (activity.ticketId) {
                    navigate(`/tickets/${activity.ticketId}`);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.icon)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {activity.description}
                        </p>
                      </div>
                      {getActivityBadge(activity.type)}
                    </div>

                    {activity.details && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {activity.details}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="font-medium">{activity.user}</span>
                      </div>
                      <span>•</span>
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                      {activity.ticketId && (
                        <>
                          <span>•</span>
                          <span className="text-primary hover:underline">
                            View ticket →
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              No recent activity
            </p>
            <p className="text-xs text-muted-foreground">
              Activity will appear here as it happens
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function UnifiedDashboard({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();

  if (!loaderData) {
    return <DashboardSkeleton />;
  }

  const {
    role,
    tickets,
    assignedTickets,
    allTickets,
    stats,
    myStats,
    users,
    agents,
    recentActivity,
    error,
  } = loaderData as UnifiedDashboardLoaderData;

  const navigate = useNavigate();
  const isLoading = navigation.state === "loading";

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Dashboard
              </h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const getDashboardTitle = () => {
    switch (role) {
      case "admin":
        return "Admin Dashboard";
      case "agent":
        return "Agent Dashboard";
      default:
        return "My Dashboard";
    }
  };

  const getStatsCards = () => {
    const baseStats = [
      {
        key: "total",
        label: "Total Tickets",
        icon: Ticket,
        color: "text-foreground",
      },
      {
        key: "open",
        label: "Open",
        icon: AlertTriangle,
        color: "text-red-600",
      },
      {
        key: "in_progress",
        label: "In Progress",
        icon: Clock,
        color: "text-yellow-600",
      },
      {
        key: "resolved",
        label: "Resolved",
        icon: CheckCircle,
        color: "text-purple-600",
      },
      {
        key: "closed",
        label: "Closed",
        icon: CheckCircle,
        color: "text-gray-600",
      },
    ];

    const statsToShow = baseStats;

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsToShow.map((stat) => (
          <StatsCard
            key={stat.key}
            title={stat.label}
            value={stats[stat.key as keyof TicketStats] || 0}
            icon={stat.icon}
            color={stat.color}
            trend={
              role === "admin" ? { value: 12, isPositive: true } : undefined
            }
          />
        ))}
        {role === "agent" && myStats && (
          <StatsCard
            title="My Performance"
            value={myStats.resolved}
            icon={TrendingUp}
            color="text-primary"
            subtitle={`${myStats.assigned} assigned • ${myStats.avgResponseTime} avg response`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="p-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {getDashboardTitle()}
            </h1>
            <p className="text-muted-foreground">
              {role === "admin" && "System overview and management"}
              {role === "agent" && "Manage and track your assigned tickets"}
              {role === "user" && "Track your support requests"}
            </p>
          </div>
          {role !== "admin" && (
            <Button
              onClick={() => navigate("/newtickets")}
              size="lg"
              className="shadow-lg hover:shadow-xl transition-shadow"
            >
              Create New Ticket
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        {getStatsCards()}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Agent Tabs */}
            {role === "agent" && assignedTickets && allTickets && (
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <Tabs defaultValue="assigned" className="w-full">
                  <CardHeader className="pb-3">
                    <TabsList className="grid w-full grid-cols-2 h-11">
                      <TabsTrigger
                        value="assigned"
                        className="text-sm font-medium"
                      >
                        <Ticket className="mr-2 h-4 w-4" />
                        My Tickets ({assignedTickets.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="queue"
                        className="text-sm font-medium"
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Queue ({allTickets.length})
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <TabsContent value="assigned" className="mt-0">
                      <TicketQueue
                        tickets={assignedTickets}
                        title="My Assigned Tickets"
                      />
                    </TabsContent>
                    <TabsContent value="queue" className="mt-0">
                      <TicketQueue
                        tickets={allTickets}
                        title="All Tickets"
                        showSearch
                      />
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            )}

            {/* Admin/User Ticket List */}
            {role !== "agent" && (
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <TicketQueue
                  tickets={tickets}
                  title={
                    role === "admin" ? "Recent Tickets" : "My Recent Tickets"
                  }
                  showSearch={role === "admin"}
                />
              </Card>
            )}

            {/* Recent Activity for Admin - Mobile */}
            {role === "admin" && recentActivity && (
              <div className="lg:hidden">
                <RecentActivity activities={recentActivity} />
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Actions */}
            {role === "admin" && <AdminQuickActions />}
            {role === "user" && <UserQuickActions />}

            {/* System Overview for Admins */}
            {role === "admin" && users && agents && (
              <Card className="shadow-md hover:shadow-lg transition-shadow border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    System Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20">
                          <UserPlus className="h-4 w-4 text-primary dark:text-primary" />
                        </div>
                        <span className="text-sm font-medium">Total Users</span>
                      </div>
                      <span className="text-lg font-bold">{users.length}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium">
                          Active Agents
                        </span>
                      </div>
                      <span className="text-lg font-bold">{agents.length}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                          <Ticket className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm font-medium">
                          Total Tickets
                        </span>
                      </div>
                      <span className="text-lg font-bold">{stats.total}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        System Status
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          Operational
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Agent Performance Card */}
            {role === "agent" && myStats && (
              <Card className="shadow-md hover:shadow-lg transition-shadow border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    My Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Resolved</span>
                    <span className="text-lg font-bold text-green-600">
                      {myStats.resolved}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Assigned</span>
                    <span className="text-lg font-bold text-primary">
                      {myStats.assigned}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Avg Response</span>
                    <span className="text-lg font-bold text-purple-600">
                      {myStats.avgResponseTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <div>
          {/* Recent Activity for Admin - Desktop */}
          {role === "admin" && recentActivity && (
            <div className="hidden lg:block">
              <RecentActivity activities={recentActivity} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ErrorDashboardSkeleton({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">
            Error Loading Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 w-full"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
