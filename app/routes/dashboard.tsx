import { Plus } from "lucide-react";
import { redirect, useNavigate, useNavigation } from "react-router";
import DashboardStats from "~/components/DashboardStats";
import { DashboardSkeleton } from "~/components/LoadingComponents";
import TicketCard from "~/components/TicketCard";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Ticket } from "~/lib/types";
import { createServices } from "~/services";
import type { Route } from "./+types/dashboard";

export const meta = () => {
  return [
    { title: "Dashboard - TicketDesk" },
    {
      name: "description",
      content: "View your ticket dashboard and recent activity",
    },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, response } = createSupabaseServerClient(request);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return redirect("/login", { headers: response.headers });
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

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();

  if (loaderData === undefined) {
    return <DashboardSkeleton />;
  }

  const { tickets, stats, error } = loaderData;

  const handleCreateTicket = () => {
    navigate("/newtickets");
  };

  const handleViewAllTickets = () => {
    navigate("/tickets");
  };

  const handleViewTicket = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  if (error) {
    <ErrorDashboardSkeleton error={error} />;
  }

  return navigation.state === "loading" ? (
    <DashboardSkeleton />
  ) : (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your tickets.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error loading dashboard: {error}</p>
        </div>
      )}

      {/* Stats */}
      <DashboardStats stats={stats} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleCreateTicket}
              className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="font-medium">Create New Ticket</div>
              <div className="text-sm text-muted-foreground">
                Submit a new support request
              </div>
            </button>
            <button
              onClick={handleViewAllTickets}
              className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="font-medium">View All Tickets</div>
              <div className="text-sm text-muted-foreground">
                Browse and manage all tickets
              </div>
            </button>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Activity Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open Tickets</span>
              <span className="font-medium">{stats?.open || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-medium">{stats?.in_progress || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closed</span>
              <span className="font-medium">{stats?.closed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Tickets</h2>
          <button
            onClick={handleViewAllTickets}
            className="text-primary hover:underline"
          >
            View all
          </button>
        </div>

        {!tickets || tickets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No tickets yet</p>
            <Button
              onClick={handleCreateTicket}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create your first ticket
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(tickets as Ticket[]).map((ticket: Ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleViewTicket(ticket.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorDashboardSkeleton({ error }: { error: string }) {
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
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
  </div>;
}
