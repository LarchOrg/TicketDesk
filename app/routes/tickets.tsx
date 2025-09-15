import { Grid, List, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AuthGuard } from "~/components/AuthGuard";
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

    console.log("✅ Server session found for user:", session.user.id);

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
    }

    // Execute tickets query
    const { data: ticketsData, error: ticketsError } = await ticketsQuery;
    console.log("📋 Tickets Query Result:", {
      data: ticketsData,
      error: ticketsError,
    });

    // Build query for stats
    let statsQuery = supabase.from("tickets").select("status");

    // Apply same filters for stats (except status filter for accurate counts)
    if (priorityFilter) {
      statsQuery = statsQuery.eq("priority", priorityFilter);
    }
    if (searchFilter) {
      statsQuery = statsQuery.or(
        `title.ilike.%${searchFilter}%,description.ilike.%${searchFilter}%`
      );
    }

    const { data: statsData, error: statsError } = await statsQuery;
    console.log("📊 Stats Query Result:", {
      data: statsData,
      error: statsError,
    });

    if (ticketsError || statsError) {
      console.error("❌ Query errors:", { ticketsError, statsError });
      return {
        tickets: [],
        stats: { total: 0, open: 0, in_progress: 0, waiting: 0, closed: 0 },
        filters: {
          status: statusFilter,
          priority: priorityFilter,
          search: searchFilter,
        },
        error: ticketsError?.message || statsError?.message || "Unknown error",
      };
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
          case "waiting":
            acc.waiting++;
            break;
          case "closed":
            acc.closed++;
            break;
        }
        return acc;
      },
      { total: 0, open: 0, in_progress: 0, waiting: 0, closed: 0 }
    );

    console.log("✅ Final Result:", { ticketCount: tickets.length, stats });

    return new Response(
      JSON.stringify({
        tickets,
        stats,
        filters: {
          status: statusFilter,
          priority: priorityFilter,
          search: searchFilter,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(response.headers.entries()),
        },
      }
    );
  } catch (error) {
    console.error("❌ Loader exception:", error);

    // If it's already a Response (like redirect), re-throw it
    if (error instanceof Response) {
      throw error;
    }

    return {
      tickets: [],
      stats: { total: 0, open: 0, in_progress: 0, waiting: 0, closed: 0 },
      filters: {
        status: statusFilter,
        priority: priorityFilter,
        search: searchFilter,
      },
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export default function TicketsPage({ loaderData }: Route.ComponentProps) {
  const { tickets, stats, filters, error } = loaderData;
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleCreateTicket = () => {
    navigate("/tickets/new");
  };

  const handleTicketClick = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  const handleEditTicket = (ticketId: string) => {
    navigate(`/tickets/${ticketId}/edit`);
  };

  const handleDeleteTicket = (ticketId: string) => {
    // TODO: Implement delete functionality
    console.log("Delete ticket:", ticketId);
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Support Tickets
            </h1>
            <p className="text-muted-foreground">
              Manage and track all support requests
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleCreateTicket}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error loading tickets: {error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="text-2xl font-bold text-blue-600">
              {stats.waiting}
            </div>
            <p className="text-sm text-muted-foreground">Waiting</p>
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
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.status || filters.priority || filters.search
                ? "No tickets match your current filters."
                : "Get started by creating your first support ticket."}
            </p>
            <button
              onClick={handleCreateTicket}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Ticket
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket: Ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleTicketClick(ticket.id)}
              />
            ))}
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            onEdit={(ticket: Ticket) => handleEditTicket(ticket.id)}
            onDelete={(ticket: Ticket) => handleDeleteTicket(ticket.id)}
            onTicketClick={(ticket: Ticket) => handleTicketClick(ticket.id)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
