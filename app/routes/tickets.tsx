import { Grid, List, Plus } from "lucide-react";
import { useState } from "react";
import { redirect, useNavigate } from "react-router";
import TicketCard from "~/components/TicketCard";
import TicketTable from "~/components/TicketTable";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Ticket, TicketFilters } from "~/lib/types";
import { createServices } from "~/services";
import type { Route } from "./+types/tickets";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  const filters: TicketFilters = {
    status: url.searchParams.get("status") || undefined,
    priority: url.searchParams.get("priority") || undefined,
    search: url.searchParams.get("search") || undefined,
    sortBy: url.searchParams.get("sortBy") || "created_at",
    sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    limit: parseInt(url.searchParams.get("limit") || "50"),
    offset: parseInt(url.searchParams.get("offset") || "0"),
  };

  try {
    const { supabase, response } = createSupabaseServerClient(request);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error in loader:", sessionError);
      return { error: "Authentication error" };
    }

    if (!session) {
      console.log("No session found, redirecting to login");
      return redirect("/login", { headers: response.headers });
    }

    const services = createServices(supabase);

    const [ticketsResult, stats] = await Promise.all([
      services.tickets.getTickets(filters),
      services.tickets.getTicketStats(),
    ]);

    console.log(`Loaded ${ticketsResult.tickets.length} tickets`);

    return {
      tickets: ticketsResult.tickets,
      stats,
      total: ticketsResult.total,
      filters: {
        status: filters.status || "",
        priority: filters.priority || "",
        search: filters.search || "",
      },
    };
  } catch (error) {
    console.error("Tickets loader error:", error);
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
      total: 0,
      filters: {
        status: filters.status || "",
        priority: filters.priority || "",
        search: filters.search || "",
      },
      error: "Failed to fetch tickets",
    };
  }
}

export default function TicketsPage({ loaderData }: Route.ComponentProps) {
  const { tickets, stats, filters } = loaderData as any;
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleDeleteTicket = async (ticketId: string) => {
    if (confirm("Are you sure you want to delete this ticket?")) {
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
              onClick={() => navigate("/tickets/new")}
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
              onClick={() => navigate("/tickets/new")}
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
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              />
            ))}
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            onTicketClick={(ticket: Ticket) =>
              navigate(`/tickets/${ticket.id}`)
            }
            onEdit={(ticket: Ticket) => navigate(`/tickets/${ticket.id}`)}
            onDelete={async (ticket: Ticket) =>
              await handleDeleteTicket(ticket.id)
            }
          />
        )}
      </div>
    </div>
  );
}
