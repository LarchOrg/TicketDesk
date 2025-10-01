import { Grid, List, Plus } from "lucide-react";
import { useState } from "react";
import { redirect, useNavigate, useNavigation } from "react-router";
import {
  DashboardSkeleton,
  TicketListSkeleton,
} from "~/components/LoadingComponents";
import TicketCard from "~/components/TicketCard";
import TicketTable from "~/components/TicketTable";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Ticket, TicketFilters, TicketStats } from "~/lib/types";
import { createServices } from "~/services";
import type { Route } from "./+types/tickets";

// Types
interface TicketsLoaderData {
  tickets: Ticket[];
  stats: TicketStats;
  total: number;
  filters: {
    status: string;
    priority: string;
    search: string;
  };
  error?: string;
}

type ViewMode = "grid" | "list";

// Constants
const DEFAULT_FILTERS: TicketFilters = {
  sortBy: "created_at",
  sortOrder: "desc",
  limit: 50,
  offset: 0,
};

const STATS_CONFIG = [
  { key: "total", label: "Total Tickets", color: "text-foreground" },
  { key: "open", label: "Open", color: "text-red-600" },
  { key: "in_progress", label: "In Progress", color: "text-yellow-600" },
  { key: "resolved", label: "Resolved", color: "text-purple-600" },
  { key: "reopened", label: "Reopened", color: "text-orange-600" },
  { key: "closed", label: "Closed", color: "text-green-600" },
] as const;

// Utility functions
function parseFiltersFromUrl(url: URL): TicketFilters {
  return {
    status: url.searchParams.get("status") || undefined,
    priority: url.searchParams.get("priority") || undefined,
    search: url.searchParams.get("search") || undefined,
    sortBy: url.searchParams.get("sortBy") || DEFAULT_FILTERS.sortBy,
    sortOrder:
      (url.searchParams.get("sortOrder") as "asc" | "desc") ||
      DEFAULT_FILTERS.sortOrder,
    limit: parseInt(
      url.searchParams.get("limit") || String(DEFAULT_FILTERS.limit)
    ),
    offset: parseInt(
      url.searchParams.get("offset") || String(DEFAULT_FILTERS.offset)
    ),
  };
}

function createEmptyStats(): TicketStats {
  return {
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    reopened: 0,
    closed: 0,
  };
}

// Meta function
export const meta = () => {
  return [
    { title: "Ticket Queue - Support Portal" },
    { name: "description", content: "Manage and view all support tickets" },
  ];
};

// Loader function
export async function loader({
  request,
}: Route.LoaderArgs): Promise<TicketsLoaderData> {
  const url = new URL(request.url);
  const filters = parseFiltersFromUrl(url);

  try {
    const { supabase, response } = createSupabaseServerClient(request);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error in tickets loader:", sessionError);
      return {
        tickets: [],
        stats: createEmptyStats(),
        total: 0,
        filters: {
          status: filters.status || "",
          priority: filters.priority || "",
          search: filters.search || "",
        },
        error: "Authentication error",
      };
    }

    if (!session) {
      console.log("No session found, redirecting to login");
      throw redirect("/login", { headers: response.headers });
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

    // If it's a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    return {
      tickets: [],
      stats: createEmptyStats(),
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

// Component: View Mode Toggle
function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center border rounded-lg">
      <button
        onClick={() => onViewModeChange("grid")}
        className={`p-2 transition-colors ${
          viewMode === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Grid view"
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`p-2 transition-colors ${
          viewMode === "list"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

// Component: Page Header
function PageHeader({
  onCreateTicket,
  viewMode,
  onViewModeChange,
}: {
  onCreateTicket: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  if (typeof window !== "undefined") {
    setTimeout(() => {
      const el = document.querySelector(
        "h1.text-3xl.font-bold.text-foreground"
      );
      if (el) {
        el.textContent = "Ticket Queue";
      }
    }, 0);
  }
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">All Tickets</h1>
        <p className="text-muted-foreground">
          Manage and track all support tickets
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
        <Button
          onClick={onCreateTicket}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </Button>
      </div>
    </div>
  );
}

// Component: Stats Card
function StatsCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// Component: Stats Grid
function StatsGrid({ stats }: { stats: TicketStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {STATS_CONFIG.map((config) => (
        <StatsCard
          key={config.key}
          value={stats[config.key as keyof TicketStats]}
          label={config.label}
          color={config.color}
        />
      ))}
    </div>
  );
}

// Component: Empty State
function EmptyState({ onCreateTicket }: { onCreateTicket: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">
        No tickets found matching your criteria.
      </p>
      <Button onClick={onCreateTicket}>Create your first ticket</Button>
    </div>
  );
}

// Component: Tickets Grid
function TicketsGrid({
  tickets,
  onTicketClick,
}: {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onClick={() => onTicketClick(ticket)}
        />
      ))}
    </div>
  );
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="text-center py-12">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-semibold text-destructive mb-2">
          Error Loading Tickets
        </h3>
        <p className="text-sm text-destructive/80">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}

// Custom hook for ticket management
function useTicketManagement() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const handleCreateTicket = () => {
    navigate("/newtickets");
  };

  const handleTicketClick = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleEditTicket = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (confirm(`Are you sure you want to delete ticket "${ticket.title}"?`)) {
      console.log("Delete ticket:", ticket.id);
      // TODO: Implement actual delete functionality
      // This would typically involve calling a delete action or service
    }
  };

  return {
    viewMode,
    setViewMode,
    handleCreateTicket,
    handleTicketClick,
    handleEditTicket,
    handleDeleteTicket,
  };
}

// Main component
export default function TicketsPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();

  if (!loaderData) {
    return <DashboardSkeleton />;
  }

  const { tickets, stats, error } = loaderData as TicketsLoaderData;

  const {
    viewMode,
    setViewMode,
    handleCreateTicket,
    handleTicketClick,
    handleEditTicket,
    handleDeleteTicket,
  } = useTicketManagement();

  // Show loading state during navigation
  const isLoading = navigation.state === "loading";

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-full mx-auto p-6">
          <PageHeader
            onCreateTicket={handleCreateTicket}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          <ErrorDisplay error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Loading Indicator
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <NavigationSkeleton />
        </div>
      )} */}

      <div className="max-w-full mx-auto p-6">
        <PageHeader
          onCreateTicket={handleCreateTicket}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <StatsGrid stats={stats} />

        {/* Tickets Display */}
        {isLoading ? (
          <TicketListSkeleton />
        ) : tickets.length === 0 ? (
          <EmptyState onCreateTicket={handleCreateTicket} />
        ) : viewMode === "grid" ? (
          <TicketsGrid tickets={tickets} onTicketClick={handleTicketClick} />
        ) : (
          <TicketTable
            tickets={tickets}
            onTicketClick={handleTicketClick}
            onEdit={handleEditTicket}
            onDelete={handleDeleteTicket}
          />
        )}
      </div>
    </div>
  );
}
