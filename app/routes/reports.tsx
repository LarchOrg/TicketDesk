import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { redirect } from "react-router";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { createSupabaseServerClient } from "../lib/supabase-server";
import type { Profile, TicketStats } from "../lib/types";
import { createServices } from "../services";
import type { Route } from "./+types/reports";

interface ReportsLoaderData {
  stats: TicketStats;
  agentPerformance: {
    agent: Profile;
    assigned: number;
    resolved: number;
    avgResponseTime: number;
  }[];
  monthlyTrends: {
    month: string;
    created: number;
    resolved: number;
  }[];
  priorityBreakdown: {
    priority: string;
    count: number;
    percentage: number;
  }[];
  error?: string;
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<ReportsLoaderData> {
  try {
    const { supabase, response } = createSupabaseServerClient(request);

    // Use getUser() instead of getSession() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login", {
        headers: response.headers,
      });
    }

    // Check if user has permission to view reports
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["agent", "admin"].includes(profile.role)) {
      throw redirect("/dashboard");
    }

    const services = createServices(supabase);

    // Get overall stats
    const stats = await services.tickets.getTicketStats();

    // Get all tickets for analysis
    const allTickets = await services.tickets.getTickets({ limit: 1000 });
    const tickets = allTickets.tickets;

    // Get agents for performance analysis
    const agents = await services.users.getAssignableUsers();

    // Calculate agent performance
    const agentPerformance =
      agents?.map((agent) => {
        const assignedTickets = tickets.filter(
          (t) => t.assigned_to === agent.id
        );
        const resolvedTickets = assignedTickets.filter(
          (t) => t.status === "resolved" || t.status === "closed"
        );

        return {
          agent,
          assigned: assignedTickets.length,
          resolved: resolvedTickets.length,
          avgResponseTime: Math.random() * 24, // Mock data - would calculate from actual response times
        };
      }) || [];

    // Calculate monthly trends (mock data for demo)
    const monthlyTrends = [
      { month: "Jan", created: 45, resolved: 42 },
      { month: "Feb", created: 52, resolved: 48 },
      { month: "Mar", created: 38, resolved: 41 },
      { month: "Apr", created: 61, resolved: 58 },
      { month: "May", created: 55, resolved: 52 },
      { month: "Jun", created: 67, resolved: 63 },
    ];

    // Calculate priority breakdown
    const priorityBreakdown = [
      {
        priority: "Low",
        count: tickets.filter((t) => t.priority === "low").length,
        percentage: 0,
      },
      {
        priority: "Medium",
        count: tickets.filter((t) => t.priority === "medium").length,
        percentage: 0,
      },
      {
        priority: "High",
        count: tickets.filter((t) => t.priority === "high").length,
        percentage: 0,
      },
      {
        priority: "Critical",
        count: tickets.filter((t) => t.priority === "critical").length,
        percentage: 0,
      },
    ].map((item) => ({
      ...item,
      percentage:
        tickets.length > 0
          ? Math.round((item.count / tickets.length) * 100)
          : 0,
    }));

    return {
      stats,
      agentPerformance,
      monthlyTrends,
      priorityBreakdown,
    };
  } catch (error) {
    // If it's a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error loading reports:", error);
    return {
      stats: {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        reopened: 0,
        closed: 0,
      },
      agentPerformance: [],
      monthlyTrends: [],
      priorityBreakdown: [],
      error: "Failed to load reports data",
    };
  }
}

export const meta = () => {
  return [
    { title: "Larch HelpDesk" },
    {
      name: "description",
      content: "View ticket statistics and performance metrics",
    },
  ];
};

function StatsCard({
  title,
  value,
  icon: Icon,
  color = "text-foreground",
  trend,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
  trend?: { value: number; isPositive: boolean };
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
      </CardContent>
    </Card>
  );
}

function OverviewTab({
  stats,
  priorityBreakdown,
}: {
  stats: TicketStats;
  priorityBreakdown: any[];
}) {
  const resolutionRate =
    stats.total > 0
      ? Math.round(((stats.resolved + stats.closed) / stats.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tickets"
          value={stats.total}
          icon={Ticket}
          color="text-primary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Resolution Rate"
          value={`${resolutionRate}%`}
          icon={CheckCircle}
          color="text-green-600"
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Open Tickets"
          value={stats.open}
          icon={AlertTriangle}
          color="text-red-600"
          trend={{ value: -8, isPositive: false }}
        />
        <StatsCard
          title="Avg Response Time"
          value="2.5h"
          icon={Clock}
          color="text-yellow-600"
          trend={{ value: -15, isPositive: false }}
        />
      </div>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {priorityBreakdown.map((item) => (
              <div
                key={item.priority}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      item.priority === "Critical"
                        ? "bg-red-500"
                        : item.priority === "High"
                          ? "bg-orange-500"
                          : item.priority === "Medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                    }`}
                  />
                  <span>{item.priority}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {item.count} tickets
                  </span>
                  <span className="font-medium">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.open}
              </div>
              <div className="text-sm text-muted-foreground">Open</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.in_progress}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.resolved}
              </div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.reopened}
              </div>
              <div className="text-sm text-muted-foreground">Reopened</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.closed}
              </div>
              <div className="text-sm text-muted-foreground">Closed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentPerformanceTab({
  agentPerformance,
}: {
  agentPerformance: any[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agentPerformance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No agent data available
            </p>
          ) : (
            agentPerformance.map((agent) => (
              <div
                key={agent.agent.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{agent.agent.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {agent.agent.email}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold">{agent.assigned}</div>
                    <div className="text-xs text-muted-foreground">
                      Assigned
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {agent.resolved}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Resolved
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {agent.avgResponseTime.toFixed(1)}h
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg Response
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendsTab({ monthlyTrends }: { monthlyTrends: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {monthlyTrends.map((month) => (
            <div
              key={month.month}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div className="font-medium">{month.month}</div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-sm font-medium">{month.created}</div>
                  <div className="text-xs text-muted-foreground">Created</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-green-600">
                    {month.resolved}
                  </div>
                  <div className="text-xs text-muted-foreground">Resolved</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {month.created > 0
                      ? Math.round((month.resolved / month.created) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-muted-foreground">Rate</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports({ loaderData }: Route.ComponentProps) {
  const { stats, agentPerformance, monthlyTrends, priorityBreakdown, error } =
    loaderData;
  const [dateRange, setDateRange] = useState("30d");

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Reports</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Ticket statistics and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab stats={stats} priorityBreakdown={priorityBreakdown} />
        </TabsContent>

        <TabsContent value="agents">
          <AgentPerformanceTab agentPerformance={agentPerformance} />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsTab monthlyTrends={monthlyTrends} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
