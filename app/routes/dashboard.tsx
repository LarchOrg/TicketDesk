import { useNavigate } from "react-router";
import DashboardStats from "~/components/DashboardStats";
import TicketCard from "~/components/TicketCard";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Ticket, TicketStats } from "~/lib/types";
import type { Route } from "./+types/dashboard";

export async function loader({ request }: Route.LoaderArgs) {
  console.log("🔍 Dashboard loader starting...");

  try {
    // Create server-side Supabase client with cookie handling
    const { supabase, response } = createSupabaseServerClient(request);

    // Check authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("❌ Session error in dashboard loader:", sessionError);
      throw new Response("Authentication error", { status: 401 });
    }

    if (!session) {
      console.log("ℹ️ No session found, redirecting to login");
      throw new Response("Unauthorized", {
        status: 302,
        headers: {
          Location: "/login",
        },
      });
    }

    console.log("✅ Dashboard server session found for user:", session.user.id);

    // Fetch recent tickets (last 10)
    const { data: ticketsData, error: ticketsError } = await supabase
      .from("tickets")
      .select(
        `
        *,
        created_by_profile:profiles!tickets_created_by_fkey(name, email),
        assigned_to_profile:profiles!tickets_assigned_to_fkey(name, email)
      `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch ticket statistics
    const { data: statsData, error: statsError } = await supabase
      .from("tickets")
      .select("status");

    if (ticketsError || statsError) {
      console.error("❌ Dashboard query errors:", { ticketsError, statsError });
      return new Response(
        JSON.stringify({
          tickets: [],
          stats: {
            total: 0,
            open: 0,
            in_progress: 0,
            resolved: 0,
            reopened: 0,
            closed: 0,
          },
          error:
            ticketsError?.message || statsError?.message || "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Transform tickets data
    const tickets: Ticket[] = (ticketsData || []).map((ticket: any) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      created_by: ticket.created_by,
      assigned_to: ticket.assigned_to,
      created_by_profile: ticket.created_by_profile,
      assigned_to_profile: ticket.assigned_to_profile,
    }));

    // Calculate stats
    const stats: TicketStats = (statsData || []).reduce(
      (acc, ticket) => {
        acc.total++;
        switch (ticket.status) {
          case "open":
            acc.open++;
            break;
          case "in_progress":
            acc.in_progress++;
            break;
          case "resolved":
            acc.resolved++;
            break;
          case "reopened":
            acc.reopened++;
            break;
          case "closed":
            acc.closed++;
            break;
        }
        return acc;
      },
      {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        reopened: 0,
        closed: 0,
      }
    );

    console.log("✅ Dashboard data loaded:", {
      ticketCount: tickets.length,
      stats,
    });

    return new Response(
      JSON.stringify({
        tickets,
        stats,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(response.headers.entries()),
        },
      }
    );
  } catch (error: unknown) {
    console.error("❌ Dashboard loader exception:", error);

    if (error instanceof Response) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        tickets: [],
        stats: {
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          reopened: 0,
          closed: 0,
        },
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();

  // Parse the loader data if it's a Response
  const data =
    typeof loaderData === "string" ? JSON.parse(loaderData) : loaderData;
  const { tickets, stats, error } = data;

  const handleCreateTicket = () => {
    navigate("/tickets/new");
  };

  const handleViewAllTickets = () => {
    navigate("/tickets");
  };

  const handleTicketClick = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

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
              <span className="font-medium">{stats.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-medium">{stats.in_progress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closed</span>
              <span className="font-medium">{stats.closed}</span>
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

        {tickets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No tickets yet</p>
            <button
              onClick={handleCreateTicket}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create your first ticket
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(tickets as Ticket[]).map((ticket: Ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleTicketClick(ticket.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
