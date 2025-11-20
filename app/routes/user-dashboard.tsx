import { AlertCircle, CheckCircle, Clock, Plus, Ticket } from "lucide-react";
import { redirect, useNavigate } from "react-router";
import StatusBadge from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { createSupabaseServerClient } from "../lib/supabase-server";
import type { TicketStats, Ticket as TicketType } from "../lib/types";
import { createServices } from "../services";
import type { Route } from "./+types/user-dashboard";

interface UserDashboardLoaderData {
  tickets: TicketType[];
  stats: TicketStats;
  error?: string;
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<UserDashboardLoaderData> {
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

    const services = createServices(supabase);

    // Get user's tickets only
    const userTickets = await services.tickets.getTickets({
      created_by: user.id,
      sortBy: "created_at",
      sortOrder: "desc",
      limit: 10,
    });

    // Get user's ticket stats
    const allUserTickets = await services.tickets.getTickets({
      created_by: user.id,
    });

    const stats = {
      total: allUserTickets.tickets.length,
      open: allUserTickets.tickets.filter((t) => t.status === "open").length,
      in_progress: allUserTickets.tickets.filter(
        (t) => t.status === "in_progress"
      ).length,
      resolved: allUserTickets.tickets.filter((t) => t.status === "resolved")
        .length,
      reopened: allUserTickets.tickets.filter((t) => t.status === "reopened")
        .length,
      closed: allUserTickets.tickets.filter((t) => t.status === "closed")
        .length,
    };

    return {
      tickets: userTickets.tickets,
      stats,
    };
  } catch (error) {
    // If it's a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error loading user dashboard:", error);
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

export const meta = () => {
  return [
    { title: "Larch HelpDesk" },
    {
      name: "description",
      content: "View your submitted tickets and support requests",
    },
  ];
};

function StatsCard({
  title,
  value,
  icon: Icon,
  color = "text-foreground",
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={() => navigate("/tickets/new")}
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
          View All My Tickets
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentTickets({ tickets }: { tickets: TicketType[] }) {
  const navigate = useNavigate();

  if (tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No tickets submitted yet
            </p>
            <Button onClick={() => navigate("/tickets/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Ticket
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <div className="flex-1">
                <h4 className="font-medium">{ticket.title}</h4>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(ticket.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={ticket.status} />
            </div>
          ))}
        </div>
        {tickets.length >= 10 && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => navigate("/my-tickets")}>
              View All My Tickets
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function UserDashboard({ loaderData }: Route.ComponentProps) {
  const { tickets, stats, error } = loaderData;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Dashboard</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your support tickets.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Tickets"
          value={stats.total}
          icon={Ticket}
          color="text-primary"
        />
        <StatsCard
          title="Open"
          value={stats.open}
          icon={AlertCircle}
          color="text-red-600"
        />
        <StatsCard
          title="In Progress"
          value={stats.in_progress}
          icon={Clock}
          color="text-yellow-600"
        />
        <StatsCard
          title="Resolved"
          value={stats.resolved + stats.closed}
          icon={CheckCircle}
          color="text-green-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <RecentTickets tickets={tickets} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
