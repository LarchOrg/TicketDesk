import { Plus } from "lucide-react";
import { redirect, useNavigate, useNavigation } from "react-router";
import DashboardStats from "~/components/DashboardStats";
import { DashboardSkeleton } from "~/components/LoadingComponents";
import TicketCard from "~/components/TicketCard";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Ticket, TicketStats } from "~/lib/types";
import { createServices } from "~/services";
import type { Route } from "./+types/dashboard";

interface DashboardLoaderData {
  tickets: Ticket[];
  stats: TicketStats;
  error: string | null;
}

export const meta = () => {
  return [
    { title: "Dashboard - TicketDesk" },
    {
      name: "description",
      content: "View your ticket dashboard and recent activity",
    },
  ];
};

export async function loader({
  request,
}: Route.LoaderArgs): Promise<DashboardLoaderData> {
  const { supabase, response } = createSupabaseServerClient(request);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw redirect("/login", { headers: response.headers });
  }

  const services = createServices(supabase);

  try {
    const [tickets, stats] = await Promise.all([
      services.tickets.getRecentTickets(10),
      services.tickets.getTicketStats(),
    ]);

    return { tickets, stats, error: null };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return {
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

function QuickActionButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </button>
  );
}

// Component: Activity Summary
function ActivitySummary({ stats }: { stats: TicketStats }) {
  const summaryItems = [
    { label: "Open Tickets", value: stats?.open || 0 },
    { label: "In Progress", value: stats?.in_progress || 0 },
    { label: "Closed", value: stats?.closed || 0 },
  ];

  return (
    <div className="bg-card text-card-foreground p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-2">Activity Summary</h3>
      <div className="space-y-2">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex justify-between">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-600">Error loading dashboard: {error}</p>
      <Button
        onClick={() => window.location.reload()}
        variant="outline"
        size="sm"
        className="mt-2"
      >
        Retry
      </Button>
    </div>
  );
}

// Component: Empty State
function EmptyTicketsState({ onCreateTicket }: { onCreateTicket: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground mb-4">No tickets yet</p>
      <Button
        onClick={onCreateTicket}
        className="inline-flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Create your first ticket
      </Button>
    </div>
  );
}

// Component: Recent Tickets Section
function RecentTicketsSection({
  tickets,
  onViewAllTickets,
  onCreateTicket,
  onViewTicket,
}: {
  tickets: Ticket[];
  onViewAllTickets: () => void;
  onCreateTicket: () => void;
  onViewTicket: (ticketId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recent Tickets</h2>
        <button
          onClick={onViewAllTickets}
          className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          View all
        </button>
      </div>

      {!tickets || tickets.length === 0 ? (
        <EmptyTicketsState onCreateTicket={onCreateTicket} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onViewTicket(ticket.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();

  const { tickets, stats, error } = loaderData as DashboardLoaderData;

  // Navigation handlers
  const handleCreateTicket = () => navigate("/newtickets");
  const handleViewAllTickets = () => navigate("/tickets");
  const handleViewTicket = (ticketId: string) =>
    navigate(`/tickets/${ticketId}`);

  // Show loading skeleton during navigation
  if (navigation.state === "loading") {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your tickets.
        </p>
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay error={error} />}

      {/* Stats */}
      <DashboardStats stats={stats} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
          <div className="space-y-3">
            <QuickActionButton
              title="Create New Ticket"
              description="Submit a new support request"
              onClick={handleCreateTicket}
            />
            <QuickActionButton
              title="View All Tickets"
              description="Browse and manage all tickets"
              onClick={handleViewAllTickets}
            />
          </div>
        </div>

        <ActivitySummary stats={stats} />
      </div>

      {/* Recent Tickets */}
      <RecentTicketsSection
        tickets={tickets}
        onViewAllTickets={handleViewAllTickets}
        onCreateTicket={handleCreateTicket}
        onViewTicket={handleViewTicket}
      />
    </div>
  );
}

// Error Dashboard Component (Fixed)
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
