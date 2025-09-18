import { Grid, List, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import TicketCard from "~/components/TicketCard";
import TicketTable from "~/components/TicketTable";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Ticket, TicketStats } from "~/lib/types";
import type { Route } from "./+types/tickets";

export async function loader({ request }: Route.LoaderArgs) {
  console.log("🔍 Tickets loader starting...");

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "";
  const priorityFilter = url.searchParams.get("priority") || "";
  const searchFilter = url.searchParams.get("search") || "";

  try {
    // Create server-side Supabase client with cookie handling
    const { supabase, response } = createSupabaseServerClient(request);

    // Check authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("❌ Session error in loader:", sessionError);
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

    // Build query for tickets
    let ticketsQuery = supabase
      .from("tickets")
      .select(
        `
        *,
        created_by_profile:profiles!tickets_created_by_fkey(name, email),
        assigned_to_profile:profiles!tickets_assigned_to_fkey(name, email)
      `
      )
      .order("created_at", { ascending: false });

    // Build query for stats (all tickets for counting)
    let statsQuery = supabase.from("tickets").select("status");

    // Apply filters
    if (statusFilter) {
      ticketsQuery = ticketsQuery.eq("status", statusFilter);
    }

    if (priorityFilter) {
      ticketsQuery = ticketsQuery.eq("priority", priorityFilter);
    }

    if (searchFilter) {
      ticketsQuery = ticketsQuery.or(
        `title.ilike.%${searchFilter}%,description.ilike.%${searchFilter}%`
      );
      // Also apply search filter to stats query
      statsQuery = statsQuery.or(
        `title.ilike.%${searchFilter}%,description.ilike.%${searchFilter}%`
      );
    }

    const { data: ticketsData, error: ticketsError } = await ticketsQuery;
    const { data: statsData, error: statsError } = await statsQuery;

    if (ticketsError || statsError) {
      return Response.json({
        tickets: [],
        stats: {
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          reopened: 0,
          closed: 0,
        },
        filters: {
          status: statusFilter,
          priority: priorityFilter,
          search: searchFilter,
        },
        error:
          ticketsError?.message ||
          statsError?.message ||
          "Failed to fetch tickets",
      });
    }

    console.log("📊 Query Results:", {
      ticketsCount: ticketsData?.length,
      statsCount: statsData?.length,
      ticketsError,
      statsError,
    });

    if (ticketsError || statsError) {
      console.error("❌ Query errors:", { ticketsError, statsError });
      return Response.json({
        tickets: [],
        stats: {
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          reopened: 0,
          closed: 0,
        },
        filters: {
          status: statusFilter,
          priority: priorityFilter,
          search: searchFilter,
        },
        error:
          (ticketsError as any)?.message ||
          (statsError as any)?.message ||
          "Failed to fetch tickets",
      });
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

    // Calculate stats from all tickets (not filtered)
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

    console.log("✅ Tickets data loaded:", {
      ticketCount: tickets.length,
      stats,
    });

    return Response.json(
      {
        tickets,
        stats,
        filters: {
          status: statusFilter,
          priority: priorityFilter,
          search: searchFilter,
        },
      },
      { headers: response.headers }
    );
  } catch (error) {
    console.error("❌ Tickets loader exception:", error);

    // If it's already a Response (like redirect), re-throw it
    if (error instanceof Response) {
      throw error;
    }

    return Response.json({
      tickets: [],
      stats: {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        reopened: 0,
        closed: 0,
      },
      filters: {
        status: statusFilter,
        priority: priorityFilter,
        search: searchFilter,
      },
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

export default function TicketsPage({ loaderData }: Route.ComponentProps) {
  const { tickets, stats, filters } = loaderData as any;
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleCreateTicket = () => {
    navigate("/newtickets");
  };

  const handleViewTicket = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  const handleEditTicket = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (confirm("Are you sure you want to delete this ticket?")) {
      // TODO: Implement delete functionality
      console.log("Delete ticket:", ticketId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Tickets</h1>
            <p className="text-muted-foreground">
              Manage and track all support tickets
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleCreateTicket}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              <span>New Ticket</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
          <div className="bg-card text-card-foreground p-6 rounded-lg border">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Tickets</p>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <p className="text-sm text-muted-foreground">Open</p>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-lg border">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.in_progress}
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">
              {stats.resolved}
            </div>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">
              {stats.reopened}
            </div>
            <p className="text-sm text-muted-foreground">Reopened</p>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">
              {stats.closed}
            </div>
            <p className="text-sm text-muted-foreground">Closed</p>
          </div>
        </div>

        {/* Tickets Display */}
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No tickets found matching your criteria.
            </p>
            <button
              onClick={handleCreateTicket}
              className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg"
            >
              Create your first ticket
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket: Ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleViewTicket(ticket.id)}
              />
            ))}
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            onTicketClick={(ticket: Ticket) => handleViewTicket(ticket.id)}
            onEdit={(ticket: Ticket) => handleEditTicket(ticket.id)}
            onDelete={async (ticket: Ticket) =>
              await handleDeleteTicket(ticket.id)
            }
          />
        )}
      </div>
    </div>
  );
}
