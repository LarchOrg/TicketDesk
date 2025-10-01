import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Filter,
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
  assignedTickets?: TicketType[]; // For agents
  allTickets?: TicketType[]; // For agents/admins
  stats: TicketStats;
  myStats?: {
    assigned: number;
    resolved: number;
    avgResponseTime: string;
  }; // For agents
  users?: Profile[]; // For admins
  agents?: Profile[]; // For admins
  recentActivity?: any[]; // For admins
  error?: string;
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<UnifiedDashboardLoaderData> {
  try {
    const { supabase } = createSupabaseServerClient(request);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect("/login");
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    const role = (profile?.role as UserRole) || "user";
    const services = createServices(supabase);

    // Base data structure
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
        // Admin gets all tickets and system-wide data
        const allTickets = await services.tickets.getTickets({
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 50,
        });

        const stats = await services.tickets.getTicketStats();
        const users = await services.users.getAllUsers();
        const agents = await services.users.getAssignableUsers();

        // Mock recent activity
        const recentActivity = [
          {
            id: 1,
            type: "ticket_created",
            description: "New ticket created by John Doe",
            timestamp: new Date().toISOString(),
          },
          {
            id: 2,
            type: "user_registered",
            description: "New user registered: Jane Smith",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
        ];

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
        // Agent gets assigned tickets + all tickets for queue
        const assignedTickets = await services.tickets.getTickets({
          assigned_to: session.user.id,
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

        // Calculate agent-specific stats
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
        // User gets only their own tickets
        const userTickets = await services.tickets.getTickets({
          created_by: session.user.id,
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 10,
        });

        const allUserTickets = await services.tickets.getTickets({
          created_by: session.user.id,
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
    { title: `${roleTitle[data?.role || "user"]} - Support Portal` },
    {
      name: "description",
      content: `${data?.role || "user"} dashboard for the support system`,
    },
  ];
};

// Shared Components
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p
            className={`text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"} flex items-center mt-1`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend.isPositive ? "+" : ""}
            {trend.value}% from last month
          </p>
        )}
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {showSearch && (
            <div className="flex items-center space-x-2">
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
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{ticket.title}</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    #{ticket.id} •{" "}
                    {new Date(ticket.created_at).toLocaleDateString()}
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
    </Card>
  );
}

// Role-specific Components
function AdminQuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={() => navigate("/newtickets")}
          className="w-full justify-start"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Ticket
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/my-tickets")}
          className="w-full justify-start"
        >
          <Ticket className="mr-2 h-4 w-4" />
          View My Tickets
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ activities }: { activities: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2" />
              <div className="flex-1">
                <p className="text-sm">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
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

  // Show loading state during navigation
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
        color: "text-green-600",
      },
    ];

    const statsToShow = role === "admin" ? baseStats : baseStats.slice(0, 4);

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            color="text-blue-600"
            subtitle={`${myStats.assigned} assigned • ${myStats.avgResponseTime} avg response`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getDashboardTitle()}</h1>
          <p className="text-muted-foreground">
            {role === "admin" && "System overview and management"}
            {role === "agent" && "Manage and track your assigned tickets"}
            {role === "user" && "Track your support requests"}
          </p>
        </div>
        {role !== "admin" && (
          <Button onClick={() => navigate("/newtickets")}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        )}
      </div>

      {/* Stats */}
      {getStatsCards()}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Tabs */}
          {role === "agent" && assignedTickets && allTickets && (
            <Tabs defaultValue="assigned" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="assigned">
                  My Tickets ({assignedTickets.length})
                </TabsTrigger>
                <TabsTrigger value="queue">
                  Ticket Queue ({allTickets.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="assigned">
                <TicketQueue
                  tickets={assignedTickets}
                  title="My Assigned Tickets"
                />
              </TabsContent>
              <TabsContent value="queue">
                <TicketQueue
                  tickets={allTickets}
                  title="All Tickets"
                  showSearch
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Admin/User Ticket List */}
          {role !== "agent" && (
            <TicketQueue
              tickets={tickets}
              title={role === "admin" ? "Recent Tickets" : "My Recent Tickets"}
              showSearch={role === "admin"}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {role === "admin" && <AdminQuickActions />}
          {role === "user" && <UserQuickActions />}

          {/* Recent Activity for Admins */}
          {role === "admin" && recentActivity && (
            <RecentActivity activities={recentActivity} />
          )}

          {/* System Info for Admins */}
          {role === "admin" && users && agents && (
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Users
                  </span>
                  <span className="font-medium">{users.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Active Agents
                  </span>
                  <span className="font-medium">{agents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    System Status
                  </span>
                  <span className="text-green-600 font-medium">
                    Operational
                  </span>
                </div>
              </CardContent>
            </Card>
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
