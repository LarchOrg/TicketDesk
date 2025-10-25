import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React, { useState } from "react";
import { useLoaderData } from "react-router";
import AnimatedGauge from "~/components/Reports/AnimatedGauge";
import BarChart from "~/components/Reports/BarChart";
import PieChart from "~/components/Reports/PieChart";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { createSupabaseServerClient } from "~/lib/supabase-server";

// Types
interface TicketAnalytics {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  inProgressTickets: number;
  avgResolutionTime: number;
  ticketsByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  ticketsByStatus: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  monthlyTrends: MonthlyTrend[];
  agentPerformance: AgentPerformance[];
  recentActivity: ActivityItem[];
}

interface MonthlyTrend {
  month: string;
  year: number;
  created: number;
  resolved: number;
  avgResolutionTime: number;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  assignedTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  resolutionRate: number;
}

interface ActivityItem {
  id: string;
  type: "created" | "resolved" | "updated";
  ticketId: string;
  ticketTitle: string;
  agentName?: string;
  createdAt: string;
}

// Loader function
export async function loader({ request }: { request: Request }) {
  const { supabase } = createSupabaseServerClient(request);

  try {
    // Get user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Response("Unauthorized", { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      throw new Response("Profile not found", { status: 404 });
    }

    // Get URL parameters for filtering
    const url = new URL(request.url);
    const timeRange = url.searchParams.get("timeRange") || "6months";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "1month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3months":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 6);
    }

    // Fetch analytics data
    const [
      ticketsData,
      monthlyTrendsData,
      agentPerformanceData,
      recentActivityData,
    ] = await Promise.all([
      // Basic ticket statistics
      supabase
        .from("tickets")
        .select("id, status, priority, created_at, updated_at")
        .gte("created_at", startDate.toISOString()),

      // Monthly trends data
      supabase
        .from("tickets")
        .select("id, status, created_at, updated_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true }),

      // Agent performance data
      supabase
        .from("tickets")
        .select(
          `
          id,
          status,
          created_at,
          updated_at,
          assigned_to,
          assigned_profile:profiles!tickets_assigned_to_fkey(id, name)
        `
        )
        .gte("created_at", startDate.toISOString())
        .not("assigned_to", "is", null),

      // Recent activity
      supabase
        .from("tickets")
        .select(
          `
          id,
          title,
          status,
          created_at,
          updated_at,
          created_profile:profiles!tickets_created_by_fkey(name),
          assigned_profile:profiles!tickets_assigned_to_fkey(name)
        `
        )
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

    // Process the data
    const analytics = processAnalyticsData(
      ticketsData.data || [],
      monthlyTrendsData.data || [],
      agentPerformanceData.data || [],
      recentActivityData.data || []
    );

    return {
      analytics,
      timeRange,
      user,
      profile,
    };
  } catch (error) {
    console.error("Analytics loader error:", error);
    throw new Response("Failed to load analytics", { status: 500 });
  }
}

// Data processing function
function processAnalyticsData(
  tickets: any[],
  monthlyData: any[],
  agentData: any[],
  activityData: any[]
): TicketAnalytics {
  // Basic statistics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "open").length;
  const closedTickets = tickets.filter((t) => t.status === "closed").length;
  const inProgressTickets = tickets.filter(
    (t) => t.status === "in_progress"
  ).length;

  // Priority breakdown
  const ticketsByPriority = {
    low: tickets.filter((t) => t.priority === "low").length,
    medium: tickets.filter((t) => t.priority === "medium").length,
    high: tickets.filter((t) => t.priority === "high").length,
    urgent: tickets.filter((t) => t.priority === "urgent").length,
  };

  // Status breakdown
  const ticketsByStatus = {
    open: openTickets,
    in_progress: inProgressTickets,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: closedTickets,
  };

  // Calculate average resolution time
  const resolvedTickets = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  );
  const avgResolutionTime =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((acc, ticket) => {
          const created = new Date(ticket.created_at);
          const updated = new Date(ticket.updated_at);
          return acc + (updated.getTime() - created.getTime());
        }, 0) /
        resolvedTickets.length /
        (1000 * 60 * 60 * 24) // Convert to days
      : 0;

  // Process monthly trends
  const monthlyTrends = processMonthlyTrends(monthlyData);

  // Process agent performance
  const agentPerformance = processAgentPerformance(agentData);

  // Process recent activity
  const recentActivity = processRecentActivity(activityData);

  return {
    totalTickets,
    openTickets,
    closedTickets,
    inProgressTickets,
    avgResolutionTime,
    ticketsByPriority,
    ticketsByStatus,
    monthlyTrends,
    agentPerformance,
    recentActivity,
  };
}

function processMonthlyTrends(data: any[]): MonthlyTrend[] {
  const monthlyMap = new Map<string, MonthlyTrend>();

  data.forEach((ticket) => {
    const date = new Date(ticket.created_at);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthName = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthName,
        year,
        created: 0,
        resolved: 0,
        avgResolutionTime: 0,
      });
    }

    const trend = monthlyMap.get(monthKey)!;
    trend.created++;

    if (ticket.status === "resolved" || ticket.status === "closed") {
      trend.resolved++;
      const resolutionTime =
        (new Date(ticket.updated_at).getTime() -
          new Date(ticket.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      trend.avgResolutionTime =
        (trend.avgResolutionTime * (trend.resolved - 1) + resolutionTime) /
        trend.resolved;
    }
  });

  return Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (
      new Date(`${a.month} 1, ${a.year}`).getMonth() -
      new Date(`${b.month} 1, ${b.year}`).getMonth()
    );
  });
}

function processAgentPerformance(data: any[]): AgentPerformance[] {
  const agentMap = new Map<string, AgentPerformance>();

  data.forEach((ticket) => {
    if (!ticket.assigned_profile) return;

    const agentId = ticket.assigned_to;
    const agentName = ticket.assigned_profile.name;

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, {
        agentId,
        agentName,
        assignedTickets: 0,
        resolvedTickets: 0,
        avgResolutionTime: 0,
        resolutionRate: 0,
      });
    }

    const agent = agentMap.get(agentId)!;
    agent.assignedTickets++;

    if (ticket.status === "resolved" || ticket.status === "closed") {
      agent.resolvedTickets++;
      const resolutionTime =
        (new Date(ticket.updated_at).getTime() -
          new Date(ticket.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      agent.avgResolutionTime =
        (agent.avgResolutionTime * (agent.resolvedTickets - 1) +
          resolutionTime) /
        agent.resolvedTickets;
    }
  });

  // Calculate resolution rates
  agentMap.forEach((agent) => {
    agent.resolutionRate =
      agent.assignedTickets > 0
        ? (agent.resolvedTickets / agent.assignedTickets) * 100
        : 0;
  });

  return Array.from(agentMap.values()).sort(
    (a, b) => b.resolutionRate - a.resolutionRate
  );
}

function processRecentActivity(data: any[]): ActivityItem[] {
  return data.map((ticket) => ({
    id: ticket.id,
    type: determineActivityType(ticket),
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    agentName: ticket.assigned_profile?.name || ticket.created_profile?.name,
    createdAt: ticket.updated_at,
  }));
}

function determineActivityType(
  ticket: any
): "created" | "resolved" | "updated" {
  const created = new Date(ticket.created_at);
  const updated = new Date(ticket.updated_at);
  const timeDiff = updated.getTime() - created.getTime();

  if (timeDiff < 60000) return "created"; // Less than 1 minute
  if (ticket.status === "resolved" || ticket.status === "closed")
    return "resolved";
  return "updated";
}

// Meta function
export function meta() {
  return [
    { title: "Analytics - HelpDesk" },
    {
      name: "description",
      content: "View detailed analytics and reports for your helpdesk tickets",
    },
  ];
}

// Components
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {changeType === "increase" ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={
                changeType === "increase" ? "text-green-500" : "text-red-500"
              }
            >
              {Math.abs(change)}%
            </span>
            <span>from last period</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyTrendsChart({ trends }: { trends: MonthlyTrend[] }) {
  // Prepare data for BarChart
  const barData = trends.map((trend) => ({
    month: `${trend.month} ${trend.year}`,
    created: trend.created,
    resolved: trend.resolved,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Monthly Trends
        </CardTitle>
        <CardDescription>
          Ticket creation and resolution trends over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px] overflow-hidden">
          <BarChart
            data={barData}
            keys={["created", "resolved"]}
            indexBy="month"
            axisBottomLabel="Months"
            axisLeftLabel="Tickets"
            colors={["#006868", "#10b981"]}
            rotateLabels={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityDistribution({ priorities }: { priorities: any }) {
  // Prepare data for PieChart
  const pieData = Object.entries(priorities).map(
    ([priority, count]: [string, any]) => ({
      id: priority,
      label: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: count,
    })
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Priority Distribution</CardTitle>
        <CardDescription>
          Breakdown of tickets by priority level
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <div className="w-full max-w-[400px]">
          <PieChart data={pieData} />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "created":
        return <AlertCircle className="h-4 w-4 text-primary" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case "created":
        return `New ticket created: ${activity.ticketTitle}`;
      case "resolved":
        return `Ticket resolved: ${activity.ticketTitle}`;
      default:
        return `Ticket updated: ${activity.ticketTitle}`;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest ticket activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 10).map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
            >
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getActivityText(activity)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {activity.agentName && <span>by {activity.agentName}</span>}
                  <span>•</span>
                  <span>
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main component
export default function AnalyticsPage() {
  const { analytics, timeRange } = useLoaderData<typeof loader>();
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTimeRangeChange = (newTimeRange: string) => {
    setSelectedTimeRange(newTimeRange);
    // Navigate to the same route with new time range parameter
    window.location.href = `/analytics?timeRange=${newTimeRange}`;
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Reload the current page to fetch fresh data
    window.location.reload();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your helpdesk performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeRange}
            onValueChange={handleTimeRangeChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tickets"
          value={analytics.totalTickets}
          icon={BarChart3}
          description="All tickets in selected period"
        />
        <StatCard
          title="Open Tickets"
          value={analytics.openTickets}
          icon={AlertCircle}
          description="Currently open tickets"
        />
        <StatCard
          title="Resolution Rate"
          value={`${analytics.totalTickets > 0 ? Math.round((analytics.closedTickets / analytics.totalTickets) * 100) : 0}%`}
          icon={CheckCircle}
          description="Percentage of tickets closed"
        />
        <StatCard
          title="Avg Resolution Time"
          value={`${analytics.avgResolutionTime.toFixed(1)}d`}
          icon={Clock}
          description="Average time to resolve tickets"
        />
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2  gap-6">
        <MonthlyTrendsChart trends={analytics.monthlyTrends} />{" "}
        <PriorityDistribution priorities={analytics.ticketsByPriority} />
      </div>

      {/* Additional Analytics Charts */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Tickets by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[250px] overflow-hidden">
              <BarChart
                data={[
                  {
                    status: "Open",
                    count: analytics.ticketsByStatus.open,
                  },
                  {
                    status: "In Progress",
                    count: analytics.ticketsByStatus.in_progress,
                  },
                  {
                    status: "Resolved",
                    count: analytics.ticketsByStatus.resolved,
                  },
                  {
                    status: "Closed",
                    count: analytics.ticketsByStatus.closed,
                  },
                ]}
                keys={["count"]}
                indexBy="status"
                colors={["#006868"]}
                axisBottomLabel="Status"
                axisLeftLabel="Count"
              />
            </div>
          </CardContent>
        </Card>
      </div> */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolution Rate Gauge */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Resolution Rate</CardTitle>
            <CardDescription>Percentage of resolved tickets</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-8">
            <AnimatedGauge
              value={
                analytics.totalTickets > 0
                  ? (analytics.closedTickets / analytics.totalTickets) * 100
                  : 0
              }
              max={100}
              label="Resolution %"
            />
          </CardContent>
        </Card>

        {/* Average Resolution Time Gauge */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Avg Resolution Time</CardTitle>
            <CardDescription>Days to resolve tickets</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-8">
            <AnimatedGauge
              value={analytics.avgResolutionTime}
              label="Days"
              max={30}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6">
        <RecentActivityFeed activities={analytics.recentActivity} />
      </div>
    </div>
  );
}
